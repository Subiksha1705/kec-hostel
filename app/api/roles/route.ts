import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
})

// GET /api/roles — list all roles for the admin's college
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN' && session.type !== 'SUPER') return err('Forbidden', 403)

    const roles = await prisma.role.findMany({
      where: { collegeId: session.collegeId },
      include: { permissions: true, _count: { select: { members: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return ok(roles)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

// POST /api/roles — create a new role
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN' && session.type !== 'SUPER') return err('Forbidden', 403)

    const body = createSchema.parse(await req.json())

    const role = await prisma.role.create({
      data: { name: body.name, collegeId: session.collegeId },
    })

    return ok(role, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
