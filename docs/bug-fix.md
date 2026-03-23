# Nyroverve — Bug Fixes & Production Hardening

> **Repo:** `https://github.com/Subiksha1705/kec-hostel.git`  
> Every fix below is based on reading the actual current code after the latest pull.

---

## Fix 1 — College name search is already case-insensitive (no change needed here)

`app/api/colleges/search/route.ts` already uses `mode: 'insensitive'` on Prisma. The issue is actually on the **login page** — after a college is selected and the user clears the input to retype, `selectedCollege` stays set while `query` changes, so the old collegeId is sent silently.

**`app/(auth)/login/page.tsx` — ensure clearing input resets selection:**
```tsx
// In the input onChange handler, replace with:
onChange={(e) => {
  setQuery(e.target.value)
  setDropdownOpen(true)
  // If user edits after selecting, clear the selection so stale collegeId is not sent
  if (selectedCollege && e.target.value !== selectedCollege.name) {
    setSelectedCollege(null)
  }
}}
```

Also add a clear button next to the input when a college is selected:
```tsx
// Wrap the input in a relative div and add an ✕ button:
<div style={{ position: 'relative' }}>
  <input ... />
  {selectedCollege && (
    <button
      type="button"
      onClick={() => { setSelectedCollege(null); setQuery(''); setColleges([]); }}
      style={{
        position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-secondary)', fontSize: '16px', lineHeight: 1,
      }}
    >
      ✕
    </button>
  )}
  {/* dropdown */}
</div>
```

---

## Fix 2 — POST /api/students 400 "Invalid request body"

### Root cause
The Zod schema in `app/api/students/route.ts` requires `classId` and `hostelId` to be `.uuid()` when provided. But the frontend sends an **empty string `""`** when no class/hostel is selected (from the `<select>` default value `""`). Zod rejects `""` as an invalid UUID → 400.

The `createSchema` currently:
```ts
classId: z.string().uuid().optional(),   // "" fails uuid() validation
hostelId: z.string().uuid().optional(),  // "" fails uuid() validation
```

### Fix — `app/api/students/route.ts`

Replace the schema definition:
```ts
// REPLACE createSchema with:
const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  rollNumber: z.string().min(1),
  classId: z.string().uuid().optional().nullable(),
  hostelId: z.string().uuid().optional().nullable(),
})
```

And in the POST handler, coerce empty strings to null before parsing:
```ts
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const raw = await req.json()
    // Coerce empty strings to null so Zod uuid() validation passes
    const body = createSchema.parse({
      ...raw,
      classId: raw.classId || null,
      hostelId: raw.hostelId || null,
    })
    // ... rest unchanged
  }
}
```

Also apply the **same fix to `app/api/members/route.ts`** POST handler — same bug with `classId`/`hostelId` as empty strings from the select dropdowns:
```ts
// In members POST, same pattern:
const raw = await req.json()
const body = createSchema.parse({
  ...raw,
  classId: raw.classId || null,
  hostelId: raw.hostelId || null,
})
```

And the `updateSchema` in `app/api/students/[id]/route.ts`:
```ts
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  rollNumber: z.string().min(1).optional(),
  classId: z.string().uuid().nullable().optional(),
  hostelId: z.string().uuid().nullable().optional(),
})
// In PUT handler:
const raw = await req.json()
const body = updateSchema.parse({
  ...raw,
  classId: raw.classId || null,
  hostelId: raw.hostelId || null,
})
```

---

## Fix 3 — Sidebar profile overflowing

### Root cause
The sidebar `<aside>` has `gap: '18px'` and `padding: '24px 16px'`. The nav items + profile card together exceed 100vh on smaller screens. The profile card uses `marginTop: 'auto'` which works only if the flex container has a bounded height. The `<aside>` currently has `minHeight: '100vh'` but no `height: '100vh'` + `overflow: hidden`, so it grows and the bottom card spills.

### Fix — `components/layout/Sidebar.tsx`

