import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().uuid(),
  classId: z.string().uuid().optional(),
  hostelId: z.string().uuid().optional(),
})

// GET /api/members
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const members = await prisma.adminMember.findMany({
      where: { collegeId: session.collegeId },
      include: { role: true, class: true, hostel: true },
      orderBy: { createdAt: 'asc' },
    })

    return ok(members.map(({ password: _password, ...m }) => m))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

// POST /api/members
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const body = createSchema.parse(await req.json())

    const role = await prisma.role.findUnique({ where: { id: body.roleId } })
    if (!role || role.collegeId !== session.collegeId) return err('Invalid role', 400)

    const existing = await prisma.adminMember.findUnique({ where: { email: body.email } })
    if (existing) return err('Email already in use', 409)

    const hashed = await hashPassword(body.password)

    const member = await prisma.adminMember.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashed,
        roleId: body.roleId,
        collegeId: session.collegeId,
        classId: body.classId ?? null,
        hostelId: body.hostelId ?? null,
      },
    })

    const { password: _password, ...safe } = member
    return ok(safe, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
