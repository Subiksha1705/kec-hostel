import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/rbac'
import { scopeFilter } from '@/lib/scope'
import { hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  rollNumber: z.string().min(1),
  classId: z.string().uuid().optional(),
  hostelId: z.string().uuid().optional(),
})

// GET /api/students
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)

    let where: object

    if (session.type === 'ADMIN') {
      where = { collegeId: session.collegeId }
    } else if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'students', 'canView')
      where = scopeFilter({
        collegeId: session.collegeId,
        classId: session.classId ?? null,
        hostelId: session.hostelId ?? null,
      })
    } else {
      return err('Forbidden', 403)
    }

    const students = await prisma.student.findMany({
      where,
      include: { class: true, hostel: true },
      orderBy: { name: 'asc' },
    })

    return ok(students.map(({ password: _password, ...s }) => s))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    return err(msg, 500)
  }
}

// POST /api/students — Admin only
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const body = createSchema.parse(await req.json())

    const existing = await prisma.student.findUnique({ where: { email: body.email } })
    if (existing) return err('Email already in use', 409)

    const hashed = await hashPassword(body.password)

    const student = await prisma.student.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashed,
        rollNumber: body.rollNumber,
        collegeId: session.collegeId,
        classId: body.classId ?? null,
        hostelId: body.hostelId ?? null,
      },
    })

    const { password: _password, ...safe } = student
    return ok(safe, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
