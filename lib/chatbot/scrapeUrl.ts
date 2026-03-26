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
