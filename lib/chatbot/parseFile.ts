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
    const pdfParseModule = await import('pdf-parse')
    const pdfParse =
      (pdfParseModule as any).default ?? (pdfParseModule as any)
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
