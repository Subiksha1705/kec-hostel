import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  message: z.string().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .default([]),
})

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'STUDENT' && session.type !== 'MEMBER') {
      return err('Forbidden', 403)
    }

    const { message, history } = schema.parse(await req.json())

    const hostel = await prisma.hostel.findFirst({
      where: { collegeId: session.collegeId },
      select: { chatbotContext: true, name: true },
    })

    const systemPrompt = hostel?.chatbotContext
      ? `You are a helpful hostel assistant for ${hostel.name}. Use the following information to answer student questions accurately and helpfully.\n\n${hostel.chatbotContext}\n\nIf a question is not covered by the above information, say so politely and suggest the student contact the hostel office.`
      : 'You are a helpful hostel assistant. Answer student questions politely. If you do not know something, suggest they contact the hostel office.'

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [...history, { role: 'user', content: message }],
      }),
    })

    if (!response.ok) {
      return err('Chatbot service unavailable', 503)
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text ?? 'Sorry, I could not generate a response.'

    return ok({ reply })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid message', 400)
    return err(msg, 500)
  }
}
