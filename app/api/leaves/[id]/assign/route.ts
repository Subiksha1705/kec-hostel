import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/rbac'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({ memberId: z.string().uuid() })

// PUT /api/leaves/:id/assign — Admin or Member with leaves.canCreate assigns the leave
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)

    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'leaves', 'canCreate')
    } else if (session.type !== 'ADMIN') {
      return err('Forbidden', 403)
    }

    const { memberId } = schema.parse(await req.json())

    const leave = await prisma.leave.findUnique({ where: { id } })
    if (!leave || leave.collegeId !== session.collegeId) return err('Not found', 404)
    if (leave.status !== 'PENDING') return err('Leave is not in PENDING status', 409)

    const member = await prisma.adminMember.findUnique({ where: { id: memberId } })
    if (!member || member.collegeId !== session.collegeId) return err('Invalid member', 400)

    const updated = await prisma.leave.update({
      where: { id },
      data: { assignedToId: memberId },
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
