# Chatbot Knowledge Base & Gemini Integration — Implementation Spec

## Overview

Replace the existing Anthropic-powered chatbot (currently stub) with a full-featured
**knowledge-base chatbot powered by Google Gemini**. The admin can upload files, paste
website URLs, and write raw text — all of which get parsed into a persistent knowledge
base. Students, members, and admins can then chat with the bot from a **dedicated sidebar
page** (not the floating widget).

---

## Goals

1. **Admin knowledge-base management** — upload PDFs, `.txt`, `.docx`, `.xlsx`, `.csv`,
   paste URLs (scraped), write free-text snippets. All content is stored in the DB and
   concatenated into a Gemini system prompt at query time.
2. **Gemini Flash as the LLM** — default `gemini-2.5-flash` via the Google AI Studio REST API
   (`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`).
   You can override with `GEMINI_MODEL` in the environment. If a model is unavailable or rate-limited,
   the server automatically falls back through a free-tier-friendly list:
   `gemini-3.1-flash-lite`, `gemini-3-flash`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`,
   `gemini-2.5-flash-tts`, `gemini-2.0-flash`.
   Use `GOOGLE_AI_API_KEY` env var. Gemini Flash has ~1 M token context and generous
   free-tier rate limits (up to 1 500 req/day on the free tier — well above the 300–500
   req/hr target).
3. **Chatbot page in sidebar for every role** — admin, member, and student each get a
   `/admin/chatbot`, `/member/chatbot`, and `/student/chatbot` route that shows the same
   chat UI. The admin page has an additional "Knowledge Base" tab.
4. **All roles can chat** — the chatbot API must accept sessions of type `ADMIN`,
   `MEMBER`, and `STUDENT` (currently it blocks admins).

---

## 1. Database — New Models

Add to `prisma/schema.prisma`:

```prisma
// ─── CHATBOT KNOWLEDGE BASE ──────────────────────────────────────────────────

enum KnowledgeSourceType {
  TEXT      // raw text snippet
  FILE      // uploaded file (parsed to text)
  URL       // scraped web page
}

model ChatbotKnowledgeSource {
  id          String              @id @default(uuid())
  collegeId   String
  type        KnowledgeSourceType
  label       String              // human-readable name shown in admin UI
  content     String              @db.Text  // extracted plain text
  sourceUrl   String?             // original URL (for URL type)
  fileName    String?             // original file name (for FILE type)
  fileMime    String?             // MIME type
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  college     College             @relation(fields: [collegeId], references: [id])

  @@index([collegeId])
}
```

Add the reverse relation to the `College` model:

```prisma
model College {
  // ... existing fields ...
  knowledgeSources  ChatbotKnowledgeSource[]
}
```

Create and run the migration:

```bash
yarn prisma migrate dev --name add_chatbot_knowledge_base
yarn prisma generate
```

---

## 2. Environment Variables

Add to `.env` (and document in `.env.example`):

```
GOOGLE_AI_API_KEY=your_google_ai_studio_key_here
GEMINI_MODEL=gemini-2.5-flash
```

---

## 3. File-Parsing Utility

Create `lib/chatbot/parseFile.ts`:

```ts
/**
 * Parse various file types into plain text.
 * Called server-side only (Node.js environment).
 */

