import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  label: z.string().min(1).max(200),
  content: z.string().min(1).max(100_000),
})

export async function POST(req: NextRequest) {
  const session = getSession(req)
  if (session.type !== 'ADMIN') return err('Forbidden', 403)

  const { label, content } = schema.parse(await req.json())

  const source = await prisma.chatbotKnowledgeSource.create({
    data: {
      collegeId: session.collegeId,
      type: 'TEXT',
      label,
      content,
    },
  })

  return ok({ source })
}
