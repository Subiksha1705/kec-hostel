'use client'

import Image from 'next/image'
import { useCachedFetch } from '@/lib/cache'
import SafeHtml from '@/components/announcements/SafeHtml'

type Announcement = {
  id: string
  title: string
  description: string
  imageUrl?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  linkUrl?: string | null
  linkLabel?: string | null
  postedBy: string
  role: string
  isPinned: boolean
  createdAt: string
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function StudentAnnouncementsPage() {
  const { data, loading } = useCachedFetch<Announcement[]>('/api/announcements')
  const announcements = data ?? []

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Announcements
        </h1>
      </div>

      {loading ? <div style={{ color: 'var(--text-secondary)' }}>Loading...</div> : null}

      {!loading && announcements.length === 0 ? (
        <div style={{ padding: '16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          No announcements available yet.
        </div>
      ) : null}

      {announcements.map((item) => (
        <div
          key={item.id}
          style={{
            border: '1px solid var(--border)',
            borderRadius: '16px',
            background: 'var(--surface)',
            padding: '16px',
            boxShadow: 'var(--shadow)',
            display: 'grid',
            gap: '12px',
          }}
        >
          {item.imageUrl ? (
            <div
              style={{
                position: 'relative',
                width: item.imageWidth ? `${item.imageWidth}px` : '100%',
                maxWidth: '100%',
                height: item.imageHeight ? `${item.imageHeight}px` : '200px',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <Image src={item.imageUrl} alt={item.title} fill className="object-cover" unoptimized />
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {item.isPinned ? (
              <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '999px', background: 'var(--surface-2)' }}>
                Pinned
              </span>
            ) : null}
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {item.role} • {item.postedBy} • {formatDate(item.createdAt)}
            </span>
          </div>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>{item.title}</h2>
          <SafeHtml html={item.description} className="prose prose-sm max-w-none text-[var(--text-secondary)]" />
          {item.linkUrl ? (
            <a
              href={item.linkUrl}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'var(--sage-dark)', fontWeight: 600, textDecoration: 'none' }}
            >
              {item.linkLabel ?? 'Open link'} →
            </a>
          ) : null}
        </div>
      ))}
    </div>
  )
}
