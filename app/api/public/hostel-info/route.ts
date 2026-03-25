import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const collegeId = searchParams.get('collegeId')

  if (!collegeId) {
    return NextResponse.json({ ok: false, error: 'collegeId is required' }, { status: 400 })
  }

  const hostel = await prisma.hostel.findFirst({
    where: { collegeId },
    select: {
      id: true,
      name: true,
      location: true,
      capacity: true,
      description: true,
      rules: true,
      college: { select: { name: true } },
    },
  })

  if (!hostel) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data: hostel })
}
