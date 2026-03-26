import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/api/response'

// GET — list all sources for the admin's college
export async function GET(req: NextRequest) {
  const session = getSession(req)
  if (session.type !== 'ADMIN') return err('Forbidden', 403)

  const sources = await prisma.chatbotKnowledgeSource.findMany({
    where: { collegeId: session.collegeId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      label: true,
      fileName: true,
      sourceUrl: true,
      createdAt: true,
      content: true,
    },
  })

  const trimmed = sources.map((source) => {
    const { content, ...rest } = source
    return {
      ...rest,
      contentExcerpt: content.slice(0, 400),
    }
  })

  return ok({ sources: trimmed })
}