export async function parseFileToText(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<string> {
  // PDF — use pdf-parse
  if (mimeType === 'application/pdf') {
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(buffer)
    return result.text
  }

  // Plain text / markdown / CSV / TSV
  if (
    mimeType.startsWith('text/') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.md') ||
    fileName.endsWith('.csv') ||
    fileName.endsWith('.tsv')
  ) {
    return buffer.toString('utf-8')
  }

  // DOCX — use mammoth
  if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    const mammoth = (await import('mammoth')).default
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  // XLSX / XLS — use xlsx (already in dependencies)
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    fileName.endsWith('.xlsx') ||
    fileName.endsWith('.xls')
  ) {
    const XLSX = (await import('xlsx')).default
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const texts: string[] = []
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      texts.push(`Sheet: ${sheetName}\n` + XLSX.utils.sheet_to_csv(sheet))
    }
    return texts.join('\n\n')
  }

  // JSON
  if (mimeType === 'application/json' || fileName.endsWith('.json')) {
    return buffer.toString('utf-8')
  }

  throw new Error(`Unsupported file type: ${mimeType} (${fileName})`)
}
```

Install required packages:

```bash
yarn add pdf-parse mammoth
yarn add -D @types/pdf-parse
```

(`xlsx` is already a dependency.)

---

## 4. URL-Scraping Utility

Create `lib/chatbot/scrapeUrl.ts`:

```ts
/**
 * Fetch a URL and extract readable plain text from the HTML.
 * Uses Node's built-in fetch (Next.js 14+).
 */
export async function scrapeUrlToText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'KEC-Hostel-Bot/1.0' },
    signal: AbortSignal.timeout(15_000),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get('content-type') ?? ''

  // If it's plain text / JSON return directly
  if (contentType.includes('text/plain') || contentType.includes('application/json')) {
    return response.text()
  }

  // HTML — strip tags naively (no extra deps)
  const html = await response.text()
  // Remove script/style blocks
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Remove all remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim()

  // Truncate at 50 000 chars to stay well within Gemini context
  return stripped.slice(0, 50_000)
}
```

---

## 5. Gemini Helper

Create `lib/chatbot/gemini.ts`:

```ts
const DEFAULT_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash']
const GEMINI_MODEL = process.env.GEMINI_MODEL
const GEMINI_MODELS = GEMINI_MODEL
  ? [GEMINI_MODEL, ...DEFAULT_MODELS.filter((m) => m !== GEMINI_MODEL)]
  : DEFAULT_MODELS
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS[0]}:generateContent`

export type GeminiMessage = {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export async function askGemini(
  systemInstruction: string,
  history: GeminiMessage[],
  userMessage: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set')

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      ...history,
      { role: 'user', parts: [{ text: userMessage }] },
    ],
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.4,
    },
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gemini API error ${response.status}: ${text}`)
  }

  const data = await response.json()
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    'Sorry, I could not generate a response.'
  )
}
```

---

## 6. Knowledge-Base Context Builder

Create `lib/chatbot/buildContext.ts`:

```ts
import prisma from '@/lib/prisma'

/**
 * Fetch all knowledge sources for a college and concatenate them into a
 * single system-prompt context string (truncated to ~200 000 chars to be
 * safe with Gemini's 1 M token window).
 */
