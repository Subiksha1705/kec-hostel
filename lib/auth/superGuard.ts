import { JwtPayload } from './jwt'
import { err } from '@/lib/api/response'

export function requireSuper(session: JwtPayload) {
  if (session.type !== 'SUPER') return err('Forbidden — superadmin only', 403)
  return null
}
