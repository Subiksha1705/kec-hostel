# Full Announcements Implementation Guide
## KEC Hostel — Rich Editor + Cloudinary Image Upload

---

## Overview

This guide upgrades the existing announcements system with:

- **Rich text editor** (Tiptap) for description — bold, italic, lists, links, etc.
- **Cloudinary image upload** with direct browser-to-cloud upload (fast, no server relay)
- **Admin**: Create, edit, delete, toggle active/inactive announcements
- **Student**: Full announcement detail view (not just the carousel), rendered rich HTML
- **API**: PATCH (edit) + DELETE endpoints added alongside existing GET/POST

---

## 1. Install Dependencies

```bash
# Rich text editor (Tiptap)
yarn add @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-link @tiptap/extension-placeholder \
  @tiptap/extension-underline @tiptap/extension-text-align \
  @tiptap/extension-image

# Cloudinary upload widget (unsigned uploads)
yarn add next-cloudinary

# DOMPurify for safe HTML rendering on student side
yarn add dompurify
yarn add -D @types/dompurify
```

---

## 2. Environment Variables

Add to `.env.local`:

```env
# Cloudinary — get these from your Cloudinary dashboard
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=kec_hostel_announcements
```

> **Setup in Cloudinary Dashboard:**
> 1. Settings → Upload → Upload Presets → Add Upload Preset
> 2. Set signing mode to **Unsigned**
> 3. Name it `kec_hostel_announcements`
> 4. Under Folder, set `kec-hostel/announcements`
> 5. Optional: enable eager transformations `f_auto,q_auto,w_1200` for fast delivery

---

## 3. Prisma Schema Update

In `prisma/schema.prisma`, update the `Announcement` model to support rich HTML descriptions:

```prisma
model Announcement {
  id              String   @id @default(cuid())
  title           String
  description     String   @db.Text   // ← change from plain String to Text for HTML content
  imageUrl        String?
  imagePublicId   String?             // ← NEW: store Cloudinary public_id for deletion
  linkUrl         String?
  linkLabel       String?
  postedBy        String
  role            String
  isActive        Boolean  @default(true)
  isPinned        Boolean  @default(false)   // ← NEW: pin important announcements
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([isActive, createdAt])
  @@index([isPinned, createdAt])
}
```

Run migration:

```bash
yarn prisma migrate dev --name add-rich-announcements
```

---

## 4. API Routes

### 4a. Update `app/api/announcements/route.ts`

```typescript
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),           // HTML from Tiptap
  imageUrl: z.string().url().optional().nullable(),
  imagePublicId: z.string().optional().nullable(),
  linkUrl: z.string().url().optional().nullable(),
  linkLabel: z.string().min(1).optional().nullable(),
  postedBy: z.string().min(1),
  role: z.string().min(1),
  isPinned: z.boolean().optional().default(false),
})

// GET /api/announcements
export async function GET(req: NextRequest) {
  try {
    getSession(req)
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: [
        { isPinned: 'desc' },    // pinned first
        { createdAt: 'desc' },
      ],
    })
    return ok(announcements)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

// POST /api/announcements
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!['ADMIN', 'MEMBER', 'SUPER'].includes(session.type)) {
      return err('Forbidden', 403)
    }
    const raw = await req.json()
    const body = createSchema.parse({
      ...raw,
      imageUrl: raw.imageUrl || null,
      imagePublicId: raw.imagePublicId || null,
      linkUrl: raw.linkUrl || null,
      linkLabel: raw.linkLabel || null,
    })
    const announcement = await prisma.announcement.create({ data: body })
    return ok(announcement, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
```

### 4b. Create `app/api/announcements/[id]/route.ts`

```typescript
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  imageUrl: z.string().url().optional().nullable(),
  imagePublicId: z.string().optional().nullable(),
  linkUrl: z.string().url().optional().nullable(),
  linkLabel: z.string().optional().nullable(),
  postedBy: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  isPinned: z.boolean().optional(),
})

// PATCH /api/announcements/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSession(req)
    if (!['ADMIN', 'MEMBER', 'SUPER'].includes(session.type)) {
      return err('Forbidden', 403)
    }
    const raw = await req.json()
    const body = updateSchema.parse(raw)
    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data: body,
    })
    return ok(announcement)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

// DELETE /api/announcements/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSession(req)
    if (!['ADMIN', 'MEMBER', 'SUPER'].includes(session.type)) {
      return err('Forbidden', 403)
    }
    await prisma.announcement.delete({ where: { id: params.id } })
    return ok({ deleted: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
```

