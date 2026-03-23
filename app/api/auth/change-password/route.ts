import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { verifyPassword, hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    const { currentPassword, newPassword } = schema.parse(await req.json())

    let storedHash: string

    if (session.type === 'ADMIN') {
      const admin = await prisma.admin.findUnique({ where: { id: session.sub } })
      if (!admin) return err('User not found', 404)
      storedHash = admin.password
    } else if (session.type === 'MEMBER') {
      const member = await prisma.adminMember.findUnique({ where: { id: session.sub } })
      if (!member) return err('User not found', 404)
      storedHash = member.password
    } else {
      const student = await prisma.student.findUnique({ where: { id: session.sub } })
      if (!student) return err('User not found', 404)
      storedHash = student.password
    }

    const valid = await verifyPassword(currentPassword, storedHash)
    if (!valid) return err('Current password is incorrect', 401)

    const hashed = await hashPassword(newPassword)

    if (session.type === 'ADMIN') {
      await prisma.admin.update({ where: { id: session.sub }, data: { password: hashed } })
    } else if (session.type === 'MEMBER') {
      await prisma.adminMember.update({ where: { id: session.sub }, data: { password: hashed } })
    } else {
      await prisma.student.update({ where: { id: session.sub }, data: { password: hashed } })
    }

    return ok({ message: 'Password updated' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
