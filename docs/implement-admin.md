# kec-hostel — Feature Pack: College Selector, Bulk Member Upload, Profile/Reset Password, RBAC Fixes

> **Repo:** `https://github.com/Subiksha1705/kec-hostel.git`  
> **4 things in this doc:**
> 1. Pre-login college selector (like CodeTantra) → login scoped to that college
> 2. Bulk member upload via CSV/Excel + manual add (email, password, role)
> 3. Profile menu in sidebar bottom-left → logout + reset password
> 4. RBAC correctness fixes — every gap that breaks permission enforcement

---

## Feature 1 — Pre-login college selector

### What to build
Before showing email/password, show a searchable dropdown "Select your institution". Once selected, only users from that college can log in. Matches the CodeTantra pattern in the screenshot.

### New API — `GET /api/colleges/search`
Public endpoint (no auth). Returns colleges matching a search query.

**Create `app/api/colleges/search/route.ts`:**
```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { ok, err } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') ?? ''
    if (q.length < 3) return ok([])

    const colleges = await prisma.college.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true, location: true },
      take: 10,
      orderBy: { name: 'asc' },
    })

    return ok(colleges)
  } catch {
    return err('Server error', 500)
  }
}
```

### Update all 3 login routes to verify `collegeId`
Each login route must confirm the user belongs to the selected college. If they try to log in with a valid email but wrong college, deny it.

**`app/api/auth/admin/login/route.ts` — update schema and check:**
```ts
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  collegeId: z.string().uuid(),   // ADD
})

// After finding admin, add:
if (admin.collegeId !== body.collegeId) return err('Invalid credentials', 401)
```

**`app/api/auth/member/login/route.ts` — same:**
```ts
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  collegeId: z.string().uuid(),   // ADD
})

// After finding member, add:
if (member.collegeId !== body.collegeId) return err('Invalid credentials', 401)
```

**`app/api/auth/student/login/route.ts` — same:**
```ts
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  collegeId: z.string().uuid(),   // ADD
})

// After finding student, add:
if (student.collegeId !== body.collegeId) return err('Invalid credentials', 401)
```

### Rewrite `app/(auth)/login/page.tsx`
Replace the current 3-tab login page with a 2-step flow:
- **Step 1:** Searchable college dropdown (type 3+ chars → shows matches)
- **Step 2:** After college selected, show user type tabs + email/password form

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiJson } from '@/lib/api/client'

type College = { id: string; name: string; location: string }
type LoginType = 'ADMIN' | 'MEMBER' | 'STUDENT'

const LOGIN_TYPES: { label: string; value: LoginType }[] = [
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Staff', value: 'MEMBER' },
  { label: 'Student', value: 'STUDENT' },
]

