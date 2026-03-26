const DEFAULT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash-tts',
  'gemini-2.0-flash',
]
const GEMINI_MODEL = process.env.GEMINI_MODEL
const GEMINI_MODELS = GEMINI_MODEL
  ? [GEMINI_MODEL, ...DEFAULT_MODELS.filter((m) => m !== GEMINI_MODEL)]
  : DEFAULT_MODELS

const getGeminiApiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

export type GeminiMessage = {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export async function askGemini(
  systemInstruction: string,
  history: GeminiMessage[],
  userMessage: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY or NEXT_PUBLIC_GEMINI_API_KEY is not set')
  }

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [...history, { role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.4,
    },
  }

  let lastError: string | null = null

  for (const model of GEMINI_MODELS) {
    const response = await fetch(`${getGeminiApiUrl(model)}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const text = await response.text()
      lastError = `Gemini API error ${response.status} (${model}): ${text}`
      // Try next model on common availability or quota errors
      if ([404, 429, 403].includes(response.status)) {
        continue
      }
      throw new Error(lastError)
    }

    const data = await response.json()
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      'Sorry, I could not generate a response.'
    )
  }

  throw new Error(lastError ?? 'Gemini API error: all models failed')
}
