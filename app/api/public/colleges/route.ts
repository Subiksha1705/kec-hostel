import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const colleges = await prisma.college.findMany({
    select: { id: true, name: true, location: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ ok: true, data: colleges })
}
