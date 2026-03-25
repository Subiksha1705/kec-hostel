'use client'

import { useEffect, useState } from 'react'
import { apiJson } from '@/lib/api/client'

type FormState = {
  title: string
  description: string
  imageUrl: string
  linkUrl: string
  linkLabel: string
  postedBy: string
  role: string
}

const emptyForm: FormState = {
  title: '',
  description: '',
  imageUrl: '',
  linkUrl: '',
  linkLabel: '',
  postedBy: '',
  role: 'Admin',
}

export default function AdminAnnouncementForm() {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(timer)
  }, [success])

  const update = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!form.title.trim() || !form.description.trim() || !form.postedBy.trim() || !form.role.trim()) {
      setError('Title, description, posted by, and role are required.')
      return
    }

    setLoading(true)
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>('/api/announcements', {
      method: 'POST',
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim() || undefined,
        linkUrl: form.linkUrl.trim() || undefined,
        linkLabel: form.linkLabel.trim() || undefined,
        postedBy: form.postedBy.trim(),
        role: form.role.trim(),
      }),
    })

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Failed to create announcement.')
      setLoading(false)
      return
    }

    setForm(emptyForm)
    setSuccess('Announcement posted successfully.')
    setLoading(false)
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]"
    >
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold">Title</label>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            value={form.title}
            onChange={(event) => update('title', event.target.value)}
            placeholder="Announcement title"
            required
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Description</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            rows={3}
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Write the announcement details"
            required
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Poster Image URL</label>
          <input
            type="url"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            value={form.imageUrl}
            onChange={(event) => update('imageUrl', event.target.value)}
            placeholder="https://..."
          />
        </div>

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
          <label className="text-sm font-semibold">Link Button Label</label>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            value={form.linkLabel}
            onChange={(event) => update('linkLabel', event.target.value)}
            placeholder="Learn More"
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Posted By</label>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            value={form.postedBy}
            onChange={(event) => update('postedBy', event.target.value)}
            placeholder="Name"
            required
          />
        </div>

        <div>
          <label className="text-sm font-semibold">Role</label>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            value={form.role}
            onChange={(event) => update('role', event.target.value)}
            required
          >
            <option>Admin</option>
            <option>Chief Warden</option>
            <option>Warden</option>
            <option>Hostel Staff</option>
            <option>Staff</option>
          </select>
        </div>
      </div>

      {success ? (
        <div className="mt-4 rounded-lg border border-[var(--success-border)] bg-[var(--success)] px-3 py-2 text-sm text-[var(--success-text)]">
          {success}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-[var(--error-border)] bg-[var(--error)] px-3 py-2 text-sm text-[var(--error-text)]">
          <span>{error}</span>
          <button type="button" className="text-xs font-semibold" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {loading ? 'Posting...' : 'Post Announcement'}
      </button>
    </form>
  )
}