```tsx
// CHANGE the <aside> style from:
style={{
  width: '220px',
  background: 'var(--surface)',
  borderRight: '1px solid var(--border)',
  padding: '24px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
}}

// TO:
style={{
  width: '220px',
  minWidth: '220px',
  height: '100vh',
  position: 'sticky',
  top: 0,
  background: 'var(--surface)',
  borderRight: '1px solid var(--border)',
  padding: '24px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '18px',
  overflowY: 'auto',
  overflowX: 'hidden',
  boxSizing: 'border-box',
}}
```

Also fix the nav section so long nav lists don't push the profile out:
```tsx
// CHANGE the <nav> style to add flex: 1 and overflow:
<nav style={{
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  flex: 1,
  overflowY: 'auto',
  minHeight: 0,   // critical: allows flex child to shrink below content size
}}>
```

And the profile section at the bottom — ensure it never shrinks:
```tsx
// CHANGE the bottom div wrapper:
<div style={{ marginTop: 'auto', position: 'relative', flexShrink: 0 }}>
```

Also fix the username truncation — long names overflow the card:
```tsx
// CHANGE username display:
<div style={{
  fontWeight: 600,
  color: 'var(--text-primary)',
  fontSize: '13px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}}>
  {userName}
</div>
<div style={{
  color: 'var(--text-secondary)',
  fontSize: '12px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}}>
  {roleLabel}
</div>
```

---

## Fix 4 — Toast system: show proper errors, success on create, confirm on delete, email domain check

### Fix 4a — Upgrade `components/ui/Toast.tsx` to support a message queue

The current Toast only supports one message at a time. Replace it with a self-contained queue:

```tsx
// components/ui/Toast.tsx — replace entire file
'use client'

import { useEffect, useState } from 'react'

export type ToastItem = {
  id: number
  message: string
  variant: 'success' | 'error' | 'info'
}

type Props = {
  message: string
  variant?: 'success' | 'error' | 'info'
  onClose: () => void
}

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const COLORS = {
  success: { bg: 'var(--mint)', color: '#1a5c3a', border: '#6bc49a' },
  error:   { bg: 'var(--rose)', color: '#7a2020', border: '#d88888' },
  info:    { bg: 'var(--sky)',  color: '#1a3a5c', border: '#88b8d8' },
}

export default function Toast({ message, variant = 'success', onClose }: Props) {
  const [visible, setVisible] = useState(true)
  const c = COLORS[variant]

  useEffect(() => {
    const hide = setTimeout(() => setVisible(false), 3200)
    const close = setTimeout(() => onClose(), 3500)
    return () => { clearTimeout(hide); clearTimeout(close) }
  }, [onClose])

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: c.bg,
      color: c.color,
      border: `1px solid ${c.border}`,
      padding: '12px 16px',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-md)',
      fontWeight: 500,
      fontSize: '14px',
      zIndex: 9999,
      maxWidth: '360px',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
      pointerEvents: 'all',
    }}>
      <span style={{ fontWeight: 700, fontSize: '16px' }}>{ICONS[variant]}</span>
      <span>{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300) }}
        style={{
          marginLeft: '8px', background: 'none', border: 'none',
          cursor: 'pointer', color: c.color, fontSize: '16px',
          opacity: 0.6, padding: 0, lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  )
}
```

### Fix 4b — Create a `useToast` hook for use across all pages

**Create `lib/hooks/useToast.ts`:**
```ts
import { useState, useCallback } from 'react'

type ToastState = { message: string; variant: 'success' | 'error' | 'info' } | null

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null)

  const showToast = useCallback((message: string, variant: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, variant })
  }, [])

  const clearToast = useCallback(() => setToast(null), [])

  return { toast, showToast, clearToast }
}
```

### Fix 4c — Update `app/admin/students/page.tsx` — success toast on create, error toast with real message, confirm on delete

