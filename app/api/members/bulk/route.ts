import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const rowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN' && session.type !== 'SUPER') return err('Forbidden', 403)

    const body = (await req.json()) as { rows: unknown[] }
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return err('No rows provided', 400)
    }
    if (body.rows.length > 200) {
      return err('Maximum 200 rows per upload', 400)
    }

    const collegeRoles = await prisma.role.findMany({
      where: { collegeId: session.collegeId },
      select: { id: true, name: true },
    })
    const roleMap = new Map(collegeRoles.map((r) => [r.name.toLowerCase(), r.id]))

    const results: {
      row: number
      email: string
      status: 'created' | 'skipped'
      reason?: string
    }[] = []

    for (let i = 0; i < body.rows.length; i++) {
      const parsed = rowSchema.safeParse(body.rows[i])
      if (!parsed.success) {
        results.push({
          row: i + 1,
          email: String((body.rows[i] as any)?.email ?? ''),
          status: 'skipped',
          reason: parsed.error.errors[0]?.message ?? 'Invalid row',
        })
        continue
      }

      const { name, email, password, role } = parsed.data

      const roleId = roleMap.get(role.toLowerCase())
      if (!roleId) {
        results.push({
          row: i + 1,
          email,
          status: 'skipped',
          reason: `Role "${role}" not found in this college`,
        })
        continue
      }

      const existing = await prisma.adminMember.findUnique({ where: { email } })
      if (existing) {
        results.push({ row: i + 1, email, status: 'skipped', reason: 'Email already in use' })
        continue
      }

      const hashed = await hashPassword(password)
      await prisma.adminMember.create({
        data: { name, email, password: hashed, roleId, collegeId: session.collegeId },
      })

      results.push({ row: i + 1, email, status: 'created' })
    }

    const created = results.filter((r) => r.status === 'created').length
    const skipped = results.filter((r) => r.status === 'skipped').length

    return ok({ created, skipped, results })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