---

## 5. Cloudinary Upload Hook

Create `lib/hooks/useCloudinaryUpload.ts`:

```typescript
'use client'

import { useState, useCallback } from 'react'

interface UploadResult {
  url: string
  publicId: string
  width: number
  height: number
}

interface UseCloudinaryUpload {
  uploading: boolean
  uploadError: string | null
  upload: (file: File) => Promise<UploadResult | null>
}

export function useCloudinaryUpload(): UseCloudinaryUpload {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const upload = useCallback(async (file: File): Promise<UploadResult | null> => {
    setUploading(true)
    setUploadError(null)

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

      if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary not configured. Check .env.local')
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)
      // Apply auto-format + auto-quality + resize for fast delivery
      formData.append('eager', 'f_auto,q_auto,w_1200')
      formData.append('folder', 'kec-hostel/announcements')

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: 'POST', body: formData }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message ?? 'Upload failed')
      }

      const data = await response.json()

      return {
        // Use f_auto,q_auto URL for fastest delivery
        url: data.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_1200/'),
        publicId: data.public_id,
        width: data.width,
        height: data.height,
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  return { uploading, uploadError, upload }
}
```

---

## 6. Rich Text Editor Component

Create `components/announcements/RichEditor.tsx`:

```tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Link as LinkIcon, AlignLeft, AlignCenter, AlignRight, Heading2,
} from 'lucide-react'
import { useEffect } from 'react'

interface Props {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function RichEditor({ value, onChange, placeholder }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-blue-600 underline' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write announcement details...' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-[160px] focus:outline-none px-3 py-2',
      },
    },
  })

  // Sync external value changes (e.g., reset form)
  useEffect(() => {
    if (editor && value === '') {
      editor.commands.clearContent()
    }
  }, [value, editor])

  if (!editor) return null

  const btn = (active: boolean) =>
    `p-1.5 rounded text-sm transition-colors ${
      active
        ? 'bg-[var(--brand)] text-white'
        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-2)]'
    }`

  const addLink = () => {
    const url = window.prompt('Enter URL')
    if (!url) return
    editor.chain().focus().setLink({ href: url }).run()
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-0.5 border-b border-[var(--border)] bg-[var(--surface-2)] px-2 py-1.5">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className={btn(editor.isActive('bold'))}><Bold size={14} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btn(editor.isActive('italic'))}><Italic size={14} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btn(editor.isActive('underline'))}><UnderlineIcon size={14} /></button>

        <div className="w-px h-5 bg-[var(--border)] mx-1 self-center" />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btn(editor.isActive('heading', { level: 2 }))}><Heading2 size={14} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btn(editor.isActive('bulletList'))}><List size={14} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btn(editor.isActive('orderedList'))}><ListOrdered size={14} /></button>

        <div className="w-px h-5 bg-[var(--border)] mx-1 self-center" />

        <button type="button" onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={btn(editor.isActive({ textAlign: 'left' }))}><AlignLeft size={14} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={btn(editor.isActive({ textAlign: 'center' }))}><AlignCenter size={14} /></button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={btn(editor.isActive({ textAlign: 'right' }))}><AlignRight size={14} /></button>

        <div className="w-px h-5 bg-[var(--border)] mx-1 self-center" />

        <button type="button" onClick={addLink}
          className={btn(editor.isActive('link'))}><LinkIcon size={14} /></button>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  )
}
```

---

## 7. Cloudinary Image Upload Component

