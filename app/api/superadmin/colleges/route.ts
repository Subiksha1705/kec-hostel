import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requireSuper } from '@/lib/auth/superGuard'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createCollegeSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  domain: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    const guard = requireSuper(session)
    if (guard) return guard

    const colleges = await prisma.college.findMany({
      include: { admins: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return ok(colleges)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    const guard = requireSuper(session)
    if (guard) return guard

    const body = createCollegeSchema.parse(await req.json())

    const college = await prisma.college.create({
      data: { name: body.name, location: body.location, domain: body.domain },
    })

    return ok(college, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
