import { NextRequest } from 'next/server'
import { verifyAccessToken, JwtPayload } from './jwt'

export function getSession(req: NextRequest): JwtPayload {
  const header = req.headers.get('authorization') ?? ''
  const headerToken = header.startsWith('Bearer ') ? header.slice(7) : null
  const cookieToken = req.cookies.get('accessToken')?.value ?? null
  const token = headerToken ?? cookieToken

  if (!token) throw new Error('UNAUTHORIZED')

  try {
    return verifyAccessToken(token)
  } catch {
    throw new Error('UNAUTHORIZED')
  }
}