Create `components/announcements/CloudinaryImageUpload.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { useCloudinaryUpload } from '@/lib/hooks/useCloudinaryUpload'

interface Props {
  value: string | null
  publicId: string | null
  onChange: (url: string | null, publicId: string | null) => void
}

export default function CloudinaryImageUpload({ value, onChange }: Props) {
  const { uploading, uploadError, upload } = useCloudinaryUpload()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const result = await upload(file)
    if (result) onChange(result.url, result.publicId)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-[var(--surface-2)]">
          <div className="relative h-40 w-full">
            <Image src={value} alt="Announcement image" fill className="object-cover" unoptimized />
          </div>
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className="absolute top-2 right-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
          >
            <X size={14} />
          </button>
          <p className="px-3 py-1.5 text-xs text-[var(--text-muted)] truncate">{value}</p>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors h-32 ${
            dragOver
              ? 'border-[var(--brand)] bg-blue-50'
              : 'border-[var(--border)] hover:border-[var(--brand)] bg-[var(--surface-2)]'
          }`}
        >
          {uploading ? (
            <><Loader2 size={20} className="animate-spin text-[var(--brand)]" />
            <p className="text-xs text-[var(--text-secondary)]">Uploading to Cloudinary...</p></>
          ) : (
            <><ImageIcon size={20} className="text-[var(--text-muted)]" />
            <p className="text-xs text-[var(--text-secondary)]">
              Drop image or <span className="text-[var(--brand)] font-semibold">browse</span>
            </p>
            <p className="text-xs text-[var(--text-muted)]">JPG, PNG, WebP · Max 10MB</p></>
          )}
        </div>
      )}

      {uploadError && (
        <p className="text-xs text-red-600">{uploadError}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
```

---

## 8. Admin Announcement Form (Full Replacement)

Replace `components/announcements/AdminAnnouncementForm.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import RichEditor from './RichEditor'
import CloudinaryImageUpload from './CloudinaryImageUpload'
import { Pin } from 'lucide-react'

type FormState = {
  title: string
  description: string        // HTML from Tiptap
  imageUrl: string | null
  imagePublicId: string | null
  linkUrl: string
  linkLabel: string
  postedBy: string
  role: string
  isPinned: boolean
}

const emptyForm: FormState = {
  title: '',
  description: '',
  imageUrl: null,
  imagePublicId: null,
  linkUrl: '',
  linkLabel: '',
  postedBy: '',
  role: 'Admin',
  isPinned: false,
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

  const isEdit = !!editData?.id

  useEffect(() => {
    if (!success) return
    const timer = setTimeout(() => setSuccess(null), 3000)
    return () => clearTimeout(timer)
  }, [success])

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const plainText = form.description.replace(/<[^>]+>/g, '').trim()
    if (!form.title.trim() || !plainText || !form.postedBy.trim()) {
      setError('Title, description, and posted by are required.')
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
        linkUrl: form.linkUrl.trim() || null,
        linkLabel: form.linkLabel.trim() || null,
        postedBy: form.postedBy.trim(),
        role: form.role.trim(),
        isPinned: form.isPinned,
      }),
    })

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Failed to save announcement.')
      setLoading(false)
      return
    }

    if (!isEdit) setForm(emptyForm)
    setSuccess(isEdit ? 'Announcement updated.' : 'Announcement posted successfully.')
    setLoading(false)
    onSuccess?.()
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] space-y-4"
    >
      <h2 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-dm-serif)' }}>
        {isEdit ? 'Edit Announcement' : 'New Announcement'}
      </h2>

      {/* Title */}
      <div>
        <label className="text-sm font-semibold">Title *</label>
        <input
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Announcement title"
          maxLength={200}
          required
        />
      </div>

      {/* Description — Rich Editor */}
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

      {/* Poster Image — Cloudinary */}
      <div>
        <label className="text-sm font-semibold">Poster Image</label>
        <p className="text-xs text-[var(--text-muted)] mb-1">Uploaded to Cloudinary — served with auto-optimisation (f_auto, q_auto)</p>
        <CloudinaryImageUpload
          value={form.imageUrl}
          publicId={form.imagePublicId}
          onChange={(url, publicId) => {
            update('imageUrl', url)
            update('imagePublicId', publicId)
          }}
        />
      </div>

      {/* Link */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold">Link URL</label>
          <input
            type="url"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            value={form.linkUrl}
            onChange={(e) => update('linkUrl', e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Button Label</label>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            value={form.linkLabel}
            onChange={(e) => update('linkLabel', e.target.value)}
            placeholder="Learn More"
          />
        </div>
      </div>

      {/* Posted By + Role */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-semibold">Posted By *</label>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            value={form.postedBy}
            onChange={(e) => update('postedBy', e.target.value)}
            placeholder="Name"
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Role</label>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
          >
            <option>Admin</option>
            <option>Chief Warden</option>
            <option>Warden</option>
            <option>Hostel Staff</option>
            <option>Staff</option>
          </select>
        </div>
      </div>

      {/* Pin toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.isPinned}
          onChange={(e) => update('isPinned', e.target.checked)}
          className="rounded border-[var(--border)]"
        />
        <Pin size={14} className="text-[var(--text-secondary)]" />
        <span className="text-sm">Pin this announcement (shows first)</span>
      </label>

      {/* Feedback */}
      {success && (
        <div className="rounded-lg border border-[var(--success-border)] bg-[var(--success)] px-3 py-2 text-sm text-[var(--success-text)]">
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-[var(--error-border)] bg-[var(--error)] px-3 py-2 text-sm text-[var(--error-text)]">
          <span>{error}</span>
          <button type="button" className="text-xs font-semibold" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full bg-[var(--brand)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)] disabled:opacity-60"
      >
        {loading ? 'Saving...' : isEdit ? 'Update Announcement' : 'Post Announcement'}
      </button>
    </form>
  )
}
```

---

## 9. Admin Announcements List Page

Replace `app/admin/announcements/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useCachedFetch } from '@/lib/cache'
import AdminAnnouncementForm from '@/components/announcements/AdminAnnouncementForm'
import { apiJson } from '@/lib/api/client'
import Image from 'next/image'
import { Pencil, Trash2, Pin, PinOff, Eye, EyeOff, Plus, X } from 'lucide-react'

type Announcement = {
  id: string
  title: string
  description: string
  imageUrl?: string | null
  imagePublicId?: string | null
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
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-dm-serif)' }}>
          Announcements
        </h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditItem(null) }}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
        >
          {showForm ? <><X size={14} /> Close</> : <><Plus size={14} /> New</>}
        </button>
      </div>

      {/* Create form */}
      {showForm && !editItem && (
        <AdminAnnouncementForm onSuccess={() => { setShowForm(false); refresh() }} />
      )}

      {/* Edit form */}
      {editItem && (
        <AdminAnnouncementForm
          editData={editItem}
          onSuccess={() => { setEditItem(null); refresh() }}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-[var(--text-muted)]">Loading...</div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`rounded-2xl border bg-[var(--surface)] p-4 shadow-[var(--shadow)] flex gap-4 ${
                !a.isActive ? 'opacity-50' : ''
              }`}
            >
              {/* Thumbnail */}
              {a.imageUrl && (
                <div className="relative h-16 w-24 rounded-lg overflow-hidden shrink-0 bg-[var(--surface-2)]">
                  <Image src={a.imageUrl} alt={a.title} fill className="object-cover" unoptimized />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {a.isPinned && <Pin size={12} className="text-[var(--brand)]" />}
                      <h3 className="font-semibold text-sm truncate">{a.title}</h3>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {a.postedBy} · {a.role} · {new Date(a.createdAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggle(a.id, 'isPinned', a.isPinned)}
                      title={a.isPinned ? 'Unpin' : 'Pin'}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                    >
                      {a.isPinned ? <PinOff size={14} /> : <Pin size={14} />}
                    </button>
                    <button
                      onClick={() => toggle(a.id, 'isActive', a.isActive)}
                      title={a.isActive ? 'Hide' : 'Show'}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                    >
                      {a.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => { setEditItem(a); setShowForm(false); window.scrollTo(0, 0) }}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {announcements.length === 0 && (
            <div className="text-center py-12 text-[var(--text-muted)]">No announcements yet.</div>
          )}
        </div>
      )}
    </div>
  )
}
```

---

## 10. Student — Rich HTML Announcement Detail

Create `components/announcements/AnnouncementDetail.tsx`:

```tsx
'use client'

import { useEffect, useRef } from 'react'
import DOMPurify from 'dompurify'
import Image from 'next/image'
import { X, Link as LinkIcon, Pin } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  description: string
  imageUrl?: string | null
  linkUrl?: string | null
  linkLabel?: string | null
  postedBy: string
  role: string
  isPinned?: boolean
  createdAt: string
}

interface Props {
  announcement: Announcement
  onClose: () => void
}

export default function AnnouncementDetail({ announcement, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Sanitize HTML (DOMPurify)
  const safeHtml = typeof window !== 'undefined'
    ? DOMPurify.sanitize(announcement.description, {
        ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 's', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'br'],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
      })
    : announcement.description

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl bg-[var(--surface)] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Image */}
        {announcement.imageUrl && (
          <div className="relative h-52 w-full shrink-0">
            <Image
              src={announcement.imageUrl}
              alt={announcement.title}
              fill
              className="object-cover"
              unoptimized
              priority
            />
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                {announcement.isPinned && <Pin size={12} className="text-[var(--brand)]" />}
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--brand)]">
                  {announcement.role}
                </span>
              </div>
              <h2
                className="text-xl font-bold mt-1"
                style={{ fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}
              >
                {announcement.title}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                👤 {announcement.postedBy} · 📅{' '}
                {new Date(announcement.createdAt).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 rounded-full p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
            >
              <X size={18} />
            </button>
          </div>

          {/* Rich HTML description */}
          <div
            className="prose prose-sm max-w-none text-[var(--text-primary)]"
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />

          {/* CTA Link */}
          {announcement.linkUrl && (
            <a
              href={announcement.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-dark)]"
            >
              <LinkIcon size={14} />
              {announcement.linkLabel ?? 'Learn More'}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 11. Update AnnouncementsCarousel — Add "Read More" Button

In `components/announcements/AnnouncementsCarousel.tsx`, add the detail modal trigger.

Add at the top of the file:
```tsx
import AnnouncementDetail from './AnnouncementDetail'
```

Add state inside the component:
```tsx
const [selected, setSelected] = useState<Announcement | null>(null)
```

Add a "Read More" button inside the slide content area (after the description `<p>`):
```tsx
<button
  onClick={() => setSelected(activeAnnouncement)}
  className="mt-2 text-xs font-semibold text-[var(--brand)] hover:underline"
>
  Read more →
</button>
```

Add the modal at the bottom of the JSX return (before the closing `</div>`):
```tsx
{selected && (
  <AnnouncementDetail
    announcement={selected}
    onClose={() => setSelected(null)}
  />
)}
```

---

## 12. Tailwind Prose Plugin (for rich text rendering)

In `tailwind.config.ts`, add:

```ts
import typography from '@tailwindcss/typography'

export default {
  // ...existing config
  plugins: [typography],
}
```

Install:
```bash
yarn add -D @tailwindcss/typography
```

---

## 13. Next.js Image Config (Cloudinary domain)

In `next.config.ts`:

```ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
}
export default nextConfig
```

---

## 14. File Summary

| File | Action |
|---|---|
| `prisma/schema.prisma` | Add `imagePublicId`, `isPinned`, change description to `@db.Text` |
| `app/api/announcements/route.ts` | Add `imagePublicId`, `isPinned` to schema + ordering |
| `app/api/announcements/[id]/route.ts` | **NEW** — PATCH + DELETE |
| `lib/hooks/useCloudinaryUpload.ts` | **NEW** — Cloudinary direct upload hook |
| `components/announcements/RichEditor.tsx` | **NEW** — Tiptap rich editor |
| `components/announcements/CloudinaryImageUpload.tsx` | **NEW** — Drag & drop upload UI |
| `components/announcements/AdminAnnouncementForm.tsx` | **REPLACE** — rich editor + Cloudinary |
| `components/announcements/AnnouncementDetail.tsx` | **NEW** — student detail modal with safe HTML |
| `components/announcements/AnnouncementsCarousel.tsx` | **UPDATE** — add "Read more" + modal |
| `app/admin/announcements/page.tsx` | **REPLACE** — full list with edit/delete/pin/hide |
| `next.config.ts` | Add Cloudinary remote pattern |
| `tailwind.config.ts` | Add `@tailwindcss/typography` plugin |
| `.env.local` | Add `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` + `UPLOAD_PRESET` |

---

## 15. Why This Stack

| Choice | Reason |
|---|---|
| **Tiptap** | Headless rich editor built on ProseMirror — works perfectly with Next.js 14 App Router, no SSR issues, full TypeScript support |
| **Cloudinary unsigned upload** | Images go directly from browser → Cloudinary CDN — zero server load, auto-format (`f_auto`), auto-quality (`q_auto`), resize at edge. Result URLs are globally cached CDN URLs — loads fast on any device |
| **DOMPurify** | Strips XSS from stored HTML before rendering in student view — safe `dangerouslySetInnerHTML` |
| **`@tailwindcss/typography`** | One `prose` class makes Tiptap HTML look great without custom CSS |
