import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/api/response'
import { scrapeUrlToText } from '@/lib/chatbot/scrapeUrl'
import { z } from 'zod'

const updateSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(100_000).optional(),
  sourceUrl: z.string().url().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(req)
  if (session.type !== 'ADMIN') return err('Forbidden', 403)

  const source = await prisma.chatbotKnowledgeSource.findFirst({
    where: { id: params.id, collegeId: session.collegeId },
  })

  if (!source) return err('Not found', 404)

  return ok({ source })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(req)
  if (session.type !== 'ADMIN') return err('Forbidden', 403)

  const source = await prisma.chatbotKnowledgeSource.findFirst({
    where: { id: params.id, collegeId: session.collegeId },
  })

  if (!source) return err('Not found', 404)

  await prisma.chatbotKnowledgeSource.delete({ where: { id: params.id } })
  return ok({ deleted: true })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = getSession(req)
  if (session.type !== 'ADMIN') return err('Forbidden', 403)

  const source = await prisma.chatbotKnowledgeSource.findFirst({
    where: { id: params.id, collegeId: session.collegeId },
  })

  if (!source) return err('Not found', 404)

  const { label, content, sourceUrl } = updateSchema.parse(await req.json())

  if (source.type === 'FILE') {
    if (!label) return err('Label is required for file updates', 400)
    const updated = await prisma.chatbotKnowledgeSource.update({
      where: { id: source.id },
      data: { label },
    })
    return ok({ source: updated })
  }

  if (source.type === 'URL') {
    let nextContent = content
    let nextUrl = sourceUrl ?? source.sourceUrl ?? undefined

    if (sourceUrl && sourceUrl !== source.sourceUrl && !content) {
      try {
        nextContent = await scrapeUrlToText(sourceUrl)
      } catch (e) {
        return err(`Could not scrape URL: ${(e as Error).message}`, 400)
      }
    }

    const updated = await prisma.chatbotKnowledgeSource.update({
      where: { id: source.id },
      data: {
        label: label ?? source.label,
        content: nextContent ?? source.content,
        sourceUrl: nextUrl,
      },
    })
    return ok({ source: updated })
  }

  // TEXT
  if (!content && !label) return err('Nothing to update', 400)

  const updated = await prisma.chatbotKnowledgeSource.update({
    where: { id: source.id },
    data: {
      label: label ?? source.label,
      content: content ?? source.content,
    },
  })

  return ok({ source: updated })
}
