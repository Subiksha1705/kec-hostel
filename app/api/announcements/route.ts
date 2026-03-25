import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().url().optional().nullable(),
  linkUrl: z.string().url().optional().nullable(),
  linkLabel: z.string().min(1).optional().nullable(),
  postedBy: z.string().min(1),
  role: z.string().min(1),
})

// GET /api/announcements
export async function GET(req: NextRequest) {
  try {
    getSession(req)
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    })
    return ok(announcements)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

// POST /api/announcements
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN' && session.type !== 'MEMBER' && session.type !== 'SUPER') {
      return err('Forbidden', 403)
    }

    const raw = await req.json()
    const body = createSchema.parse({
      ...raw,
      imageUrl: raw.imageUrl || null,
      linkUrl: raw.linkUrl || null,
      linkLabel: raw.linkLabel || null,
    })

    const announcement = await prisma.announcement.create({
      data: {
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl,
        linkUrl: body.linkUrl,
        linkLabel: body.linkLabel,
        postedBy: body.postedBy,
        role: body.role,
      },
    })

    return ok(announcement, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
