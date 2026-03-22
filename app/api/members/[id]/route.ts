import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  roleId: z.string().uuid().optional(),
  classId: z.string().uuid().nullable().optional(),
  hostelId: z.string().uuid().nullable().optional(),
})

// PUT /api/members/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const member = await prisma.adminMember.findUnique({ where: { id } })
    if (!member || member.collegeId !== session.collegeId) return err('Not found', 404)

    const body = updateSchema.parse(await req.json())

    const updated = await prisma.adminMember.update({
      where: { id },
      data: body,
    })

    const { password: _password, ...safe } = updated
    return ok(safe)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}

// DELETE /api/members/:id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const member = await prisma.adminMember.findUnique({ where: { id } })
    if (!member || member.collegeId !== session.collegeId) return err('Not found', 404)

    await prisma.adminMember.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
