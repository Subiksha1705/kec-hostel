import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN' && session.type !== 'SUPER') return err('Forbidden', 403)

    const [studentCount, memberCount, roleCount, recentLeaves] = await prisma.$transaction([
      prisma.student.count({ where: { collegeId: session.collegeId } }),
      prisma.adminMember.count({ where: { collegeId: session.collegeId } }),
      prisma.role.count({ where: { collegeId: session.collegeId } }),
      prisma.leave.findMany({
        where: { collegeId: session.collegeId, status: { not: 'CANCELLED' } },
        include: {
          student: { select: { id: true, name: true, rollNumber: true } },
          assignedTo: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    const pendingCount = recentLeaves.filter((l) => l.status === 'PENDING').length

    return ok({
      stats: {
        students: studentCount,
        members: memberCount,
        roles: roleCount,
        pending: pendingCount,
      },
      recentLeaves,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
