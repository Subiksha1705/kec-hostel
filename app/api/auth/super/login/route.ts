import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  collegeId: z.string().uuid().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    const rawList = process.env.SUPER_ADMIN_EMAILS
    const single = process.env.SUPER_ADMIN_EMAIL
    const superEmails = (rawList ? rawList.split(/[,\s]+/) : [])
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
    if (single) superEmails.push(single.toLowerCase())

    if (superEmails.length === 0) return err('Super admin is not configured', 500)
    if (!superEmails.includes(body.email.toLowerCase())) {
      return err('Invalid credentials', 401)
    }

    const admin = await prisma.admin.findUnique({ where: { email: body.email } })
    if (!admin) return err('Invalid credentials', 401)

    const valid = await verifyPassword(body.password, admin.password)
    if (!valid) return err('Invalid credentials', 401)

    const payload = {
      sub: admin.id,
      type: 'SUPER' as const,
      collegeId: body.collegeId ?? admin.collegeId,
    }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    const res = ok({ accessToken, refreshToken })
    res.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15,
    })
    res.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })
    return res
  } catch (e) {
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err('Server error', 500)
  }
}
