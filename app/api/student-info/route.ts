import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const updateSchema = z.object({
  roomNumber: z.string().min(1).optional().nullable(),
  bedNumber: z.string().min(1).optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'STUDENT') return err('Forbidden', 403)

    const student = await prisma.student.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        name: true,
        email: true,
        rollNumber: true,
        phoneNumber: true,
        department: true,
        year: true,
        roomNumber: true,
        bedNumber: true,
        gender: true,
        parentName: true,
        parentContact: true,
        status: true,
        profileImage: true,
        address: true,
        dateOfBirth: true,
        emergencyContactName: true,
        emergencyContactNumber: true,
        bloodGroup: true,
        checkInDate: true,
        checkOutDate: true,
        feeStatus: true,
        passOutYear: true,
        inYear: true,
        idCardPdf: true,
        createdAt: true,
        updatedAt: true,
        class: { select: { id: true, name: true } },
        hostel: {
          select: {
            id: true,
            name: true,
            location: true,
            capacity: true,
            description: true,
            rules: true,
          },
        },
        facultyInCharge: {
          select: {
            member: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    if (!student) return err('Student not found', 404)

    return ok(student)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'STUDENT') return err('Forbidden', 403)

    const raw = await req.json()
    const body = updateSchema.parse({
      ...raw,
      roomNumber: raw.roomNumber || null,
      bedNumber: raw.bedNumber || null,
    })

    const updated = await prisma.student.update({
      where: { id: session.sub },
      data: {
        roomNumber: body.roomNumber ?? null,
        bedNumber: body.bedNumber ?? null,
      },
      select: {
        id: true,
        roomNumber: true,
        bedNumber: true,
      },
    })

    return ok(updated)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