```tsx
// ADD import:
import Toast from '@/components/ui/Toast'
import { useToast } from '@/lib/hooks/useToast'

// ADD inside component:
const { toast, showToast, clearToast } = useToast()

// In submit(), replace setError / close logic:
// On POST success:
showToast('Student added successfully', 'success')
setIsOpen(false)
setForm(emptyForm)
load()

// On POST failure:
showToast(data?.error ?? 'Failed to add student', 'error')

// On PUT success:
showToast('Student updated', 'success')

// On PUT failure:
showToast(data?.error ?? 'Failed to update student', 'error')

// ADD delete handler with toast:
const remove = async (id: string) => {
  if (!window.confirm('Delete this student? This cannot be undone.')) return
  const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
    `/api/students/${id}`,
    { method: 'DELETE' }
  )
  if (!res.ok || !data?.ok) {
    showToast(data?.error ?? 'Failed to delete student', 'error')
    return
  }
  showToast('Student deleted', 'info')
  load()
}

// ADD Delete button to table actions column:
// In the render for actions:
<div style={{ display: 'flex', gap: '6px' }}>
  <button onClick={() => openEdit(item)} ...>Edit</button>
  <button
    onClick={() => remove(item.id)}
    style={{
      background: 'var(--rose)', color: '#7a2020',
      border: '1px solid var(--border)', padding: '6px 10px',
      borderRadius: 'var(--radius)', cursor: 'pointer',
    }}
  >
    Delete
  </button>
</div>

// ADD Toast render at bottom of return:
{toast && <Toast message={toast.message} variant={toast.variant} onClose={clearToast} />}
```

### Fix 4d — Update `app/admin/members/page.tsx` — same pattern + email domain check

The email domain check should validate that the email domain matches the college domain (if `college.domain` is set) OR simply warn if it looks wrong.

**In the submit function for manual add, before the API call:**
```tsx
// ADD domain check helper at top of component:
const collegeDomain = typeof window !== 'undefined'
  ? localStorage.getItem('collegeDomain')
  : null

// In submit(), after basic validation:
if (!form.id && collegeDomain) {
  const emailDomain = form.email.trim().split('@')[1] ?? ''
  if (emailDomain !== collegeDomain) {
    showToast(
      `Warning: Email domain @${emailDomain} doesn't match college domain @${collegeDomain}. Continue?`,
      'info'
    )
    // Show a confirm dialog — if user cancels, stop
    if (!window.confirm(`Email domain @${emailDomain} doesn't match your college domain @${collegeDomain}. Add anyway?`)) {
      return
    }
  }
}
```

**Store college domain at login — `app/(auth)/login/page.tsx`:**
```tsx
// In selectCollege():
localStorage.setItem('collegeDomain', college.domain ?? '')
```

**Update `app/api/colleges/search/route.ts` to include `domain` in the response:**
```ts
select: { id: true, name: true, location: true, domain: true },
```

**In members page, apply useToast and toast all operations:**
```tsx
import { useToast } from '@/lib/hooks/useToast'
const { toast, showToast, clearToast } = useToast()

// On manual create success:  showToast('Member added', 'success')
// On manual create fail:     showToast(data?.error ?? 'Failed to add member', 'error')
// On edit success:           showToast('Member updated', 'success')
// On edit fail:              showToast(data?.error ?? 'Failed to update member', 'error')
// On delete success:         showToast('Member removed', 'info')
// On delete fail:            showToast(data?.error ?? 'Failed to remove member', 'error')
// On bulk upload success:    showToast(`${results.created} members created, ${results.skipped} skipped`, 'success')
// On bulk upload fail:       showToast(data?.error ?? 'Upload failed', 'error')

// At bottom of return:
{toast && <Toast message={toast.message} variant={toast.variant} onClose={clearToast} />}
```

---

## Fix 5 — Middleware: real server-side route protection

No `middleware.ts` exists in the repo. AuthGuard is client-only. This means any direct URL request bypasses auth entirely.

**Create `middleware.ts` at project root (same level as `package.json`):**

```ts
import { NextRequest, NextResponse } from 'next/server'

// Use the jose library for edge-compatible JWT verification
// jose is already available in Next.js edge runtime — no install needed

import * as jose from 'jose'

const PROTECTED: Record<string, string> = {
  '/admin':   'ADMIN',
  '/member':  'MEMBER',
  '/student': 'STUDENT',
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const requiredType = Object.entries(PROTECTED).find(([prefix]) =>
    pathname.startsWith(prefix)
  )?.[1]

  if (!requiredType) return NextResponse.next()

  // Read token from Authorization header OR cookie
  const authHeader = req.headers.get('authorization') ?? ''
  const cookieToken = req.cookies.get('accessToken')?.value
  const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  const token = headerToken ?? cookieToken

  if (!token) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jose.jwtVerify(token, secret)

    if ((payload as any).type !== requiredType) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url)
    )
  }
}

