import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

// GET /api/roles/public?collegeId=... — public list for login UI
export async function GET(req: NextRequest) {
  try {
    const collegeId = req.nextUrl.searchParams.get('collegeId')
    if (!collegeId) return err('collegeId is required', 400)

    const parsed = z.string().uuid().safeParse(collegeId)
    if (!parsed.success) return err('Invalid collegeId', 400)

    const roles = await prisma.role.findMany({
      where: { collegeId },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    })

    return ok(roles)
  } catch {
    return err('Server error', 500)
  }
}
