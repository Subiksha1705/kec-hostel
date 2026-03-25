import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requireSuper } from '@/lib/auth/superGuard'
import { hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createAdminSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  collegeId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    const guard = requireSuper(session)
    if (guard) return guard

    const body = createAdminSchema.parse(await req.json())

    const college = await prisma.college.findUnique({ where: { id: body.collegeId } })
    if (!college) return err('College not found', 404)

    const existing = await prisma.admin.findUnique({ where: { email: body.email } })
    if (existing) return err('Email already in use', 409)

    const hashed = await hashPassword(body.password)

    const admin = await prisma.admin.create({
      data: { name: body.name, email: body.email, password: hashed, collegeId: body.collegeId },
    })

    const { password: _password, ...safe } = admin
    return ok(safe, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