export const config = {
  // Only run on page routes — skip API, static files, fonts
  matcher: [
    '/admin/:path*',
    '/member/:path*',
    '/student/:path*',
  ],
}
```

**Install `jose` (edge-compatible JWT, does NOT use Node crypto):**
```bash
yarn add jose
```

> **Why `jose` instead of `jsonwebtoken`?**  
> Next.js middleware runs in the Edge Runtime which does NOT support Node.js APIs like `crypto`. `jsonwebtoken` uses `crypto` and crashes in middleware. `jose` is built for Web Crypto API and works perfectly in edge.

**The existing `lib/auth/jwt.ts` (used in API routes) keeps using `jsonwebtoken` — that's fine, API routes run in the Node.js runtime.**

---

## Fix 6 — RBAC: two remaining gaps

### 6a — `approve` and `reject` routes: MEMBER missing `requirePermission` check

**`app/api/leaves/[id]/approve/route.ts`** — add after `getSession`:
```ts
import { requirePermission } from '@/lib/rbac'

// After: const session = getSession(req)
// ADD:
if (session.type === 'MEMBER') {
  await requirePermission(session.roleId!, 'leaves', 'canEdit')
}
```

Same for **`app/api/leaves/[id]/reject/route.ts`**.

### 6b — `GET /api/permissions` uses stale roleId from JWT

**`app/api/permissions/route.ts`** — fetch fresh from DB:
```ts
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'MEMBER') return err('Forbidden', 403)

    // Fetch member fresh to get current roleId (JWT may be stale if role was changed)
    const member = await prisma.adminMember.findUnique({
      where: { id: session.sub },
      select: { roleId: true, collegeId: true },
    })

    if (!member || member.collegeId !== session.collegeId) return err('Forbidden', 403)

    const permissions = await prisma.rolePermission.findMany({
      where: { roleId: member.roleId },
      orderBy: { module: 'asc' },
    })

    return ok(permissions)
  } catch {
    return err('Unauthorized', 401)
  }
}
```

---

## Fix 7 — Neon DB: prevent connection exhaustion

Neon's free tier allows a small number of concurrent connections. Next.js in dev restarts modules frequently, creating new `PrismaClient` instances. Production on serverless (Vercel) can spawn dozens of concurrent instances.

**`lib/prisma.ts` — ensure singleton pattern with connection limit:**
```ts
import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined
}

const prisma =
  globalThis._prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis._prisma = prisma
}

export default prisma
```

**`prisma/schema.prisma` — add connection limit to datasource:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")
}
```

**`.env` — use the pooled URL for `DATABASE_URL` (PgBouncer) and direct for migrations:**
```env
# Neon provides two URLs — use the pooled one for the app
DATABASE_URL="postgresql://...?pgbouncer=true&connection_limit=1"
DATABASE_URL_UNPOOLED="postgresql://..."  # for prisma migrate
```

> Setting `connection_limit=1` per serverless function prevents Neon from running out of connections when multiple function instances start simultaneously.

**`next.config.ts` — exclude Prisma from edge bundle:**
```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
}

export default nextConfig
```

---

## Fix 8 — Branding: rename to Nyroverve

### `app/layout.tsx`
```tsx
export const metadata: Metadata = {
  title: 'Nyroverve',
  description: 'Hostel & Leave Management',
}
```

### `app/globals.css` — update the color palette to match Nyroverve branding
Replace the current CSS variables with a deeper, more distinctive palette that still keeps the warm neutral base but adds a stronger brand accent:

