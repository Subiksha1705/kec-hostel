'use client'

import DOMPurify from 'dompurify'

interface Props {
  html: string
  className?: string
}

export default function SafeHtml({ html, className }: Props) {
  const sanitized = DOMPurify.sanitize(html)
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitized }} />
}
