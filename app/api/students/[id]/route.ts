import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac'
import { assertScope } from '@/lib/scope'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  rollNumber: z.string().min(1).optional(),
  classId: z.string().uuid().nullable().optional(),
  hostelId: z.string().uuid().nullable().optional(),
})

// PUT /api/students/:id — Admin only
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    if (session.type === 'STUDENT') return err('Forbidden', 403)

    const student = await prisma.student.findUnique({ where: { id } })
    if (!student || student.collegeId !== session.collegeId) return err('Not found', 404)

    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'students', 'canEdit')
      assertScope(
        { classId: session.classId ?? null, hostelId: session.hostelId ?? null },
        { classId: student.classId, hostelId: student.hostelId }
      )
    }

    const raw = await req.json()
    const body = updateSchema.parse({
      ...raw,
      classId: raw.classId || null,
      hostelId: raw.hostelId || null,
    })
    const updated = await prisma.student.update({ where: { id }, data: body })

    const { password: _password, ...safe } = updated
    return ok(safe)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    if (msg === 'SCOPE_DENIED') return err('Forbidden', 403)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}

// DELETE /api/students/:id — Admin or scoped member with permission
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    if (session.type === 'STUDENT') return err('Forbidden', 403)

    const student = await prisma.student.findUnique({ where: { id } })
    if (!student || student.collegeId !== session.collegeId) return err('Not found', 404)

    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'students', 'canDelete')
      assertScope(
        { classId: session.classId ?? null, hostelId: session.hostelId ?? null },
        { classId: student.classId, hostelId: student.hostelId }
      )
    }

    await prisma.student.delete({ where: { id } })
    return ok({ id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    if (msg === 'SCOPE_DENIED') return err('Forbidden', 403)
    return err(msg, 500)
  }
}
