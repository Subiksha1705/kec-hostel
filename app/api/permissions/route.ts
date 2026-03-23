import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'MEMBER') return err('Forbidden', 403)

    const member = await prisma.adminMember.findUnique({
      where: { id: session.sub },
      select: { roleId: true, collegeId: true },
    })
    if (!member || member.collegeId !== session.collegeId) return err('Forbidden', 403)

    const permissions = await prisma.rolePermission.findMany({
      where: { roleId: member.roleId },
      orderBy: { module: 'asc' },
    })

    return ok(permissions)
  } catch {
    return err('Unauthorized', 401)
  }
}
