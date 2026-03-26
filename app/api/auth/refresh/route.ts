import { NextRequest } from 'next/server'
import { signAccessToken, verifyRefreshToken } from '@/lib/auth/jwt'
import { ok, err } from '@/lib/api/response'

export async function POST(req: NextRequest) {
  try {
    const header = req.headers.get('authorization') ?? ''
    const headerToken = header.startsWith('Bearer ') ? header.slice(7) : null
    const cookieToken = req.cookies.get('refreshToken')?.value ?? null
    const token = headerToken ?? cookieToken

    if (!token) return err('Unauthorized', 401)

    const payload = verifyRefreshToken(token)
    const accessToken = signAccessToken(payload)

    const res = ok({ accessToken })
    res.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 15,
    })
    return res
  } catch {
    return err('Unauthorized', 401)
  }
}
