import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/api/response'
import { parseFileToText } from '@/lib/chatbot/parseFile'

export const config = {
  api: { bodyParser: false },
}

// Max file size: 10 MB
const MAX_BYTES = 10 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = getSession(req)
  if (session.type !== 'ADMIN') return err('Forbidden', 403)

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const label = (formData.get('label') as string | null)?.trim()

  if (!file) return err('No file provided', 400)
  if (file.size > MAX_BYTES) return err('File too large (max 10 MB)', 400)

  const buffer = Buffer.from(await file.arrayBuffer())

  let content: string
  try {
    content = await parseFileToText(buffer, file.type, file.name)
  } catch (e) {
    return err(`Could not parse file: ${(e as Error).message}`, 400)
  }

  const source = await prisma.chatbotKnowledgeSource.create({
    data: {
      collegeId: session.collegeId,
      type: 'FILE',
      label: label || file.name,
      fileName: file.name,
      fileMime: file.type,
      content,
    },
  })

  return ok({ source })
}
