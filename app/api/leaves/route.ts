import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/rbac'
import { scopeFilter } from '@/lib/scope'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  reason: z.string().min(1),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
})

// GET /api/leaves
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)

    let where: object

    if (session.type === 'ADMIN') {
      where = { collegeId: session.collegeId }
    } else if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'leaves', 'canView')
      const studentFilter = scopeFilter({
        collegeId: session.collegeId,
        classId: session.classId ?? null,
        hostelId: session.hostelId ?? null,
      })
      where = { student: studentFilter }
    } else if (session.type === 'STUDENT') {
      where = { studentId: session.sub }
    } else {
      return err('Forbidden', 403)
    }

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
        assignedTo: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return ok(leaves)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    return err(msg, 500)
  }
}

// POST /api/leaves — Student submits a leave request
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'STUDENT') return err('Only students can submit leaves', 403)

    const body = createSchema.parse(await req.json())

    const student = await prisma.student.findUnique({ where: { id: session.sub } })
    if (!student) return err('Student not found', 404)

    const leave = await prisma.leave.create({
      data: {
        studentId: session.sub,
        reason: body.reason,
        fromDate: new Date(body.fromDate),
        toDate: new Date(body.toDate),
        status: 'PENDING',
        collegeId: student.collegeId,
      },
    })

    return ok(leave, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
