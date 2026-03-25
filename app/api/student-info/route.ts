import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'STUDENT') return err('Forbidden', 403)

    const student = await prisma.student.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        name: true,
        email: true,
        rollNumber: true,
        class: { select: { id: true, name: true } },
        hostel: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true,
            description: true,
            rules: true,
          },
        },
      },
    })

    if (!student) return err('Student not found', 404)

    return ok(student)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
