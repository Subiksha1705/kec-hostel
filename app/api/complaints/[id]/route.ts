import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/rbac'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['PENDING', 'RESOLVED']),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)

    if (session.type === 'STUDENT') return err('Forbidden', 403)

    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'complaints', 'canEdit')
    }

    const body = updateSchema.parse(await req.json())

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: { student: { select: { collegeId: true } } },
    })

    if (!complaint || complaint.student.collegeId !== session.collegeId) {
      return err('Not found', 404)
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: { status: body.status },
    })

    return ok(updated)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
