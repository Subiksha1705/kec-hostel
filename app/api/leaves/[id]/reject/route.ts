import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({ reason: z.string().optional() })

// PUT /api/leaves/:id/reject — only the assigned member (or admin) can reject
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    const body = schema.parse(await req.json())

    const leave = await prisma.leave.findUnique({ where: { id } })
    if (!leave || leave.collegeId !== session.collegeId) return err('Not found', 404)
    if (leave.status !== 'PENDING') return err('Leave is not in PENDING status', 409)

    if (session.type === 'MEMBER' && leave.assignedToId !== session.sub) {
      return err('You are not assigned to this leave', 403)
    }

    if (session.type === 'STUDENT') return err('Forbidden', 403)

    const updated = await prisma.leave.update({
      where: { id },
      data: {
        status: 'REJECTED',
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
