import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'
import { askGemini, GeminiMessage } from '@/lib/chatbot/gemini'
import { buildKnowledgeContext } from '@/lib/chatbot/buildContext'
import prisma from '@/lib/prisma'

const schema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'model']),
        parts: z.array(z.object({ text: z.string() })),
      })
    )
    .optional()
    .default([]),
})

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session?.collegeId) return err('Unauthorized', 401)

    const { message, history } = schema.parse(await req.json())

    const knowledgeContext = await buildKnowledgeContext(session.collegeId)
    const college = await prisma.college.findUnique({
      where: { id: session.collegeId },
      select: { name: true },
    })
    const collegeName = college?.name ?? 'the hostel'

    const systemInstruction = [
      `You are a helpful hostel assistant for ${collegeName}.`,
      'Answer student and staff questions accurately and helpfully.',
      knowledgeContext
        ? `\nUse the following knowledge base to answer questions:\n\n${knowledgeContext}`
        : '',
      '\nIf a question is not covered by the knowledge base, say so politely and suggest contacting the hostel office.',
      'Be concise, friendly, and professional.',
    ]
      .filter(Boolean)
      .join('\n')

    const replyRaw = await askGemini(systemInstruction, history as GeminiMessage[], message)
    const reply = replyRaw
      .replace(/\*\*/g, '')
      .replace(/^\s*[*-]\s+/gm, '')
      .trim()

    return ok({ reply })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid message', 400)
    console.error('[Chatbot]', msg)
    return err('Chatbot service unavailable', 503)
  }
}
