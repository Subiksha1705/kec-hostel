import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { FeeStatus, Gender, StudentStatus } from '@prisma/client'
import { getSession } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { NAME_REGEX, normalizePhone, validatePhone } from '@/lib/validation/phone'
import { z } from 'zod'

const rowSchema = z.object({
  name: z.string().min(1).regex(NAME_REGEX, 'Name should contain letters only'),
  email: z.string().email(),
  password: z.string().min(8),
  rollNumber: z.string().min(1),
  phoneNumber: z.string().min(1).refine(validatePhone, 'Phone must include country code and valid digits'),
  department: z.string().min(1),
  year: z.string().min(1),
  roomNumber: z.string().optional().nullable(),
  bedNumber: z.string().optional().nullable(),
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
  class: z.string().optional().nullable(),
  classId: z.string().uuid().optional().nullable(),
  hostel: z.string().optional().nullable(),
  hostelId: z.string().uuid().optional().nullable(),
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

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN' && session.type !== 'SUPER') return err('Forbidden', 403)

    const body = (await req.json()) as { rows: unknown[] }
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return err('No rows provided', 400)
    }
    if (body.rows.length > 200) {
      return err('Maximum 200 rows per upload', 400)
    }

    const [classes, hostels] = await Promise.all([
      prisma.class.findMany({ where: { collegeId: session.collegeId }, select: { id: true, name: true } }),
      prisma.hostel.findMany({ where: { collegeId: session.collegeId }, select: { id: true, name: true } }),
    ])

    const classMap = new Map(classes.map((c) => [c.name.toLowerCase(), c.id]))
    const hostelMap = new Map(hostels.map((h) => [h.name.toLowerCase(), h.id]))
    const seenEmails = new Set<string>()

    const results: {
      row: number
      email: string
      status: 'created' | 'skipped'
      reason?: string
    }[] = []

    for (let i = 0; i < body.rows.length; i++) {
      const parsed = rowSchema.safeParse(body.rows[i])
      if (!parsed.success) {
        results.push({
          row: i + 1,
          email: String((body.rows[i] as any)?.email ?? ''),
          status: 'skipped',
          reason: parsed.error.errors[0]?.message ?? 'Invalid row',
        })
        continue
      }

      const data = {
        ...parsed.data,
        phoneNumber: normalizePhone(parsed.data.phoneNumber),
        parentContact: normalizePhone(parsed.data.parentContact),
        emergencyContactNumber: normalizePhone(parsed.data.emergencyContactNumber),
      }
      const email = data.email.toLowerCase()
      if (seenEmails.has(email)) {
        results.push({ row: i + 1, email, status: 'skipped', reason: 'Duplicate email in upload' })
        continue
      }
      seenEmails.add(email)

      let gender: Gender
      let status: StudentStatus
      let feeStatus: FeeStatus
      try {
        gender = normalizeEnum(data.gender, GENDER_VALUES, 'gender')
        status = normalizeEnum(data.status, STATUS_VALUES, 'status')
        feeStatus = normalizeEnum(data.feeStatus, FEE_VALUES, 'feeStatus')
      } catch (error) {
        results.push({
          row: i + 1,
          email,
          status: 'skipped',
          reason: error instanceof Error ? error.message : 'Invalid enum value',
        })
        continue
      }

      let classId = data.classId ?? null
      if (!classId && data.class) {
        classId = classMap.get(data.class.toLowerCase()) ?? null
        if (!classId) {
          results.push({
            row: i + 1,
            email,
            status: 'skipped',
            reason: `Class "${data.class}" not found in this college`,
          })
          continue
        }
      }

      let hostelId = data.hostelId ?? null
      if (!hostelId && data.hostel) {
        hostelId = hostelMap.get(data.hostel.toLowerCase()) ?? null
        if (!hostelId) {
          results.push({
            row: i + 1,
            email,
            status: 'skipped',
            reason: `Hostel "${data.hostel}" not found in this college`,
          })
          continue
        }
      }

      const existing = await prisma.student.findUnique({ where: { email } })
      if (existing) {
        results.push({ row: i + 1, email, status: 'skipped', reason: 'Email already in use' })
        continue
      }

      const hashed = await hashPassword(data.password)
      await prisma.student.create({
        data: {
          name: data.name,
          email,
          password: hashed,
          rollNumber: data.rollNumber,
          phoneNumber: data.phoneNumber,
          department: data.department,
          year: data.year,
          roomNumber: data.roomNumber || null,
          bedNumber: data.bedNumber || null,
          gender,
          parentName: data.parentName,
          parentContact: data.parentContact,
          status,
          profileImage: data.profileImage,
          address: data.address,
          dateOfBirth: data.dateOfBirth,
          emergencyContactName: data.emergencyContactName,
          emergencyContactNumber: data.emergencyContactNumber,
          bloodGroup: data.bloodGroup,
          checkInDate: data.checkInDate,
          checkOutDate: data.checkOutDate,
          feeStatus,
          passOutYear: data.passOutYear,
          inYear: data.inYear,
          idCardPdf: data.idCardPdf,
          collegeId: session.collegeId,
          classId,
          hostelId,
        },
      })

      results.push({ row: i + 1, email, status: 'created' })
    }

    const created = results.filter((r) => r.status === 'created').length
    const skipped = results.filter((r) => r.status === 'skipped').length

    return ok({ created, skipped, results })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
