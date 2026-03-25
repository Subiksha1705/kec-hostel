import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  description: z.string().optional(),
  rules: z.string().optional(),
  chatbotContext: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)

    const select = {
      id: true,
      name: true,
      location: true,
      capacity: true,
      description: true,
      rules: true,
      ...(session.type === 'ADMIN' || session.type === 'SUPER' ? { chatbotContext: true } : {}),
    } satisfies Prisma.HostelSelect

    const hostel = await prisma.hostel.findFirst({
      where: { collegeId: session.collegeId },
      select,
    })

    if (!hostel) return err('No hostel found for this college', 404)

    return ok(hostel)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN' && session.type !== 'SUPER') return err('Forbidden', 403)

    const body = updateSchema.parse(await req.json())

    const hostel = await prisma.hostel.findFirst({ where: { collegeId: session.collegeId } })
    if (!hostel) return err('No hostel found for this college', 404)

    const updated = await prisma.hostel.update({
      where: { id: hostel.id },
      data: body,
    })

    return ok(updated)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
