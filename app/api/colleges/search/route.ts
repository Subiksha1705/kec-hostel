import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') ?? ''
    if (q.length < 3) return ok([])

    const colleges = await prisma.college.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, location: true, domain: true },
      take: 10,
      orderBy: { name: 'asc' },
    })

    return ok(colleges)
  } catch {
    return err('Server error', 500)
  }
}
