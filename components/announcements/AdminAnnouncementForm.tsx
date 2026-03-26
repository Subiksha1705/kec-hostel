'use client'

import { useEffect, useState } from 'react'
import { Pin } from 'lucide-react'
import { apiJson } from '@/lib/api/client'
import RichEditor from './RichEditor'
import CloudinaryImageUpload from './CloudinaryImageUpload'

type FormState = {
  title: string
  description: string
  imageUrl: string | null
  imagePublicId: string | null
  imageWidth: number | null
  imageHeight: number | null
  linkUrl: string
  linkLabel: string
  isPinned: boolean
  isActive: boolean
}

const emptyForm: FormState = {
  title: '',
  description: '',
  imageUrl: null,
  imagePublicId: null,
  imageWidth: 720,
  imageHeight: 240,
  linkUrl: '',
  linkLabel: '',
  isPinned: false,
  isActive: true,
}

interface Props {
  editData?: Partial<FormState> & { id?: string }
  onSuccess?: () => void
}

export default function AdminAnnouncementForm({ editData, onSuccess }: Props) {
  const [form, setForm] = useState<FormState>({ ...emptyForm, ...editData })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [posterLabel, setPosterLabel] = useState('Admin')

  const isEdit = !!editData?.id

  useEffect(() => {
    setForm({ ...emptyForm, ...editData })
  }, [editData])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const name = localStorage.getItem('userName') || 'Admin'
    const roleName = localStorage.getItem('userRoleName')
    const type = localStorage.getItem('userType')
    const roleLabel = type === 'SUPER' ? 'Super Admin' : roleName || 'Admin'
    setPosterLabel(`${name} • ${roleLabel}`)
  }, [])
  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(timer)
  }, [success])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async (
    event: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
    mode: 'publish' | 'draft'
  ) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const plainText = form.description.replace(/<[^>]+>/g, '').trim()
    if (!form.title.trim() || !plainText) {
      setError('Title and description are required.')
      return
    }

    setLoading(true)

    const url = isEdit ? `/api/announcements/${editData!.id}` : '/api/announcements'
    const method = isEdit ? 'PATCH' : 'POST'

    const { res, data } = await apiJson<{ ok: boolean; error?: string }>(url, {
      method,
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description,
        imageUrl: form.imageUrl || null,
        imagePublicId: form.imagePublicId || null,
        imageWidth: form.imageWidth || null,
        imageHeight: form.imageHeight || null,
        linkUrl: form.linkUrl.trim() || null,
        linkLabel: form.linkLabel.trim() || null,
        isPinned: form.isPinned,
        isActive: mode === 'publish',
      }),
    })

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Failed to save announcement.')
      setLoading(false)
      return
    }

    if (!isEdit) setForm(emptyForm)
    setSuccess(
      mode === 'draft'
        ? 'Announcement saved as draft.'
        : isEdit
          ? 'Announcement updated.'
          : 'Announcement posted successfully.'
    )
    setLoading(false)
    onSuccess?.()
  }

  return (
    <form
      onSubmit={(event) => submit(event, 'publish')}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] space-y-4"
    >
      <h2 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-dm-serif)' }}>
        {isEdit ? 'Edit Announcement' : 'New Announcement'}
      </h2>

      <div>
        <label className="text-sm font-semibold">Title *</label>
        <input
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          value={form.title}
          onChange={(event) => update('title', event.target.value)}
          placeholder="Announcement title"
          maxLength={200}
          required
        />
      </div>

      <div>
        <label className="text-sm font-semibold">Description *</label>
        <div className="mt-1">
          <RichEditor
            value={form.description}
            onChange={(html) => update('description', html)}
            placeholder="Write the announcement details..."
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm">
        <span className="text-[var(--text-secondary)]">Posting as:</span>{' '}
        <span className="font-semibold">{posterLabel}</span>
      </div>

      <div>
        <label className="text-sm font-semibold">Poster Image</label>
        <p className="text-xs text-[var(--text-muted)] mb-1">
          Uploaded to Cloudinary. Served with auto-optimisation (f_auto, q_auto).
        </p>
        <CloudinaryImageUpload
          value={form.imageUrl}
          publicId={form.imagePublicId}
          onChange={(url, publicId) => {
            update('imageUrl', url)
            update('imagePublicId', publicId)
          }}
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold">Image Width (px)</label>
            <input
              type="number"
              min={200}
              max={1400}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={form.imageWidth ?? ''}
              onChange={(event) => {
                const value = event.target.value ? Number(event.target.value) : null
                update('imageWidth', value)
              }}
              placeholder="720"
            />
          </div>
          <div>
            <label className="text-xs font-semibold">Image Height (px)</label>
            <input
              type="number"
              min={120}
              max={900}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
              value={form.imageHeight ?? ''}
              onChange={(event) => {
                const value = event.target.value ? Number(event.target.value) : null
                update('imageHeight', value)
              }}
              placeholder="240"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold">Link URL</label>
          <input
            type="url"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            value={form.linkUrl}
            onChange={(event) => update('linkUrl', event.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Button Label</label>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            value={form.linkLabel}
            onChange={(event) => update('linkLabel', event.target.value)}
            placeholder="Learn More"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isPinned}
          onChange={(event) => update('isPinned', event.target.checked)}
          className="rounded border-[var(--border)]"
        />
        <Pin size={14} className="text-[var(--text-secondary)]" />
        <span className="text-sm">Pin this announcement (shows first)</span>
      </label>

      {success && (
        <div className="rounded-lg border border-[var(--success-border)] bg-[var(--success)] px-3 py-2 text-sm text-[var(--success-text)]">
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--error-border)] bg-[var(--error)] px-3 py-2 text-sm text-[var(--error-text)]">
          <span>{error}</span>
          <button type="button" className="text-xs font-semibold" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={(event) => submit(event, 'draft')}
          className="inline-flex items-center justify-center rounded-full border border-[var(--border)] px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Draft'}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
        >
          {loading ? 'Saving...' : isEdit ? 'Update & Publish' : 'Post Announcement'}
        </button>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
        <div className="text-sm font-semibold">Preview</div>
        {form.imageUrl ? (
          <div
            style={{
              width: form.imageWidth ? `${form.imageWidth}px` : '100%',
              maxWidth: '100%',
              height: form.imageHeight ? `${form.imageHeight}px` : '200px',
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.imageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : null}
        <div className="text-xs text-[var(--text-muted)]">{posterLabel}</div>
        <div className="text-lg font-semibold" style={{ fontFamily: 'var(--font-dm-serif)' }}>
          {form.title || 'Announcement title'}
        </div>
        <div className="prose prose-sm max-w-none text-[var(--text-secondary)]">
          {/* eslint-disable-next-line react/no-danger */}
          <div dangerouslySetInnerHTML={{ __html: form.description || '<p>Announcement details...</p>' }} />
        </div>
        {form.linkUrl ? (
          <a className="text-xs text-[var(--brand)] underline" href={form.linkUrl} target="_blank" rel="noreferrer">
            {form.linkLabel || 'Open link'}
          </a>
        ) : null}
      </div>
    </form>
  )
}
