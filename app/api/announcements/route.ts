import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/rbac'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  imageUrl: z.string().url().optional().nullable(),
  imagePublicId: z.string().optional().nullable(),
  imageWidth: z.number().int().positive().optional().nullable(),
  imageHeight: z.number().int().positive().optional().nullable(),
  linkUrl: z.string().url().optional().nullable(),
  linkLabel: z.string().min(1).optional().nullable(),
  isPinned: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
})

// GET /api/announcements
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'announcements', 'canView')
    } else if (session.type !== 'ADMIN' && session.type !== 'SUPER' && session.type !== 'STUDENT') {
      return err('Forbidden', 403)
    }

    const where =
      session.type === 'STUDENT'
        ? { isActive: true }
        : {}

    const announcements = await prisma.announcement.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    })
    return ok(announcements)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    return err(msg, 500)
  }
}

// POST /api/announcements
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'announcements', 'canCreate')
    } else if (session.type !== 'ADMIN' && session.type !== 'SUPER') {
      return err('Forbidden', 403)
    }

    const raw = await req.json()
    const body = createSchema.parse({
      ...raw,
      imageUrl: raw.imageUrl || null,
      imagePublicId: raw.imagePublicId || null,
      imageWidth: raw.imageWidth ?? null,
      imageHeight: raw.imageHeight ?? null,
      linkUrl: raw.linkUrl || null,
      linkLabel: raw.linkLabel || null,
    })

    let postedBy = 'Unknown'
    let role = 'Admin'

    if (session.type === 'MEMBER') {
      const member = await prisma.adminMember.findUnique({
        where: { id: session.sub },
        include: { role: true },
      })
      if (!member) return err('Unauthorized', 401)
      postedBy = `${member.name} (${member.email})`
      role = member.role?.name ?? 'Member'
    } else {
      const admin = await prisma.admin.findUnique({ where: { id: session.sub } })
      if (!admin) return err('Unauthorized', 401)
      postedBy = `${admin.name} (${admin.email})`
      role = session.type === 'SUPER' ? 'Super Admin' : 'Admin'
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl,
        imagePublicId: body.imagePublicId,
        imageWidth: body.imageWidth ?? null,
        imageHeight: body.imageHeight ?? null,
        linkUrl: body.linkUrl,
        linkLabel: body.linkLabel,
        postedBy,
        role,
        isPinned: body.isPinned ?? false,
        isActive: body.isActive ?? true,
      },
    })

    return ok(announcement, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
