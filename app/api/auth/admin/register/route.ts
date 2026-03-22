import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  collegeName: z.string().min(1),
  collegeLocation: z.string().min(1),
  adminName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    const existing = await prisma.admin.findUnique({ where: { email: body.email } })
    if (existing) return err('Email already registered', 409)

    const hashed = await hashPassword(body.password)

    const result = await prisma.$transaction(async (tx) => {
      const college = await tx.college.create({
        data: { name: body.collegeName, location: body.collegeLocation },
      })
      const admin = await tx.admin.create({
        data: {
          name: body.adminName,
          email: body.email,
          password: hashed,
          collegeId: college.id,
        },
      })
      return { college, admin }
    })

    return ok({ collegeId: result.college.id, adminId: result.admin.id }, 201)
  } catch (e) {
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err('Server error', 500)
  }
}