export async function buildKnowledgeContext(collegeId: string): Promise<string> {
  const sources = await prisma.chatbotKnowledgeSource.findMany({
    where: { collegeId },
    orderBy: { createdAt: 'asc' },
    select: { label: true, type: true, content: true },
  })

  if (sources.length === 0) return ''

  const parts = sources.map(
    (s) => `### ${s.label} (${s.type})\n${s.content}`
  )

  const full = parts.join('\n\n---\n\n')
  return full.slice(0, 200_000)
}
```

---

## 7. API Routes

### 7a. Main Chatbot Endpoint — `app/api/chatbot/route.ts` (REPLACE existing)

```ts
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'
import { askGemini, GeminiMessage } from '@/lib/chatbot/gemini'
import { buildKnowledgeContext } from '@/lib/chatbot/buildContext'

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
    // Allow ADMIN, MEMBER, and STUDENT
    if (!session?.collegeId) return err('Unauthorized', 401)

    const { message, history } = schema.parse(await req.json())

    const knowledgeContext = await buildKnowledgeContext(session.collegeId)

    const systemInstruction = [
      'You are a helpful hostel assistant for KEC Hostel Management System.',
      'Answer student and staff questions accurately and helpfully.',
      knowledgeContext
        ? `\nUse the following knowledge base to answer questions:\n\n${knowledgeContext}`
        : '',
      '\nIf a question is not covered by the knowledge base, say so politely and suggest contacting the hostel office.',
      'Be concise, friendly, and professional.',
    ]
      .filter(Boolean)
      .join('\n')

    const reply = await askGemini(systemInstruction, history as GeminiMessage[], message)

    return ok({ reply })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid message', 400)
    console.error('[Chatbot]', msg)
    return err('Chatbot service unavailable', 503)
  }
}
```

### 7b. Knowledge Sources CRUD — `app/api/chatbot/knowledge/route.ts`

```ts
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
      // omit content for list view (can be large)
    },
  })

  return ok({ sources })
}
```

### 7c. Add Text Snippet — `app/api/chatbot/knowledge/text/route.ts`

```ts
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
```

### 7d. Add URL — `app/api/chatbot/knowledge/url/route.ts`

```ts
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
```

### 7e. Upload File — `app/api/chatbot/knowledge/file/route.ts`

```ts
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/api/response'
import { parseFileToText } from '@/lib/chatbot/parseFile'

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
```

### 7f. Delete Source — `app/api/chatbot/knowledge/[id]/route.ts`

```ts
import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/api/response'

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
```

---

## 8. Shared Chat UI Component

Create `components/chatbot/ChatPage.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Send, Bot, User } from 'lucide-react'
import { apiJson } from '@/lib/api/client'

type GeminiMessage = {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<GeminiMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return

    const updatedHistory: GeminiMessage[] = [
      ...messages,
      { role: 'user', parts: [{ text }] },
    ]
    setMessages(updatedHistory)
    setInput('')
    setLoading(true)

    const { data } = await apiJson<{ ok: boolean; data: { reply: string } }>(
      '/api/chatbot',
      {
        method: 'POST',
        body: JSON.stringify({ message: text, history: messages }),
      }
    )

    const reply = data?.data?.reply ?? 'Sorry, something went wrong.'
    setMessages([...updatedHistory, { role: 'model', parts: [{ text: reply }] }])
    setLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 48px)',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0 0 16px 0',
          borderBottom: '1px solid var(--border)',
          marginBottom: '16px',
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Bot size={24} />
          Hostel Assistant
        </h1>
        <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
          Ask me anything about your hostel — rules, timings, procedures, and more.
        </p>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          paddingBottom: '16px',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '14px',
              padding: '40px 0',
            }}
          >
            <Bot size={40} style={{ opacity: 0.3, marginBottom: '12px', display: 'block', margin: '0 auto 12px' }} />
            Start by asking a question about your hostel.
          </div>
        )}

        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const text = msg.parts.map((p) => p.text).join('')
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                flexDirection: isUser ? 'row-reverse' : 'row',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: isUser ? 'var(--sage)' : 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: isUser ? 'white' : 'var(--text-secondary)',
                }}
              >
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                style={{
                  maxWidth: '70%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: isUser ? 'var(--sage-light)' : 'var(--surface-2)',
                  color: isUser ? 'var(--sage-dark)' : 'var(--text-primary)',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {text}
              </div>
            </div>
          )
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bot size={16} color="var(--text-secondary)" />
            </div>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: 'var(--surface-2)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
              }}
            >
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          paddingTop: '16px',
          borderTop: '1px solid var(--border)',
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a question about your hostel..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            background: 'var(--surface-2)',
            fontSize: '14px',
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            background: 'var(--sage)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
          }}
        >
          <Send size={16} />
          Send
        </button>
      </div>
    </div>
  )
}
```

---

## 9. Admin Chatbot Page (Chat + Knowledge Base)

Create `app/admin/chatbot/page.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import ChatPage from '@/components/chatbot/ChatPage'
import { apiJson } from '@/lib/api/client'
import { Trash2, Plus, Link, FileText, Upload, RefreshCw } from 'lucide-react'

type KnowledgeSource = {
  id: string
  type: 'TEXT' | 'FILE' | 'URL'
  label: string
  fileName?: string | null
  sourceUrl?: string | null
  createdAt: string
}

