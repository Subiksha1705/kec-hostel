import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export type TokenUserType = 'ADMIN' | 'MEMBER' | 'STUDENT'

export interface JwtPayload {
  sub: string
  type: TokenUserType
  collegeId: string
  roleId?: string
  classId?: string
  hostelId?: string
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '15m' })
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload
}
