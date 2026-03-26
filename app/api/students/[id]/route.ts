import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { FeeStatus, Gender, StudentStatus } from '@prisma/client'
import { Prisma } from '@prisma/client'
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

const normalizeEnum = <T extends string>(
  value: string,
  allowed: readonly T[],
  label: string
): T => {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '_')
  const match = allowed.find((item) => item === normalized)
  if (!match) throw new Error(`Invalid ${label}: ${value}`)
  return match
}

const GENDER_VALUES = [Gender.MALE, Gender.FEMALE, Gender.OTHER] as const
const STATUS_VALUES = [StudentStatus.ACTIVE, StudentStatus.INACTIVE, StudentStatus.PASSED_OUT] as const
const FEE_VALUES = [FeeStatus.PAID, FeeStatus.PENDING, FeeStatus.OVERDUE] as const

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

    const { facultyIds: _facultyIds, gender, status, feeStatus, ...rest } = body

    let normalizedGender: Gender | undefined
    let normalizedStatus: StudentStatus | undefined
    let normalizedFeeStatus: FeeStatus | undefined
    try {
      if (gender) normalizedGender = normalizeEnum(gender, GENDER_VALUES, 'gender')
      if (status) normalizedStatus = normalizeEnum(status, STATUS_VALUES, 'status')
      if (feeStatus) normalizedFeeStatus = normalizeEnum(feeStatus, FEE_VALUES, 'feeStatus')
    } catch (error) {
      return err(error instanceof Error ? error.message : 'Invalid enum value', 400)
    }
    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...rest,
        ...(normalizedGender ? { gender: normalizedGender } : {}),
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
        ...(normalizedFeeStatus ? { feeStatus: normalizedFeeStatus } : {}),
        ...(facultyIds
          ? {
              facultyInCharge: {
                deleteMany: {},
                create: facultyIds.map((memberId) => ({ memberId })),
              },
            }
          : {}),
      } as Prisma.StudentUncheckedUpdateInput,
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
