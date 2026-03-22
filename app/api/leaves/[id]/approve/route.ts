import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

// PUT /api/leaves/:id/approve — only the assigned member (or admin) can approve
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req)

    const leave = await prisma.leave.findUnique({ where: { id: params.id } })
    if (!leave || leave.collegeId !== session.collegeId) return err('Not found', 404)
    if (leave.status !== 'PENDING') return err('Leave is not in PENDING status', 409)

    if (session.type === 'MEMBER' && leave.assignedToId !== session.sub) {
      return err('You are not assigned to this leave', 403)
    }

    if (session.type === 'STUDENT') return err('Forbidden', 403)

    const updated = await prisma.leave.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        reviewedById: session.sub,
        reviewedAt: new Date(),
      },
    })

    return ok(updated)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
