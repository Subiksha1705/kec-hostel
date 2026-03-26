import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

// DELETE /api/leaves/[id]/cancel — Student cancels a pending leave
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    if (session.type !== 'STUDENT') return err('Forbidden', 403)

    const leave = await prisma.leave.findUnique({ where: { id } })
    if (!leave || leave.studentId !== session.sub) return err('Not found', 404)
    if (leave.status !== 'PENDING') return err('Only pending leaves can be cancelled', 400)

    await prisma.leave.update({ where: { id }, data: { status: 'CANCELLED' } })
    return ok({ cancelled: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
