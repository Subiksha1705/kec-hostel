import { NextRequest, NextResponse } from 'next/server'
import * as jose from 'jose'

const PROTECTED: Record<string, string> = {
  '/admin': 'ADMIN',
  '/member': 'MEMBER',
  '/student': 'STUDENT',
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const requiredType = Object.entries(PROTECTED).find(([prefix]) =>
    pathname.startsWith(prefix)
  )?.[1]

  if (!requiredType) return NextResponse.next()

  const authHeader = req.headers.get('authorization') ?? ''
  const cookieToken = req.cookies.get('accessToken')?.value
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = headerToken ?? cookieToken

  if (!token) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jose.jwtVerify(token, secret)

    const type = (payload as any).type
    const allowed =
      type === requiredType || (requiredType === 'ADMIN' && type === 'SUPER')
    if (!allowed) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url))
  }
}

export const config = {
  matcher: ['/admin/:path*', '/member/:path*', '/student/:path*'],
}
