import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { loadPermissions, checkPermission } from '@/lib/rbac'

// GET /api/faculty-options — Admins or members with student create/edit permission
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)

    if (session.type === 'MEMBER') {
      const perms = await loadPermissions(session.roleId!)
      const allowed =
        checkPermission(perms, 'students', 'canCreate') ||
        checkPermission(perms, 'students', 'canEdit')
      if (!allowed) return err('Forbidden', 403)
    } else if (session.type !== 'ADMIN' && session.type !== 'SUPER') {
      return err('Forbidden', 403)
    }

    const members = await prisma.adminMember.findMany({
      where: { collegeId: session.collegeId },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    })

    return ok(members)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
