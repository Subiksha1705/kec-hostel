import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    const hostels = await prisma.hostel.findMany({
      where: { collegeId: session.collegeId },
      orderBy: { name: 'asc' },
    })
    return ok(hostels)
  } catch {
    return err('Unauthorized', 401)
  }
}
