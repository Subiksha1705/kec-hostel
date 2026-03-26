import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/api/response'
import { scrapeUrlToText } from '@/lib/chatbot/scrapeUrl'
import { z } from 'zod'

const schema = z.object({
  url: z.string().url(),
  label: z.string().min(1).max(200).optional(),
})

export async function POST(req: NextRequest) {
  const session = getSession(req)
  if (session.type !== 'ADMIN') return err('Forbidden', 403)

  const { url, label } = schema.parse(await req.json())

  let content: string
  try {
    content = await scrapeUrlToText(url)
  } catch (e) {
    return err(`Could not scrape URL: ${(e as Error).message}`, 400)
  }

  const source = await prisma.chatbotKnowledgeSource.create({
    data: {
      collegeId: session.collegeId,
      type: 'URL',
      label: label ?? url,
      sourceUrl: url,
      content,
    },
  })

  return ok({ source })
}