export default function LoginPage() {
  const router = useRouter()

  // Step 1 — college selection
  const [query, setQuery] = useState('')
  const [colleges, setColleges] = useState<College[]>([])
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Step 2 — login form
  const [loginType, setLoginType] = useState<LoginType>('STUDENT')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  // Search colleges
  useEffect(() => {
    if (query.length < 3) { setColleges([]); return }
    const timer = setTimeout(async () => {
      const { data } = await apiJson<{ ok: boolean; data: College[] }>(
        `/api/colleges/search?q=${encodeURIComponent(query)}`
      )
      if (data?.ok) setColleges(data.data)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const selectCollege = (college: College) => {
    setSelectedCollege(college)
    setQuery(college.name)
    setDropdownOpen(false)
    setError('')
    localStorage.setItem('collegeName', college.name)
    localStorage.setItem('collegeId', college.id)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!selectedCollege) { setError('Please select your institution first'); return }

    const endpoint =
      loginType === 'ADMIN'
        ? '/api/auth/admin/login'
        : loginType === 'MEMBER'
          ? '/api/auth/member/login'
          : '/api/auth/student/login'

    const { res, data } = await apiJson<{ ok: boolean; data?: any; error?: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ email, password, collegeId: selectedCollege.id }),
    })

    if (!res.ok || !data?.ok) {
      setError(data?.error ?? 'Login failed')
      return
    }

    localStorage.setItem('accessToken', data.data.accessToken)
    localStorage.setItem('refreshToken', data.data.refreshToken)
    localStorage.setItem('userType', loginType)
    localStorage.setItem('userName', data.data.name ?? email)
    if (data.data.roleName) localStorage.setItem('userRoleName', data.data.roleName)

    router.replace(
      loginType === 'ADMIN'
        ? '/admin/dashboard'
        : loginType === 'MEMBER'
          ? '/member/dashboard'
          : '/student/dashboard'
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: 'min(480px, 100%)', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* College selector */}
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '24px' }}>
          <div style={{ fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif', fontSize: '22px', marginBottom: '16px' }}>
            Select your institution
          </div>
          <div style={{ position: 'relative' }}>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true); setSelectedCollege(null) }}
              onFocus={() => setDropdownOpen(true)}
              placeholder="Type 3 or more characters..."
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius)', border: `1px solid ${selectedCollege ? 'var(--sage)' : 'var(--border)'}`, background: 'var(--surface-2)', boxSizing: 'border-box' }}
            />
            {dropdownOpen && query.length >= 3 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 10, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' }}>
                {colleges.length === 0 ? (
                  <div style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '14px' }}>No institutions found</div>
                ) : colleges.map((college) => (
                  <div
                    key={college.id}
                    onClick={() => selectCollege(college)}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '14px' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ fontWeight: 600 }}>{college.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{college.location}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {query.length > 0 && query.length < 3 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>Please enter 3 or more characters</div>
          )}
        </div>

        {/* Login form — only shown after college is selected */}
        {selectedCollege && (
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '24px' }}>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* User type tabs */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {LOGIN_TYPES.map((item) => {
                  const active = item.value === loginType
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setLoginType(item.value)}
                      style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: active ? 'var(--sage-light)' : 'var(--surface)', color: active ? 'var(--sage-dark)' : 'var(--text-secondary)', fontWeight: active ? 600 : 500, cursor: 'pointer' }}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-2)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Password</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required style={{ flex: 1, padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-2)' }} />
                  <button type="button" onClick={() => setShowPassword((p) => !p)} style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '0 12px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: 'var(--rose)', color: '#7a2020', padding: '10px 12px', borderRadius: 'var(--radius)', fontSize: '14px' }}>{error}</div>
              )}

              <button type="submit" style={{ background: 'var(--sage)', color: 'white', border: 'none', padding: '12px', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600 }}>
                Sign In
              </button>

              {loginType === 'ADMIN' && (
                <button type="button" onClick={() => router.push('/register')} style={{ background: 'transparent', border: 'none', color: 'var(--sage-dark)', cursor: 'pointer', textAlign: 'left', padding: 0, fontSize: '14px' }}>
                  New college? Register here
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
```

---

## Feature 2 — Bulk member upload (CSV/Excel) + manual add

### What the upload expects
A CSV or Excel file with columns: `name`, `email`, `password`, `role`
Where `role` is the **role name** (e.g. "Class Advisor") — matched case-insensitively to existing roles in that college.

### New API — `POST /api/members/bulk`

**Create `app/api/members/bulk/route.ts`:**
```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const rowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const body = await req.json() as { rows: unknown[] }
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return err('No rows provided', 400)
    }
    if (body.rows.length > 200) {
      return err('Maximum 200 rows per upload', 400)
    }

    // Fetch all roles for this college once
    const collegeRoles = await prisma.role.findMany({
      where: { collegeId: session.collegeId },
      select: { id: true, name: true },
    })
    const roleMap = new Map(collegeRoles.map((r) => [r.name.toLowerCase(), r.id]))

    const results: { row: number; email: string; status: 'created' | 'skipped'; reason?: string }[] = []

    for (let i = 0; i < body.rows.length; i++) {
      const parsed = rowSchema.safeParse(body.rows[i])
      if (!parsed.success) {
        results.push({ row: i + 1, email: String((body.rows[i] as any)?.email ?? ''), status: 'skipped', reason: parsed.error.errors[0]?.message ?? 'Invalid row' })
        continue
      }

      const { name, email, password, role } = parsed.data

      const roleId = roleMap.get(role.toLowerCase())
      if (!roleId) {
        results.push({ row: i + 1, email, status: 'skipped', reason: `Role "${role}" not found in this college` })
        continue
      }

      const existing = await prisma.adminMember.findUnique({ where: { email } })
      if (existing) {
        results.push({ row: i + 1, email, status: 'skipped', reason: 'Email already in use' })
        continue
      }

      const hashed = await hashPassword(password)
      await prisma.adminMember.create({
        data: { name, email, password: hashed, roleId, collegeId: session.collegeId },
      })

      results.push({ row: i + 1, email, status: 'created' })
    }

    const created = results.filter((r) => r.status === 'created').length
    const skipped = results.filter((r) => r.status === 'skipped').length

    return ok({ created, skipped, results })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
```

### Update `app/admin/members/page.tsx` — add bulk upload tab

Add a toggle between "Manual" and "Upload CSV/Excel" at the top of the Add Member modal.

**Install `xlsx` for parsing Excel files:**
```bash
yarn add xlsx
```

**Add to the members page:**

```tsx
// ADD imports at top:
import * as XLSX from 'xlsx'

// ADD state:
const [addMode, setAddMode] = useState<'manual' | 'bulk'>('manual')
const [bulkFile, setBulkFile] = useState<File | null>(null)
const [bulkResults, setBulkResults] = useState<null | { created: number; skipped: number; results: any[] }>(null)
const [bulkError, setBulkError] = useState('')
const fileInputRef = useRef<HTMLInputElement>(null)

// ADD bulk parse + submit function:
const parseBulkFile = async (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet)
        resolve(rows)
      } catch {
        reject(new Error('Failed to parse file'))
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

const submitBulk = async () => {
  setBulkError('')
  if (!bulkFile) { setBulkError('Please select a file'); return }

  let rows: any[]
  try {
    rows = await parseBulkFile(bulkFile)
  } catch {
    setBulkError('Could not read file. Make sure it is a valid CSV or Excel file.')
    return
  }

  if (rows.length === 0) { setBulkError('File is empty'); return }

  // Normalize column names (case-insensitive)
  const normalized = rows.map((row: any) => ({
    name: row.name ?? row.Name ?? row.NAME ?? '',
    email: row.email ?? row.Email ?? row.EMAIL ?? '',
    password: String(row.password ?? row.Password ?? row.PASSWORD ?? ''),
    role: row.role ?? row.Role ?? row.ROLE ?? '',
  }))

  const { res, data } = await apiJson<{ ok: boolean; data?: typeof bulkResults; error?: string }>(
    '/api/members/bulk',
    { method: 'POST', body: JSON.stringify({ rows: normalized }) }
  )

  if (!res.ok || !data?.ok) {
    setBulkError(data?.error ?? 'Upload failed')
    return
  }

  setBulkResults(data.data ?? null)
  load()
}
```

**Update the Modal content to show tabs + bulk UI:**

```tsx
// Inside Modal, REPLACE content with:
<div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

  {/* Mode toggle */}
  <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
    {(['manual', 'bulk'] as const).map((mode) => (
      <button
        key={mode}
        type="button"
        onClick={() => { setAddMode(mode); setBulkResults(null); setBulkError('') }}
        style={{
          padding: '8px 14px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background: addMode === mode ? 'var(--sage-light)' : 'var(--surface)',
          color: addMode === mode ? 'var(--sage-dark)' : 'var(--text-secondary)',
          fontWeight: addMode === mode ? 600 : 500,
          cursor: 'pointer',
        }}
      >
        {mode === 'manual' ? 'Manual' : 'Upload CSV / Excel'}
      </button>
    ))}
  </div>

  {addMode === 'manual' ? (
    /* --- EXISTING MANUAL FORM FIELDS HERE --- */
    <> ... </>
  ) : (
    /* --- BULK UPLOAD --- */
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        Upload a <strong>.csv</strong> or <strong>.xlsx</strong> file with columns:<br />
        <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>name, email, password, role</code><br />
        where <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: '4px' }}>role</code> matches an existing role name in your college.
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        style={{ padding: '10px 14px', borderRadius: 'var(--radius)', border: '2px dashed var(--border)', background: 'var(--surface-2)', cursor: 'pointer', color: 'var(--text-secondary)' }}
      >
        {bulkFile ? bulkFile.name : 'Click to choose file'}
      </button>

      {bulkError && (
        <div style={{ background: 'var(--rose)', color: '#7a2020', padding: '8px 10px', borderRadius: 'var(--radius)', fontSize: '13px' }}>{bulkError}</div>
      )}

      {bulkResults && (
        <div style={{ background: 'var(--mint)', color: '#1a5c3a', padding: '12px', borderRadius: 'var(--radius)', fontSize: '13px' }}>
          <strong>{bulkResults.created} created</strong>, {bulkResults.skipped} skipped
          {bulkResults.results.filter((r) => r.status === 'skipped').map((r) => (
            <div key={r.row} style={{ marginTop: '4px', opacity: 0.8 }}>Row {r.row} ({r.email}): {r.reason}</div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={submitBulk}
        style={{ background: 'var(--sage)', color: 'white', border: 'none', padding: '10px 14px', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600 }}
      >
        Upload & Create Members
      </button>
    </div>
  )}
</div>
```

---

## Feature 3 — Profile menu in sidebar: logout + reset password

### Update `components/layout/Sidebar.tsx`

Replace the current bottom section (plain logout button) with a clickable profile card that expands a small menu with "Reset Password" and "Logout".

```tsx
// ADD state inside Sidebar:
const [profileOpen, setProfileOpen] = useState(false)
const [showResetModal, setShowResetModal] = useState(false)
const [resetForm, setResetForm] = useState({ current: '', next: '', confirm: '' })
const [resetError, setResetError] = useState('')
const [resetSuccess, setResetSuccess] = useState(false)

// REPLACE the bottom <div> block (logout button) with:
<div style={{ marginTop: 'auto', position: 'relative' }}>

  {/* Profile card — clickable */}
  <div
    onClick={() => setProfileOpen((p) => !p)}
    style={{
      background: 'var(--surface-2)',
      borderRadius: 'var(--radius)',
      padding: '10px 12px',
      cursor: 'pointer',
      border: '1px solid var(--border)',
    }}
  >
    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{userName}</div>
    <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{roleLabel}</div>
  </div>

  {/* Dropdown menu */}
  {profileOpen && (
    <div style={{
      position: 'absolute',
      bottom: '100%',
      left: 0,
      right: 0,
      marginBottom: '6px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => { setProfileOpen(false); setShowResetModal(true) }}
        style={{ width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}
      >
        Reset Password
      </button>
      <button
        onClick={() => { localStorage.clear(); window.location.href = '/login' }}
        style={{ width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px', color: '#b91c1c' }}
      >
        Logout
      </button>
    </div>
  )}
</div>

{/* Reset password modal */}
{showResetModal && (
  <div style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
  }}>
    <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '28px', width: 'min(400px, 90vw)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ fontWeight: 600, fontSize: '18px' }}>Reset Password</div>

      {['current', 'next', 'confirm'].map((field) => (
        <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {field === 'current' ? 'Current password' : field === 'next' ? 'New password' : 'Confirm new password'}
          </label>
          <input
            type="password"
            value={resetForm[field as keyof typeof resetForm]}
            onChange={(e) => setResetForm((f) => ({ ...f, [field]: e.target.value }))}
            style={{ padding: '10px 12px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface-2)' }}
          />
        </div>
      ))}

      {resetError && <div style={{ background: 'var(--rose)', color: '#7a2020', padding: '8px 10px', borderRadius: 'var(--radius)', fontSize: '13px' }}>{resetError}</div>}
      {resetSuccess && <div style={{ background: 'var(--mint)', color: '#1a5c3a', padding: '8px 10px', borderRadius: 'var(--radius)', fontSize: '13px' }}>Password updated successfully!</div>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={async () => {
            setResetError('')
            if (resetForm.next.length < 8) { setResetError('New password must be at least 8 characters'); return }
            if (resetForm.next !== resetForm.confirm) { setResetError('Passwords do not match'); return }

            const { res, data } = await apiJson<{ ok: boolean; error?: string }>('/api/auth/change-password', {
              method: 'POST',
              body: JSON.stringify({ currentPassword: resetForm.current, newPassword: resetForm.next }),
            })

            if (!res.ok || !data?.ok) { setResetError(data?.error ?? 'Failed to update password'); return }
            setResetSuccess(true)
            setTimeout(() => { setShowResetModal(false); setResetSuccess(false); setResetForm({ current: '', next: '', confirm: '' }) }, 1500)
          }}
          style={{ flex: 1, background: 'var(--sage)', color: 'white', border: 'none', padding: '10px', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600 }}
        >
          Update Password
        </button>
        <button
          onClick={() => { setShowResetModal(false); setResetError(''); setResetForm({ current: '', next: '', confirm: '' }) }}
          style={{ flex: 1, background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '10px', borderRadius: 'var(--radius)', cursor: 'pointer' }}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
```

### New API — `POST /api/auth/change-password`

Works for all 3 user types. Verifies current password before updating.

**Create `app/api/auth/change-password/route.ts`:**
```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { verifyPassword, hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    const { currentPassword, newPassword } = schema.parse(await req.json())

    let storedHash: string

    if (session.type === 'ADMIN') {
      const admin = await prisma.admin.findUnique({ where: { id: session.sub } })
      if (!admin) return err('User not found', 404)
      storedHash = admin.password
    } else if (session.type === 'MEMBER') {
      const member = await prisma.adminMember.findUnique({ where: { id: session.sub } })
      if (!member) return err('User not found', 404)
      storedHash = member.password
    } else {
      const student = await prisma.student.findUnique({ where: { id: session.sub } })
      if (!student) return err('User not found', 404)
      storedHash = student.password
    }

    const valid = await verifyPassword(currentPassword, storedHash)
    if (!valid) return err('Current password is incorrect', 401)

    const hashed = await hashPassword(newPassword)

    if (session.type === 'ADMIN') {
      await prisma.admin.update({ where: { id: session.sub }, data: { password: hashed } })
    } else if (session.type === 'MEMBER') {
      await prisma.adminMember.update({ where: { id: session.sub }, data: { password: hashed } })
    } else {
      await prisma.student.update({ where: { id: session.sub }, data: { password: hashed } })
    }

    return ok({ message: 'Password updated' })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
```

---

## Feature 4 — RBAC correctness fixes

These are the actual bugs that break permission enforcement right now.

### Fix 4a — `leaves/[id]/approve` and `leaves/[id]/reject` missing `requirePermission` check

A MEMBER can approve/reject a leave even if their role has `leaves.canView = true` but `canEdit = false`. The approve/reject routes only check `assignedToId` but never check the permission table.

**`app/api/leaves/[id]/approve/route.ts` — add permission check:**
```ts
// ADD import:
import { requirePermission } from '@/lib/rbac'

// Inside PUT handler, after getSession, add:
if (session.type === 'MEMBER') {
  await requirePermission(session.roleId!, 'leaves', 'canEdit')
}
```

**`app/api/leaves/[id]/reject/route.ts` — same:**
```ts
import { requirePermission } from '@/lib/rbac'

// Inside PUT handler, after getSession, add:
if (session.type === 'MEMBER') {
  await requirePermission(session.roleId!, 'leaves', 'canEdit')
}
```

### Fix 4b — `leaves/[id]/assign` doesn't verify the assigned member is in scope

Admin assigns any member to a leave. But a member scoped to Class A should not be assigned to a leave from a student in Class B.

**`app/api/leaves/[id]/assign/route.ts` — add scope check:**
```ts
// ADD import:
import { assertScope } from '@/lib/scope'

// After fetching `member`, add:
const leaveStudent = await prisma.student.findUnique({
  where: { id: leave.studentId },
  select: { classId: true, hostelId: true },
})

if (leaveStudent) {
  // Only check scope if the member being assigned has restrictions
  if (member.classId || member.hostelId) {
    assertScope(
      { classId: member.classId, hostelId: member.hostelId },
      { classId: leaveStudent.classId, hostelId: leaveStudent.hostelId }
    )
  }
}
```

Also update the catch block to handle `SCOPE_DENIED`:
```ts
if (msg === 'SCOPE_DENIED') return err('This member cannot be assigned to this leave (scope mismatch)', 403)
```

### Fix 4c — `requirePermission` is called once per request (N+1 issue on list pages)

On `GET /api/leaves`, `requirePermission` does a DB query every single request. For list pages this is fine (once per request), but on pages that call it in a loop it becomes slow.

**Update `lib/rbac.ts` to add a cached version for bulk checks:**
```ts
import prisma from '@/lib/prisma'

type Action = 'canView' | 'canCreate' | 'canEdit' | 'canDelete'

export const MODULES = ['students', 'leaves', 'complaints', 'reviews'] as const
export type Module = (typeof MODULES)[number]

export async function requirePermission(
  roleId: string,
  module: Module | string,
  action: Action
): Promise<void> {
  const permission = await prisma.rolePermission.findUnique({
    where: { roleId_module: { roleId, module } },
  })
  if (!permission || !permission[action]) {
    throw new Error('FORBIDDEN')
  }
}

/**
 * Load all permissions for a role in one query.
 * Use this when you need to check multiple modules in the same request.
 */
export async function loadPermissions(roleId: string): Promise<Map<string, Record<Action, boolean>>> {
  const rows = await prisma.rolePermission.findMany({ where: { roleId } })
  const map = new Map<string, Record<Action, boolean>>()
  for (const row of rows) {
    map.set(row.module, {
      canView: row.canView,
      canCreate: row.canCreate,
      canEdit: row.canEdit,
      canDelete: row.canDelete,
    })
  }
  return map
}

export function checkPermission(
  permissions: Map<string, Record<Action, boolean>>,
  module: string,
  action: Action
): boolean {
  const perm = permissions.get(module)
  return !!(perm && perm[action])
}
```

### Fix 4d — `GET /api/roles` is ADMIN-only but `GET /api/roles/:id/permissions` doesn't verify the role belongs to the admin's college before checking

**`app/api/roles/[id]/permissions/route.ts` — the GET already does this correctly. The PUT does too. No change needed here.**

### Fix 4e — `GET /api/permissions` (used by Sidebar) returns permissions for any MEMBER but doesn't verify the roleId is valid for that college

**`app/api/permissions/route.ts` — add college validation:**
```ts
// After getSession, add a college scope check:
const member = await prisma.adminMember.findUnique({
  where: { id: session.sub },
  select: { roleId: true, collegeId: true },
})

if (!member || member.collegeId !== session.collegeId) return err('Forbidden', 403)
// Use member.roleId instead of session.roleId! to ensure it's fresh from DB
const permissions = await prisma.rolePermission.findMany({
  where: { roleId: member.roleId },
  orderBy: { module: 'asc' },
})
return ok(permissions)
```

### Fix 4f — STUDENT can call `PUT /api/students/:id` if they guess an ID

**`app/api/students/[id]/route.ts`** — the current code only checks `session.type !== 'ADMIN'`, which blocks MEMBER and STUDENT equally. But it should be explicit:

```ts
// REPLACE the guard in PUT:
if (session.type === 'STUDENT') return err('Forbidden', 403)

if (session.type === 'MEMBER') {
  await requirePermission(session.roleId!, 'students', 'canEdit')
  assertScope(
    { classId: session.classId ?? null, hostelId: session.hostelId ?? null },
    { classId: student.classId, hostelId: student.hostelId }
  )
}
// ADMIN falls through with full access
```

---

## Summary table

| # | Feature | Files changed / created |
|---|---------|------------------------|
| 1a | College search API | `app/api/colleges/search/route.ts` (create) |
| 1b | collegeId in login routes | `app/api/auth/admin/login/route.ts`, `member/login`, `student/login` |
| 1c | Login page rewrite | `app/(auth)/login/page.tsx` |
| 2a | Bulk upload API | `app/api/members/bulk/route.ts` (create) |
| 2b | Members page UI | `app/admin/members/page.tsx` — add mode toggle + bulk upload UI |
| 3a | Change password API | `app/api/auth/change-password/route.ts` (create) |
| 3b | Sidebar profile menu | `components/layout/Sidebar.tsx` — replace logout button |
| 4a | RBAC: approve/reject need canEdit | `app/api/leaves/[id]/approve/route.ts`, `reject/route.ts` |
| 4b | RBAC: assign scope check | `app/api/leaves/[id]/assign/route.ts` |
| 4c | RBAC: centralize + cache perms | `lib/rbac.ts` — add `loadPermissions`, `checkPermission`, export `MODULES` |
| 4d | RBAC: permissions endpoint fresh from DB | `app/api/permissions/route.ts` |
| 4e | RBAC: student can't PUT students/[id] | `app/api/students/[id]/route.ts` |

## Execution order for Codex

1. `lib/rbac.ts` — update first (other files import from it)
2. `app/api/colleges/search/route.ts` — create
3. Update 3 login routes to accept + validate `collegeId`
4. Rewrite `app/(auth)/login/page.tsx`
5. `app/api/members/bulk/route.ts` — create, install `xlsx`
6. Update `app/admin/members/page.tsx` — add bulk upload mode
7. `app/api/auth/change-password/route.ts` — create
8. Update `components/layout/Sidebar.tsx` — profile menu
9. `app/api/leaves/[id]/approve/route.ts` + `reject/route.ts` — add `requirePermission`
10. `app/api/leaves/[id]/assign/route.ts` — add scope check
11. `app/api/permissions/route.ts` — fresh DB lookup
12. `app/api/students/[id]/route.ts` — explicit STUDENT block + MEMBER canEdit