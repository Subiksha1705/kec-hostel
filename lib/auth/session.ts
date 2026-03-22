import { NextRequest } from 'next/server'
import { verifyAccessToken, JwtPayload } from './jwt'

export function getSession(req: NextRequest): JwtPayload {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) throw new Error('UNAUTHORIZED')

  try {
    return verifyAccessToken(token)
  } catch {
    throw new Error('UNAUTHORIZED')
  }
}
