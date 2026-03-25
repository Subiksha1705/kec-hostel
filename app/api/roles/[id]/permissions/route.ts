import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const MODULES = ['students', 'leaves', 'complaints'] as const

const permissionSchema = z.array(
  z.object({
    module: z.enum(MODULES),
    canView: z.boolean(),
    canCreate: z.boolean(),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
    canApprove: z.boolean(),
  })
)

// GET /api/roles/:id/permissions
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    if (session.type !== 'ADMIN' && session.type !== 'SUPER') return err('Forbidden', 403)

    const role = await prisma.role.findUnique({ where: { id } })
    if (!role || role.collegeId !== session.collegeId) return err('Not found', 404)

    const permissions = await prisma.rolePermission.findMany({ where: { roleId: id } })
    return ok(permissions)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

// PUT /api/roles/:id/permissions — replaces all permissions for the role
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    if (session.type !== 'ADMIN' && session.type !== 'SUPER') return err('Forbidden', 403)

    const role = await prisma.role.findUnique({ where: { id } })
    if (!role || role.collegeId !== session.collegeId) return err('Not found', 404)

    const body = permissionSchema.parse(await req.json())

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.rolePermission.createMany({
        data: body.map((p) => ({ roleId: id, ...p })),
      }),
    ])

    const updated = await prisma.rolePermission.findMany({ where: { roleId: id } })
    return ok(updated)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
