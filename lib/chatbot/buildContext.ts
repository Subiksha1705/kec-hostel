import prisma from '@/lib/prisma'

/**
 * Fetch all knowledge sources for a college and concatenate them into a
 * single system-prompt context string (truncated to ~200 000 chars to be
 * safe with Gemini's 1 M token window).
 */
export async function buildKnowledgeContext(collegeId: string): Promise<string> {
  const hostel = await prisma.hostel.findFirst({
    where: { collegeId },
    select: { chatbotContext: true },
  })

  const sources = await prisma.chatbotKnowledgeSource.findMany({
    where: { collegeId },
    orderBy: { createdAt: 'asc' },
    select: { label: true, type: true, content: true },
  })

  const parts: string[] = []

  if (hostel?.chatbotContext?.trim()) {
    parts.push(`### Hostel Context (TEXT)\n${hostel.chatbotContext.trim()}`)
  }

  if (sources.length > 0) {
    parts.push(
      ...sources.map((s) => `### ${s.label} (${s.type})\n${s.content}`)
    )
  }

  if (parts.length === 0) return ''

  const full = parts.join('\n\n---\n\n')
  return full.slice(0, 200_000)
}