```css
:root {
  /* Base */
  --bg: #f6f4f1;
  --surface: #ffffff;
  --surface-2: #f0ede8;
  --border: #e2ddd6;
  --text-primary: #1a1816;
  --text-secondary: #6b6158;
  --text-muted: #a89f95;

  /* Brand — Nyroverve deep teal-green */
  --brand: #2d6a5f;
  --brand-dark: #1e4d45;
  --brand-light: #e0f0ec;
  --brand-mid: #4a8c7f;

  /* Semantic */
  --success: #d4edda;
  --success-text: #1a5c3a;
  --success-border: #6bc49a;
  --error: #fde8e8;
  --error-text: #7a2020;
  --error-border: #d88888;
  --info: #e0f0f8;
  --info-text: #1a3a5c;
  --info-border: #88b8d8;

  /* Keep legacy aliases so existing components don't break */
  --sage: var(--brand-mid);
  --sage-dark: var(--brand-dark);
  --sage-light: var(--brand-light);
  --mint: var(--success);
  --rose: var(--error);
  --sky: var(--info);
  --blush: #e8c4b8;
  --lavender: #c4b8e8;

  --radius: 10px;
  --radius-lg: 16px;
  --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.08);
}
```

### `components/layout/Sidebar.tsx` — replace "KEC Hostel" with Nyroverve branding

```tsx
// REPLACE the hardcoded name div:
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '8px',
}}>
  {/* Brand mark — simple geometric shape */}
  <div style={{
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'var(--brand)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 700,
    fontSize: '14px',
    flexShrink: 0,
  }}>
    N
  </div>
  <div style={{
    fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif',
    fontSize: '18px',
    fontWeight: 400,
    color: 'var(--text-primary)',
    letterSpacing: '-0.3px',
  }}>
    Nyroverve
  </div>
</div>
```

### `app/(auth)/login/page.tsx` — update the heading
```tsx
// Replace any "KEC Hostel" or "Hostel Management" heading with:
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '20px',
}}>
  <div style={{
    width: '36px', height: '36px', borderRadius: '10px',
    background: 'var(--brand)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    color: 'white', fontWeight: 700, fontSize: '18px',
  }}>
    N
  </div>
  <div style={{
    fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif',
    fontSize: '26px',
  }}>
    Nyroverve
  </div>
</div>
```

---

## Summary table

| # | Issue | Files |
|---|-------|-------|
| 1 | College name case / stale selection on clear | `app/(auth)/login/page.tsx` |
| 2 | POST /api/students 400 — empty string UUID | `app/api/students/route.ts`, `students/[id]/route.ts`, `members/route.ts` |
| 3 | Sidebar overflow | `components/layout/Sidebar.tsx` |
| 4a | Toast upgrade with icon + fade | `components/ui/Toast.tsx` |
| 4b | useToast hook | `lib/hooks/useToast.ts` (create) |
| 4c | Students page — success/error/delete toasts | `app/admin/students/page.tsx` |
| 4d | Members page — toasts + email domain check | `app/admin/members/page.tsx` |
| 5 | Middleware — real server-side auth | `middleware.ts` (create), `yarn add jose` |
| 6a | RBAC: approve/reject missing canEdit check | `app/api/leaves/[id]/approve/route.ts`, `reject/route.ts` |
| 6b | RBAC: permissions using stale JWT roleId | `app/api/permissions/route.ts` |
| 7 | Neon connection exhaustion | `lib/prisma.ts`, `next.config.ts`, `.env` |
| 8 | Branding — Nyroverve | `app/layout.tsx`, `app/globals.css`, `Sidebar.tsx`, `login/page.tsx` |

## Execution order for Codex

1. `lib/prisma.ts` — singleton fix (prevents Neon exhaustion immediately)
2. `next.config.ts` — add `serverExternalPackages`
3. `app/api/students/route.ts` + `students/[id]/route.ts` + `members/route.ts` — coerce empty strings to null (fixes 400 errors)
4. `components/ui/Toast.tsx` — upgrade Toast
5. `lib/hooks/useToast.ts` — create hook
6. `app/admin/students/page.tsx` — add toasts + delete button
7. `app/admin/members/page.tsx` — add toasts + domain check
8. `app/api/leaves/[id]/approve/route.ts` + `reject/route.ts` — add requirePermission
9. `app/api/permissions/route.ts` — fresh DB lookup
10. `app/globals.css` — Nyroverve colors
11. `app/layout.tsx` — update title
12. `components/layout/Sidebar.tsx` — overflow fix + Nyroverve brand + text truncation
13. `app/(auth)/login/page.tsx` — fix stale selection + Nyroverve brand
14. `middleware.ts` + `yarn add jose` — server-side auth (do last — test auth still works after)