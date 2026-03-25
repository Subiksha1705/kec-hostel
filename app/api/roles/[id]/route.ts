import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

// GET /api/roles/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    if (session.type !== 'ADMIN' && session.type !== 'SUPER') return err('Forbidden', 403)

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: { select: { members: true } },
      },
    })

    if (!role || role.collegeId !== session.collegeId) return err('Not found', 404)
    return ok(role)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

// DELETE /api/roles/:id — delete a role only if no members are assigned to it
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    if (session.type !== 'ADMIN' && session.type !== 'SUPER') return err('Forbidden', 403)

    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    })

    if (!role) return err('Role not found', 404)
    if (role.collegeId !== session.collegeId) return err('Forbidden', 403)
    if (role._count.members > 0) return err('Cannot delete role with assigned members', 409)

    await prisma.role.delete({ where: { id } })

    return ok({ deleted: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
