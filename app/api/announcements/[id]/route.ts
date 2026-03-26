import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { requirePermission } from '@/lib/rbac'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  imageUrl: z.string().url().optional().nullable(),
  imagePublicId: z.string().optional().nullable(),
  imageWidth: z.number().int().positive().optional().nullable(),
  imageHeight: z.number().int().positive().optional().nullable(),
  linkUrl: z.string().url().optional().nullable(),
  linkLabel: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  isPinned: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest
) {
  try {
    const id = req.nextUrl.pathname.split('/').pop() ?? ''
    if (!id) return err('Not found', 404)
    const session = getSession(req)
    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'announcements', 'canEdit')
    } else if (session.type !== 'ADMIN' && session.type !== 'SUPER') {
      return err('Forbidden', 403)
    }

    const raw = await req.json()
    const body = updateSchema.parse(raw)

    const announcement = await prisma.announcement.update({
      where: { id },
      data: body,
    })

    return ok(announcement)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}

export async function DELETE(
  req: NextRequest
) {
  try {
    const id = req.nextUrl.pathname.split('/').pop() ?? ''
    if (!id) return err('Not found', 404)
    const session = getSession(req)
    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'announcements', 'canDelete')
    } else if (session.type !== 'ADMIN' && session.type !== 'SUPER') {
      return err('Forbidden', 403)
    }

    await prisma.announcement.delete({ where: { id } })
    return ok({ deleted: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    return err(msg, 500)
  }
}
