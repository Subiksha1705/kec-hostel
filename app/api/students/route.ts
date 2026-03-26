import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/rbac'
import { scopeFilter } from '@/lib/scope'
import { hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { NAME_REGEX, normalizePhone, validatePhone } from '@/lib/validation/phone'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).regex(NAME_REGEX, 'Name should contain letters only'),
  email: z.string().email(),
  password: z.string().min(8),
  rollNumber: z.string().min(1),
  phoneNumber: z.string().min(1).refine(validatePhone, 'Phone must include country code and valid digits'),
  department: z.string().min(1),
  year: z.string().min(1),
  roomNumber: z.string().min(1).optional().nullable(),
  bedNumber: z.string().min(1).optional().nullable(),
  gender: z.string().min(1),
  parentName: z.string().min(1).regex(NAME_REGEX, 'Parent name should contain letters only'),
  parentContact: z.string().min(1).refine(validatePhone, 'Parent contact must include country code and valid digits'),
  status: z.string().min(1),
  profileImage: z.string().min(1),
  address: z.string().min(1),
  dateOfBirth: z.coerce.date(),
  emergencyContactName: z.string().min(1).regex(NAME_REGEX, 'Emergency contact name should contain letters only'),
  emergencyContactNumber: z.string().min(1).refine(validatePhone, 'Emergency contact must include country code and valid digits'),
  bloodGroup: z.string().min(1),
  checkInDate: z.coerce.date(),
  checkOutDate: z.coerce.date(),
  feeStatus: z.string().min(1),
  passOutYear: z.coerce.number().int(),
  inYear: z.coerce.number().int(),
  idCardPdf: z.string().min(1),
  classId: z.string().uuid().optional().nullable(),
  hostelId: z.string().uuid().optional().nullable(),
  facultyIds: z.array(z.string().uuid()).optional(),
})

// GET /api/students
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)

    let where: object

    if (session.type === 'ADMIN' || session.type === 'SUPER') {
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
      include: {
        class: true,
        hostel: true,
        facultyInCharge: {
          include: { member: { select: { id: true, name: true, email: true } } },
        },
      },
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
    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'students', 'canCreate')
    } else if (session.type !== 'ADMIN' && session.type !== 'SUPER') {
      return err('Forbidden', 403)
    }

    const raw = await req.json()
    const body = createSchema.parse({
      ...raw,
      phoneNumber: normalizePhone(raw.phoneNumber ?? ''),
      parentContact: normalizePhone(raw.parentContact ?? ''),
      emergencyContactNumber: normalizePhone(raw.emergencyContactNumber ?? ''),
      roomNumber: raw.roomNumber || null,
      bedNumber: raw.bedNumber || null,
      classId: raw.classId || null,
      hostelId: raw.hostelId || null,
    })

    const existing = await prisma.student.findUnique({ where: { email: body.email } })
    if (existing) return err('Email already in use', 409)

    const hashed = await hashPassword(body.password)

    const facultyIds = [...new Set(body.facultyIds ?? [])]
    if (facultyIds.length) {
      const count = await prisma.adminMember.count({
        where: { id: { in: facultyIds }, collegeId: session.collegeId },
      })
      if (count !== facultyIds.length) return err('Invalid faculty selection', 400)
    }

    const student = await prisma.student.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashed,
        rollNumber: body.rollNumber,
        phoneNumber: body.phoneNumber,
        department: body.department,
        year: body.year,
        roomNumber: body.roomNumber ?? null,
        bedNumber: body.bedNumber ?? null,
        gender: body.gender,
        parentName: body.parentName,
        parentContact: body.parentContact,
        status: body.status,
        profileImage: body.profileImage,
        address: body.address,
        dateOfBirth: body.dateOfBirth,
        emergencyContactName: body.emergencyContactName,
        emergencyContactNumber: body.emergencyContactNumber,
        bloodGroup: body.bloodGroup,
        checkInDate: body.checkInDate,
        checkOutDate: body.checkOutDate,
        feeStatus: body.feeStatus,
        passOutYear: body.passOutYear,
        inYear: body.inYear,
        idCardPdf: body.idCardPdf,
        collegeId: session.collegeId,
        classId: body.classId ?? null,
        hostelId: body.hostelId ?? null,
        facultyInCharge: facultyIds.length
          ? { create: facultyIds.map((memberId) => ({ memberId })) }
          : undefined,
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
