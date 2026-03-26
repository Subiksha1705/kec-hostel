import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'
import { requirePermission } from '@/lib/rbac'
import { assertScope } from '@/lib/scope'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  rollNumber: z.string().min(1).optional(),
  phoneNumber: z.string().min(1).optional(),
  department: z.string().min(1).optional(),
  year: z.string().min(1).optional(),
  roomNumber: z.string().min(1).optional().nullable(),
  bedNumber: z.string().min(1).optional().nullable(),
  gender: z.string().min(1).optional(),
  parentName: z.string().min(1).optional(),
  parentContact: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  profileImage: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  dateOfBirth: z.coerce.date().optional(),
  emergencyContactName: z.string().min(1).optional(),
  emergencyContactNumber: z.string().min(1).optional(),
  bloodGroup: z.string().min(1).optional(),
  checkInDate: z.coerce.date().optional(),
  checkOutDate: z.coerce.date().optional(),
  feeStatus: z.string().min(1).optional(),
  passOutYear: z.coerce.number().int().optional(),
  inYear: z.coerce.number().int().optional(),
  idCardPdf: z.string().min(1).optional(),
  classId: z.string().uuid().nullable().optional(),
  hostelId: z.string().uuid().nullable().optional(),
  facultyIds: z.array(z.string().uuid()).optional(),
})

// PUT /api/students/:id — Admin only
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    if (session.type === 'STUDENT') return err('Forbidden', 403)

    const student = await prisma.student.findUnique({ where: { id } })
    if (!student || student.collegeId !== session.collegeId) return err('Not found', 404)

    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'students', 'canEdit')
      assertScope(
        { classId: session.classId ?? null, hostelId: session.hostelId ?? null },
        { classId: student.classId, hostelId: student.hostelId }
      )
    }

    const raw = await req.json()
    const body = updateSchema.parse({
      ...raw,
      roomNumber: raw.roomNumber ?? null,
      bedNumber: raw.bedNumber ?? null,
      classId: raw.classId || null,
      hostelId: raw.hostelId || null,
    })

    const facultyIds = body.facultyIds ? [...new Set(body.facultyIds)] : null
    if (facultyIds && facultyIds.length) {
      const count = await prisma.adminMember.count({
        where: { id: { in: facultyIds }, collegeId: session.collegeId },
      })
      if (count !== facultyIds.length) return err('Invalid faculty selection', 400)
    }

    const { facultyIds: _facultyIds, ...rest } = body
    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...rest,
        ...(facultyIds
          ? {
              facultyInCharge: {
                deleteMany: {},
                create: facultyIds.map((memberId) => ({ memberId })),
              },
            }
          : {}),
      },
    })

    const { password: _password, ...safe } = updated
    return ok(safe)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    if (msg === 'SCOPE_DENIED') return err('Forbidden', 403)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}

// DELETE /api/students/:id — Admin or scoped member with permission
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    if (session.type === 'STUDENT') return err('Forbidden', 403)

    const student = await prisma.student.findUnique({ where: { id } })
    if (!student || student.collegeId !== session.collegeId) return err('Not found', 404)

    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'students', 'canDelete')
      assertScope(
        { classId: session.classId ?? null, hostelId: session.hostelId ?? null },
        { classId: student.classId, hostelId: student.hostelId }
      )
    }

    await prisma.student.delete({ where: { id } })
    return ok({ id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    if (msg === 'SCOPE_DENIED') return err('Forbidden', 403)
    return err(msg, 500)
  }
}