type Tab = 'chat' | 'knowledge'

export default function AdminChatbotPage() {
  const [tab, setTab] = useState<Tab>('chat')
  const [sources, setSources] = useState<KnowledgeSource[]>([])
  const [loadingSources, setLoadingSources] = useState(false)

  // Add text state
  const [textLabel, setTextLabel] = useState('')
  const [textContent, setTextContent] = useState('')
  const [addingText, setAddingText] = useState(false)

  // Add URL state
  const [urlValue, setUrlValue] = useState('')
  const [urlLabel, setUrlLabel] = useState('')
  const [addingUrl, setAddingUrl] = useState(false)

  // File upload state
  const [fileLabel, setFileLabel] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchSources = async () => {
    setLoadingSources(true)
    const { data } = await apiJson<{ ok: boolean; data: { sources: KnowledgeSource[] } }>(
      '/api/chatbot/knowledge'
    )
    setSources(data?.data?.sources ?? [])
    setLoadingSources(false)
  }

  useEffect(() => {
    if (tab === 'knowledge') fetchSources()
  }, [tab])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  const showError = (msg: string) => {
    setError(msg)
    setTimeout(() => setError(''), 5000)
  }

  const addText = async () => {
    if (!textLabel.trim() || !textContent.trim()) return
    setAddingText(true)
    const { res } = await apiJson('/api/chatbot/knowledge/text', {
      method: 'POST',
      body: JSON.stringify({ label: textLabel.trim(), content: textContent.trim() }),
    })
    setAddingText(false)
    if (res.ok) {
      setTextLabel('')
      setTextContent('')
      showSuccess('Text snippet added.')
      fetchSources()
    } else {
      showError('Failed to add text snippet.')
    }
  }

  const addUrl = async () => {
    if (!urlValue.trim()) return
    setAddingUrl(true)
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
      '/api/chatbot/knowledge/url',
      {
        method: 'POST',
        body: JSON.stringify({
          url: urlValue.trim(),
          label: urlLabel.trim() || undefined,
        }),
      }
    )
    setAddingUrl(false)
    if (res.ok) {
      setUrlValue('')
      setUrlLabel('')
      showSuccess('URL scraped and added.')
      fetchSources()
    } else {
      showError((data as any)?.error ?? 'Failed to scrape URL.')
    }
  }

  const uploadFile = async () => {
    const file = fileInputRef.current?.files?.[0]
    if (!file) return
    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', file)
    if (fileLabel.trim()) formData.append('label', fileLabel.trim())

    const res = await fetch('/api/chatbot/knowledge/file', {
      method: 'POST',
      body: formData,
    })
    setUploadingFile(false)

    if (res.ok) {
      setFileLabel('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      showSuccess('File uploaded and parsed.')
      fetchSources()
    } else {
      const data = await res.json().catch(() => ({}))
      showError(data?.error ?? 'Failed to upload file.')
    }
  }

  const deleteSource = async (id: string) => {
    if (!confirm('Delete this knowledge source?')) return
    const { res } = await apiJson(`/api/chatbot/knowledge/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setSources((s) => s.filter((x) => x.id !== id))
      showSuccess('Deleted.')
    } else {
      showError('Failed to delete.')
    }
  }

  const typeIcon = (type: string) => {
    if (type === 'URL') return <Link size={14} />
    if (type === 'FILE') return <FileText size={14} />
    return <Plus size={14} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {(['chat', 'knowledge'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: tab === t ? 700 : 500,
              color: tab === t ? 'var(--sage-dark)' : 'var(--text-secondary)',
              borderBottom: tab === t ? '2px solid var(--sage)' : '2px solid transparent',
              marginBottom: '-1px',
              fontSize: '14px',
              textTransform: 'capitalize',
            }}
          >
            {t === 'chat' ? '💬 Chat' : '📚 Knowledge Base'}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--rose)', color: '#7a2020', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '14px' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: 'var(--mint)', color: '#1a5c3a', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '14px' }}>
          {success}
        </div>
      )}

      {tab === 'chat' && <ChatPage />}

      {tab === 'knowledge' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '800px' }}>

          {/* Add Text Snippet */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Add Text Snippet</h2>
            <input
              placeholder="Label (e.g. 'Hostel Rules')"
              value={textLabel}
              onChange={(e) => setTextLabel(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}
            />
            <textarea
              placeholder="Paste your text content here..."
              rows={6}
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-2)', resize: 'vertical', fontFamily: 'inherit' }}
            />
            <button
              onClick={addText}
              disabled={addingText || !textLabel.trim() || !textContent.trim()}
              style={{ alignSelf: 'flex-start', background: 'var(--sage)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} />
              {addingText ? 'Adding...' : 'Add Snippet'}
            </button>
          </section>

          {/* Add URL */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Add Website URL</h2>
            <input
              placeholder="https://example.com/hostel-info"
              value={urlValue}
              onChange={(e) => setUrlValue(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}
            />
            <input
              placeholder="Label (optional — defaults to URL)"
              value={urlLabel}
              onChange={(e) => setUrlLabel(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}
            />
            <button
              onClick={addUrl}
              disabled={addingUrl || !urlValue.trim()}
              style={{ alignSelf: 'flex-start', background: 'var(--sage)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Link size={16} />
              {addingUrl ? 'Scraping...' : 'Scrape & Add'}
            </button>
          </section>

          {/* Upload File */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Upload File</h2>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>
              Supported: PDF, DOCX, TXT, CSV, XLSX, JSON, MD. Max 10 MB.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.csv,.xlsx,.xls,.json,.md"
              style={{ fontSize: '14px' }}
            />
            <input
              placeholder="Label (optional — defaults to filename)"
              value={fileLabel}
              onChange={(e) => setFileLabel(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}
            />
            <button
              onClick={uploadFile}
              disabled={uploadingFile}
              style={{ alignSelf: 'flex-start', background: 'var(--sage)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Upload size={16} />
              {uploadingFile ? 'Uploading...' : 'Upload & Parse'}
            </button>
          </section>

          {/* Existing Sources */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                Knowledge Sources ({sources.length})
              </h2>
              <button
                onClick={fetchSources}
                disabled={loadingSources}
                style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>

            {loadingSources && <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Loading...</p>}

            {!loadingSources && sources.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                No knowledge sources yet. Add text, URLs, or files above to get started.
              </p>
            )}

            {sources.map((source) => (
              <div
                key={source.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'var(--sage-light)',
                      color: 'var(--sage-dark)',
                      fontSize: '11px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      flexShrink: 0,
                    }}
                  >
                    {typeIcon(source.type)}
                    {source.type}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {source.label}
                    </div>
                    {source.sourceUrl && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {source.sourceUrl}
                      </div>
                    )}
                    {source.fileName && (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{source.fileName}</div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => deleteSource(source.id)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#b91c1c', padding: '4px', flexShrink: 0 }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  )
}
```

---

## 10. Student & Member Chatbot Pages

Create `app/student/chatbot/page.tsx`:

```tsx
import ChatPage from '@/components/chatbot/ChatPage'
export default function StudentChatbotPage() {
  return <ChatPage />
}
```

Create `app/member/chatbot/page.tsx`:

```tsx
import ChatPage from '@/components/chatbot/ChatPage'
export default function MemberChatbotPage() {
  return <ChatPage />
}
```

---

## 11. Sidebar Updates

In `components/layout/Sidebar.tsx`, add the chatbot nav item to **all three user types**:

```tsx
import { Bot } from 'lucide-react'

// In the ADMIN navItems array, add after 'hostel-info':
{ href: '/admin/chatbot', label: 'Chatbot', icon: <Bot size={18} /> },

// In the MEMBER navItems array, add after dashboard:
{ href: '/member/chatbot', label: 'Chatbot', icon: <Bot size={18} /> },

// In the STUDENT navItems array, add after dashboard:
{ href: '/student/chatbot', label: 'Chatbot', icon: <Bot size={18} /> },
```

---

## 12. Remove / Hide Floating ChatbotWidget

The floating `ChatbotWidget` (bottom-right button) is now replaced by the sidebar page.
Remove the `<ChatbotWidget />` import and usage from the admin/student/member layout files:

- `app/admin/layout.tsx`
- `app/student/layout.tsx`
- `app/member/layout.tsx`

Search for `ChatbotWidget` in each file and delete both the import and the JSX element.

---

## 13. Next.js Config — Allow Larger Request Bodies

In `next.config.ts`, allow larger bodies for the file upload route:

```ts
const nextConfig = {
  // ... existing config ...
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
}
```

Also set the route segment config in the file upload route to allow bigger bodies:

```ts
// At the top of app/api/chatbot/knowledge/file/route.ts
export const config = {
  api: { bodyParser: false },
}
```

---

## 14. Package Installs Summary

```bash
yarn add pdf-parse mammoth
yarn add -D @types/pdf-parse
```

(`xlsx`, `zod`, `lucide-react` are already installed.)

---

## 15. Testing Checklist

- [ ] Admin can open `/admin/chatbot` → "Chat" tab works, bot responds using Gemini.
- [ ] Admin can switch to "Knowledge Base" tab.
- [ ] Admin can add a text snippet → appears in list → chatbot uses it.
- [ ] Admin can add a URL → page is scraped → appears in list → chatbot uses it.
- [ ] Admin can upload a `.txt` file → appears in list → content surfaced in answers.
- [ ] Admin can upload a `.pdf` file → content parsed → chatbot answers from it.
- [ ] Admin can upload a `.docx` file → content parsed.
- [ ] Admin can upload an `.xlsx` file → sheet data parsed.
- [ ] Admin can delete any knowledge source → disappears from list.
- [ ] Student at `/student/chatbot` can chat; bot answers from knowledge base.
- [ ] Member at `/member/chatbot` can chat; bot answers from knowledge base.
- [ ] Floating chatbot widget no longer appears on any page.
- [ ] Asking a question not in the knowledge base → bot politely says so.
- [ ] `GOOGLE_AI_API_KEY` missing → API returns 503, not a crash.

---

## 16. Security Notes

- All knowledge-base CRUD endpoints check `session.type === 'ADMIN'` — members and students **cannot** add or delete sources.
- The chat endpoint `/api/chatbot` accepts all authenticated roles (`ADMIN`, `MEMBER`, `STUDENT`). The `getSession` helper must return `type` correctly for all three; verify against existing session implementation.
- File content is stored as plain text in Postgres — no raw file bytes are stored. This keeps the DB clean and avoids binary blobs.
- URL scraping is done server-side; the admin-supplied URL is not user-controllable by students.

---

## 17. File & Folder Summary

```
lib/
  chatbot/
    gemini.ts          ← Gemini API wrapper
    parseFile.ts       ← File-to-text parsing
    scrapeUrl.ts       ← URL scraper
    buildContext.ts    ← Assembles knowledge base for system prompt

app/
  api/
    chatbot/
      route.ts                     ← REPLACE existing (now uses Gemini + knowledge base)
      knowledge/
        route.ts                   ← GET list
        text/route.ts              ← POST text snippet
        url/route.ts               ← POST URL
        file/route.ts              ← POST file upload
        [id]/route.ts              ← DELETE source

  admin/chatbot/page.tsx           ← Chat + Knowledge Base tab
  student/chatbot/page.tsx         ← Chat only
  member/chatbot/page.tsx          ← Chat only

components/
  chatbot/
    ChatPage.tsx                   ← Shared chat UI (used by all three pages)

prisma/
  schema.prisma                    ← Add ChatbotKnowledgeSource model
```
