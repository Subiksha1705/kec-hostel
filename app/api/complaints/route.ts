import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/rbac'
import { scopeFilter } from '@/lib/scope'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
})

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)

    let where: object

    if (session.type === 'ADMIN' || session.type === 'SUPER') {
      where = {
        student: { collegeId: session.collegeId },
        status: { not: 'CANCELLED' },
      }
    } else if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'complaints', 'canView')
      const filter = scopeFilter({
        collegeId: session.collegeId,
        classId: session.classId ?? null,
        hostelId: session.hostelId ?? null,
      })
      where = { student: filter, status: { not: 'CANCELLED' } }
    } else if (session.type === 'STUDENT') {
      where = { studentId: session.sub }
    } else {
      return err('Forbidden', 403)
    }

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return ok(complaints)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    return err(msg, 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'STUDENT') return err('Only students can submit complaints', 403)

    const body = createSchema.parse(await req.json())

    const student = await prisma.student.findUnique({ where: { id: session.sub } })
    if (!student) return err('Student not found', 404)

    const complaint = await prisma.complaint.create({
      data: {
        studentId: session.sub,
        title: body.title,
        description: body.description,
        status: 'PENDING',
      },
    })

    return ok(complaint, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
