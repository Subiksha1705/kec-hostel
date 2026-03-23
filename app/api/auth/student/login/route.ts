import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  collegeId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    const student = await prisma.student.findUnique({ where: { email: body.email } })
    if (!student) return err('Invalid credentials', 401)
    if (student.collegeId !== body.collegeId) return err('Invalid credentials', 401)

    const valid = await verifyPassword(body.password, student.password)
    if (!valid) return err('Invalid credentials', 401)

    const payload = { sub: student.id, type: 'STUDENT' as const, collegeId: student.collegeId }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    return ok({ accessToken, refreshToken })
  } catch (e) {
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err('Server error', 500)
  }
}
