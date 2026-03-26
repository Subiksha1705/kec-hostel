'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, Pencil, Pin, PinOff, Plus, Trash2, X } from 'lucide-react'
import { useCachedFetch } from '@/lib/cache'
import { apiJson } from '@/lib/api/client'
import AdminAnnouncementForm from '@/components/announcements/AdminAnnouncementForm'
import SafeHtml from '@/components/announcements/SafeHtml'

type Announcement = {
  id: string
  title: string
  description: string
  imageUrl?: string | null
  imagePublicId?: string | null
  imageWidth?: number | null
  imageHeight?: number | null
  linkUrl?: string | null
  linkLabel?: string | null
  postedBy: string
  role: string
  isActive: boolean
  isPinned: boolean
  createdAt: string
}

export default function AdminAnnouncementsPage() {
  const { data, loading, refresh } = useCachedFetch<Announcement[]>('/api/announcements')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Announcement | null>(null)
  const announcements = data ?? []

  const toggle = async (id: string, field: 'isActive' | 'isPinned', current: boolean) => {
    await apiJson(`/api/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ [field]: !current }),
    })
    refresh()
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this announcement permanently?')) return
    await apiJson(`/api/announcements/${id}`, { method: 'DELETE' })
    refresh()
  }

  return (
    <div className="max-w-5xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-dm-serif)' }}>
          Announcements
        </h1>
        <button
          type="button"
          onClick={() => {
            setEditItem(null)
            setShowForm((v) => !v)
          }}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Close' : 'New Announcement'}
        </button>
      </div>

      {showForm ? (
        <AdminAnnouncementForm
          editData={
            editItem
              ? {
                  id: editItem.id,
                  title: editItem.title,
                  description: editItem.description,
                  imageUrl: editItem.imageUrl ?? null,
                  imagePublicId: editItem.imagePublicId ?? null,
                  imageWidth: editItem.imageWidth ?? null,
                  imageHeight: editItem.imageHeight ?? null,
                  linkUrl: editItem.linkUrl ?? '',
                  linkLabel: editItem.linkLabel ?? '',
                  isPinned: editItem.isPinned,
                }
              : undefined
          }
          onSuccess={() => {
            setEditItem(null)
            setShowForm(false)
            refresh()
          }}
        />
      ) : null}

      <div className="grid gap-4">
        {loading ? <div>Loading...</div> : null}
        {!loading && announcements.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--text-secondary)]">
            No announcements created yet.
          </div>
        ) : null}
        {announcements.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow)]">
            <div className="flex items-start gap-4">
              <div className="relative h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.title} fill className="object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-[var(--text-muted)]">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {item.isPinned ? (
                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-amber-700 border-amber-200 bg-amber-50">
                      <Pin size={12} /> Pinned
                    </span>
                  ) : null}
                  <span className="text-xs text-[var(--text-muted)]">
                    {item.role} • {item.postedBy}
                  </span>
                </div>
                {!item.isActive ? (
                  <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-slate-600 border-slate-200 bg-slate-50">
                    Draft
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-dm-serif)' }}>
                  {item.title}
                </h3>
                <SafeHtml html={item.description} className="prose prose-sm max-w-none text-[var(--text-secondary)]" />
                {item.linkUrl ? (
                  <a className="text-xs text-[var(--brand)] underline" href={item.linkUrl} target="_blank" rel="noreferrer">
                    {item.linkLabel ?? 'Open link'}
                  </a>
                ) : null}
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => toggle(item.id, 'isActive', item.isActive)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                >
                  {item.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                  {item.isActive ? 'Visible' : 'Hidden'}
                </button>
                <button
                  type="button"
                  onClick={() => toggle(item.id, 'isPinned', item.isPinned)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                >
                  {item.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {item.isPinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditItem(item)
                    setShowForm(true)
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] px-3 py-1 text-xs"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.id)}
                  className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1 text-xs text-red-600"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
