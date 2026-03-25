# Nyroverve — Complete Fix Pack (Based on Fresh Clone)

> Every fix is based on reading the actual current code. No guessing.

---

## Issue 1 — College search is case-sensitive on login

### Root cause
`app/api/colleges/search/route.ts` already has `mode: 'insensitive'` on Prisma — the API is **not** the bug. The bug is in the login page: the college name is stored in the DB as `"KEC College"` but when the user types `"kec"` the API works fine. The real problem is that **after the user selects a college and then edits the input**, `selectedCollege` stays set with the old `collegeId` — so a different college name is displayed but the wrong `collegeId` is sent to the login API, causing "invalid credentials".

### Fix — `app/(auth)/login/page.tsx`

Find the input `onChange` for the college search and replace:
```tsx
// CURRENT:
onChange={(e) => { setQuery(e.target.value); setDropdownOpen(true); setSelectedCollege(null) }}

// REPLACE WITH:
onChange={(e) => {
  const val = e.target.value
  setQuery(val)
  setDropdownOpen(true)
  // If user is editing after a selection, clear the selection immediately
  if (selectedCollege && val !== selectedCollege.name) {
    setSelectedCollege(null)
  }
}}
```

Also add a visual indicator when a college IS properly selected (green border):
```tsx
// In the input style, add a conditional border:
style={{
  width: '100%',
  padding: '10px 12px',
  borderRadius: 'var(--radius)',
  border: selectedCollege
    ? '1.5px solid var(--brand, var(--sage-dark))'
    : '1px solid var(--border)',
  background: 'var(--surface-2)',
  boxSizing: 'border-box',
  outline: 'none',
}}
```

And prevent showing the login form if no college is properly selected (only `selectedCollege !== null`):
```tsx
// This is already gated on {selectedCollege && (...)} — make sure that condition
// is checking the object, not the query string. Confirm it reads:
{selectedCollege && (
  <div style={{ background: 'var(--surface)', ... }}>
    {/* login form */}
  </div>
)}
```

---

## Issue 2 — Dashboard, Roles, Members, Students, Leaves all slow to load

### Root cause
Every admin page fires **multiple sequential-or-parallel API calls on mount**, each of which:
1. Opens a Prisma connection to Neon (cold start ~200ms each)
2. Runs a DB query
3. Returns

The dashboard alone fires 4 parallel API calls (`/api/students`, `/api/members`, `/api/roles`, `/api/leaves`) — each is a separate Neon round-trip. On free Neon that's 4 × ~300ms = ~1.2s minimum, plus JS parse time = ~5–10s on cold start.

### Fix A — New `/api/dashboard` endpoint (replaces 4 calls with 1)

**Create `app/api/dashboard/route.ts`:**
```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    // Single DB round-trip using $transaction for all counts + recent leaves
    const [studentCount, memberCount, roleCount, recentLeaves] = await prisma.$transaction([
      prisma.student.count({ where: { collegeId: session.collegeId } }),
      prisma.adminMember.count({ where: { collegeId: session.collegeId } }),
      prisma.role.count({ where: { collegeId: session.collegeId } }),
      prisma.leave.findMany({
        where: { collegeId: session.collegeId },
        include: {
          student: { select: { id: true, name: true, rollNumber: true } },
          assignedTo: { select: { id: true, name: true } },
          reviewedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ])

    const pendingCount = recentLeaves.filter((l) => l.status === 'PENDING').length

    return ok({
      stats: {
        students: studentCount,
        members: memberCount,
        roles: roleCount,
        pending: pendingCount,
      },
      recentLeaves,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
```

**Replace `app/admin/dashboard/page.tsx`:**
```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users, Shield, GraduationCap, CalendarCheck } from 'lucide-react'
import { apiJson } from '@/lib/api/client'
import StatCard from '@/components/ui/StatCard'
import Table from '@/components/ui/Table'
import StatusBadge from '@/components/ui/StatusBadge'

type Leave = {
  id: string
  reason: string
  fromDate: string
  toDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  student: { name: string }
  assignedTo?: { name: string } | null
}

type DashboardData = {
  stats: { students: number; members: number; roles: number; pending: number }
  recentLeaves: Leave[]
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiJson<{ ok: boolean; data: DashboardData }>('/api/dashboard').then(({ data: res }) => {
      if (res?.ok) setData(res.data)
      setLoading(false)
    })
  }, [])

  const stats = data?.stats ?? { students: 0, members: 0, roles: 0, pending: 0 }
  const recentLeaves = data?.recentLeaves ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {loading && (
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '8px 0' }}>
          Loading...
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <StatCard label="Total Students" value={stats.students} icon={<GraduationCap size={20} />} />
        <StatCard label="Total Members" value={stats.members} icon={<Users size={20} />} />
        <StatCard label="Total Roles" value={stats.roles} icon={<Shield size={20} />} />
        <StatCard label="Pending Leaves" value={stats.pending} icon={<CalendarCheck size={20} />} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
          Recent Leaves
        </h2>
        <Link href="/admin/leaves" style={{ color: 'var(--sage-dark)', textDecoration: 'none' }}>
          View all →
        </Link>
      </div>

      <Table
        columns={[
          { key: 'student', label: 'Student Name', render: (item: Leave) => item.student?.name ?? '-' },
          { key: 'reason', label: 'Reason' },
          { key: 'fromDate', label: 'From', render: (item: Leave) => new Date(item.fromDate).toLocaleDateString() },
          { key: 'toDate', label: 'To', render: (item: Leave) => new Date(item.toDate).toLocaleDateString() },
          { key: 'status', label: 'Status', render: (item: Leave) => <StatusBadge status={item.status} /> },
          { key: 'assignedTo', label: 'Assigned To', render: (item: Leave) => item.assignedTo?.name ?? 'Unassigned' },
        ]}
        data={recentLeaves}
        emptyMessage="No leave requests yet."
      />
    </div>
  )
}
```

### Fix B — Add skeleton loading to Table component

The "data appears after the page" effect happens because `data = []` initially, so the empty state shows, then data arrives and replaces it. Add a `loading` prop:

**Replace `components/ui/Table.tsx`:**
```tsx
import React from 'react'

type Column<T> = {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
}

type TableProps<T> = {
  columns: Column<T>[]
  data: T[]
  emptyMessage?: string
  loading?: boolean
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div
            style={{
              height: '14px',
              borderRadius: '6px',
              background: 'var(--border)',
              width: i === 0 ? '60%' : '80%',
              animation: 'pulse 1.4s ease-in-out infinite',
            }}
          />
        </td>
      ))}
    </tr>
  )
}

export default function Table<T>({ columns, data, emptyMessage, loading }: TableProps<T>) {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-secondary)',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={columns.length} />)
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: '40px', textAlign: 'center' }}>
                  <div
                    style={{
                      background: 'var(--surface-2)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '24px',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {emptyMessage ?? 'Nothing here yet.'}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={index}
                  style={{ background: index % 2 === 0 ? 'var(--surface)' : 'var(--surface-2)' }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontSize: '14px' }}
                    >
                      {column.render ? column.render(item) : (item as any)[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
```

### Fix C — Add `loading` state to every admin page

In each page that uses `<Table>`, add:
```tsx
const [loading, setLoading] = useState(true)

// In load():
const load = async () => {
  setLoading(true)
  // ... fetch
  setLoading(false)
}

// Pass to Table:
<Table ... loading={loading} />
```

Apply this to: `app/admin/roles/page.tsx`, `app/admin/members/page.tsx`, `app/admin/students/page.tsx`, `app/admin/leaves/page.tsx`, `app/member/leaves/page.tsx`, `app/member/students/page.tsx`

### Fix D — Prisma connection pooling for Neon

**Replace `lib/prisma.ts`:**
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
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis._prisma = prisma
}

export default prisma
```

**In your Neon connection string (`.env`), add pgBouncer params:**
```env
DATABASE_URL="postgresql://user:pass@host/db?pgbouncer=true&connection_limit=1&pool_timeout=20"
DATABASE_URL_UNPOOLED="postgresql://user:pass@host/db"
```

**`next.config.ts` — exclude Prisma from edge bundle:**
```ts
import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
}
export default nextConfig
```

---

## Issue 3 — Roles page: login roles should show college-specific roles (with loading)

The roles page already fetches correctly from the DB — it just shows empty until the fetch completes. The fix is adding the `loading` skeleton from Fix B above.

Additionally, the role permission edit page fires **2 API calls** (`/api/roles` to get the name + `/api/roles/:id/permissions`). Replace with a single smarter call:

**Update `app/admin/roles/[id]/page.tsx` — fetch only what's needed:**
```tsx
// REPLACE the useEffect load function:
useEffect(() => {
  const load = async () => {
    // Fetch role detail + permissions in parallel — but use the single role endpoint
    const [roleRes, permsRes] = await Promise.all([
      apiJson<{ ok: boolean; data: { id: string; name: string; permissions: Permission[] } }>(
        // Use the roles list endpoint but filter — or better, add GET /api/roles/:id
        `/api/roles`
      ),
      apiJson<{ ok: boolean; data: Permission[] }>(`/api/roles/${roleId}/permissions`),
    ])
    const role = roleRes.data?.data?.find((r: any) => r.id === roleId)
    setRoleName(role?.name ?? 'Role')
    // ... rest unchanged
  }
  load()
}, [roleId])
```

**Better: create `GET /api/roles/:id` to return a single role with permissions:**

**Replace `app/api/roles/[id]/route.ts`** (currently only has DELETE):
```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

// GET /api/roles/:id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: { select: { members: true } },
      },
    })

    if (!role || role.collegeId !== session.collegeId) return err('Not found', 404)
    return ok(role)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

// DELETE /api/roles/:id — (existing, keep unchanged)
export async function DELETE( ... ) { ... }
```

**Update `app/admin/roles/[id]/page.tsx` to use the new single endpoint:**
```tsx
useEffect(() => {
  const load = async () => {
    // ONE call instead of TWO
    const { data } = await apiJson<{
      ok: boolean
      data: { id: string; name: string; permissions: Permission[] }
    }>(`/api/roles/${roleId}`)

    if (!data?.ok) return

    setRoleName(data.data.name)

    const perms = data.data.permissions ?? []
    const merged = modules.map((module) => {
      const existing = perms.find((p) => p.module === module)
      return existing ?? {
        module,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
      }
    })
    setPermissions(merged)
  }
  load()
}, [roleId])
```

---

## Issue 4 — Add "Approve" column to role permissions + wire RBAC for leave approval

### Schema change — add `canApprove` to `RolePermission`

**`prisma/schema.prisma` — add field:**
```prisma
model RolePermission {
  id         String  @id @default(uuid())
  roleId     String
  module     String
  canView    Boolean @default(false)
  canCreate  Boolean @default(false)
  canEdit    Boolean @default(false)
  canDelete  Boolean @default(false)
  canApprove Boolean @default(false)   // ← ADD THIS

  role       Role    @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@unique([roleId, module])
}
```

Run migration:
```bash
npx prisma migrate dev --name add_can_approve
```

### Update `app/api/roles/[id]/permissions/route.ts` — include canApprove

```ts
// ADD to MODULES (keep existing modules, just update the schema):
const MODULES = ['students', 'leaves', 'complaints'] as const

// UPDATE permissionSchema to include canApprove:
const permissionSchema = z.array(
  z.object({
    module: z.enum(MODULES),
    canView: z.boolean(),
    canCreate: z.boolean(),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
    canApprove: z.boolean(),   // ← ADD
  })
)
```

### Update `lib/rbac.ts` — add canApprove to Action type

```ts
type Action = 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canApprove'
```

### Update leave approve/reject routes — check `canApprove` not `canEdit`

**`app/api/leaves/[id]/approve/route.ts`:**
```ts
// CHANGE:
if (session.type === 'MEMBER') {
  await requirePermission(session.roleId!, 'leaves', 'canApprove')  // was canEdit
}
```

**`app/api/leaves/[id]/reject/route.ts`:**
```ts
if (session.type === 'MEMBER') {
  await requirePermission(session.roleId!, 'leaves', 'canApprove')  // was canEdit
}
```

### Update `app/admin/roles/[id]/page.tsx` — add Approve column

```tsx
// CHANGE modules type and list:
const modules = ['students', 'leaves', 'complaints'] as const

// CHANGE Permission type:
type Permission = {
  module: (typeof modules)[number]
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canApprove: boolean   // ← ADD
}

// CHANGE the default permission object in merged:
return existing ?? {
  module,
  canView: false,
  canCreate: false,
  canEdit: false,
  canDelete: false,
  canApprove: false,   // ← ADD
}

// CHANGE updatePermission — when canView is unchecked, also uncheck canApprove:
if (key === 'canView' && !value) {
  next.canCreate = false
  next.canEdit = false
  next.canDelete = false
  next.canApprove = false   // ← ADD
}

// CHANGE save() payload:
const payload = permissions.map((perm) => ({
  ...perm,
  canCreate:  perm.canView ? perm.canCreate  : false,
  canEdit:    perm.canView ? perm.canEdit    : false,
  canDelete:  perm.canView ? perm.canDelete  : false,
  canApprove: perm.canView ? perm.canApprove : false,  // ← ADD
}))

// CHANGE the table header — add Approve column:
{['View', 'Create', 'Edit', 'Delete', 'Approve'].map((label) => (
  <th key={label} style={{ textAlign: 'center', padding: '12px 16px' }}>
    {label === 'Approve'
      ? <span title="Can approve/reject leave requests">Approve</span>
      : label}
  </th>
))}

// CHANGE the table body — render canApprove checkbox:
{(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const).map((key) => {
  const disabled =
    (key !== 'canView' && !perm.canView) ||
    // Approve only makes sense on leaves module
    (key === 'canApprove' && perm.module !== 'leaves')
  return (
    <td key={key} style={{ textAlign: 'center', padding: '12px 16px' }}>
      <input
        type="checkbox"
        checked={perm[key]}
        disabled={disabled}
        onChange={(event) => updatePermission(perm.module, key, event.target.checked)}
        style={{ accentColor: 'var(--sage)', cursor: disabled ? 'not-allowed' : 'pointer' }}
      />
    </td>
  )
})}

// ADD toast on save failure too:
const save = async () => {
  const payload = permissions.map((perm) => ({
    ...perm,
    canCreate:  perm.canView ? perm.canCreate  : false,
    canEdit:    perm.canView ? perm.canEdit    : false,
    canDelete:  perm.canView ? perm.canDelete  : false,
    canApprove: perm.canView ? perm.canApprove : false,
  }))

  const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
    `/api/roles/${roleId}/permissions`,
    { method: 'PUT', body: JSON.stringify(payload) }
  )

  if (res.ok) {
    setToast('Permissions saved successfully')
    setToastVariant('success')
  } else {
    setToast(data?.error ?? 'Failed to save permissions')
    setToastVariant('error')
  }
}

// ADD toast state:
const [toast, setToast] = useState('')
const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success')

// CHANGE Toast render:
{toast ? (
  <Toast
    message={toast}
    variant={toastVariant}
    onClose={() => setToast('')}
  />
) : null}
```

---

## Issue 5 — Leave assignment + approval: member only sees their assigned leaves, can approve/reject with proper RBAC

### What needs to change
Currently:
- Admin assigns a leave to a member
- Member sees ALL leaves in their scope, but can only act on their assigned ones
- The `canApprove` permission (new) gates whether they can approve/reject

The member's leaves page needs to clearly differentiate:
- **My assigned leaves** (can approve/reject if `canApprove = true`)
- **Other leaves in my scope** (read-only, just for visibility)

### Update `app/api/permissions/route.ts` — return `canApprove` in member permissions

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'MEMBER') return err('Forbidden', 403)

    // Fresh from DB — not from JWT (JWT may be stale if role changed)
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

### Replace `app/member/leaves/page.tsx` — show assigned badge, approval gated by canApprove

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiJson } from '@/lib/api/client'
import Table from '@/components/ui/Table'
import StatusBadge from '@/components/ui/StatusBadge'
import Toast from '@/components/ui/Toast'

type Leave = {
  id: string
  reason: string
  fromDate: string
  toDate: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  student: { name: string; rollNumber: string }
  assignedTo?: { id: string; name: string } | null
}

type Permission = { module: string; canApprove: boolean; canView: boolean }

const filters = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const
type Filter = (typeof filters)[number]

// Decode JWT sub without a library
function getMyId(): string | null {
  try {
    const token = localStorage.getItem('accessToken') ?? ''
    const part = token.split('.')[1] ?? ''
    const padded = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    return (JSON.parse(atob(padded)) as { sub?: string }).sub ?? null
  } catch { return null }
}

export default function MemberLeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [filter, setFilter] = useState<Filter>('ALL')
  const [myId, setMyId] = useState<string | null>(null)
  const [canApprove, setCanApprove] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(null)

  const load = async () => {
    setLoading(true)
    const [leavesRes, permsRes] = await Promise.all([
      apiJson<{ ok: boolean; data: Leave[] }>('/api/leaves'),
      apiJson<{ ok: boolean; data: Permission[] }>('/api/permissions'),
    ])
    if (leavesRes.data?.ok) setLeaves(leavesRes.data.data)
    if (permsRes.data?.ok) {
      const leavesPerm = permsRes.data.data.find((p) => p.module === 'leaves')
      setCanApprove(leavesPerm?.canApprove ?? false)
    }
    setLoading(false)
  }

  useEffect(() => {
    setMyId(getMyId())
    load()
  }, [])

  const filteredLeaves = useMemo(() => {
    if (filter === 'ALL') return leaves
    return leaves.filter((l) => l.status === filter)
  }, [filter, leaves])

  const act = async (id: string, action: 'approve' | 'reject') => {
    if (!window.confirm(action === 'approve' ? 'Approve this leave?' : 'Reject this leave?')) return
    const { res, data } = await apiJson<{ ok: boolean; error?: string }>(
      `/api/leaves/${id}/${action}`,
      { method: 'PUT' }
    )
    if (!res.ok || !data?.ok) {
      setToast({ message: data?.error ?? `Failed to ${action} leave`, variant: 'error' })
    } else {
      setToast({ message: `Leave ${action === 'approve' ? 'approved' : 'rejected'}`, variant: 'success' })
      load()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
        Leaves
      </h1>

      <div style={{ display: 'flex', gap: '8px' }}>
        {filters.map((item) => {
          const active = item === filter
          return (
            <button
              key={item}
              onClick={() => setFilter(item)}
              style={{
                padding: '8px 12px',
                borderRadius: '999px',
                border: '1px solid var(--border)',
                background: active ? 'var(--sage-light)' : 'var(--surface)',
                color: active ? 'var(--sage-dark)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: active ? 600 : 500,
              }}
            >
              {item.toLowerCase()}
            </button>
          )
        })}
      </div>

      <Table
        loading={loading}
        columns={[
          { key: 'student', label: 'Student', render: (item: Leave) => item.student.name },
          { key: 'roll', label: 'Roll No', render: (item: Leave) => item.student.rollNumber },
          { key: 'reason', label: 'Reason' },
          {
            key: 'fromDate',
            label: 'From',
            render: (item: Leave) => new Date(item.fromDate).toLocaleDateString(),
          },
          {
            key: 'toDate',
            label: 'To',
            render: (item: Leave) => new Date(item.toDate).toLocaleDateString(),
          },
          { key: 'status', label: 'Status', render: (item: Leave) => <StatusBadge status={item.status} /> },
          {
            key: 'assigned',
            label: 'Assigned',
            render: (item: Leave) => {
              const isMine = myId && item.assignedTo?.id === myId
              if (!item.assignedTo) return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Unassigned</span>
              return (
                <span style={{
                  fontSize: '12px',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  background: isMine ? 'var(--sage-light)' : 'var(--surface-2)',
                  color: isMine ? 'var(--sage-dark)' : 'var(--text-secondary)',
                  fontWeight: isMine ? 600 : 400,
                }}>
                  {isMine ? 'You' : item.assignedTo.name}
                </span>
              )
            },
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (item: Leave) => {
              const isMine = myId && item.assignedTo?.id === myId
              // Only show approve/reject if: this leave is assigned to me, it's PENDING, and I have canApprove
              if (item.status === 'PENDING' && isMine && canApprove) {
                return (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => act(item.id, 'approve')}
                      style={{
                        background: 'var(--mint)',
                        color: '#1a5c3a',
                        border: '1px solid var(--border)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => act(item.id, 'reject')}
                      style={{
                        background: 'var(--rose)',
                        color: '#7a2020',
                        border: '1px solid var(--border)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )
              }
              if (item.status === 'PENDING' && isMine && !canApprove) {
                return (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    No approve permission
                  </span>
                )
              }
              return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
            },
          },
        ]}
        data={filteredLeaves}
        emptyMessage="No leaves found."
      />

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
```

---

## Issue 6 — Toast component needs `variant` prop (currently only accepts `message`)

**Replace `components/ui/Toast.tsx`:**
```tsx
'use client'

import { useEffect, useState } from 'react'

type ToastProps = {
  message: string
  variant?: 'success' | 'error' | 'info'
  onClose: () => void
}

const CONFIG = {
  success: { bg: 'var(--mint)',     color: '#1a5c3a', icon: '✓' },
  error:   { bg: 'var(--rose)',     color: '#7a2020', icon: '✕' },
  info:    { bg: 'var(--sky, #b8d4e8)', color: '#1a3a5c', icon: 'ℹ' },
}

export default function Toast({ message, variant = 'success', onClose }: ToastProps) {
  const [visible, setVisible] = useState(true)
  const c = CONFIG[variant]

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(false), 3200)
    const t2 = setTimeout(onClose, 3500)
    return () => { clearTimeout(t1); clearTimeout(t2) }
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
      padding: '12px 16px',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-md)',
      fontWeight: 500,
      fontSize: '14px',
      zIndex: 9999,
      maxWidth: '360px',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      <span style={{ fontWeight: 700 }}>{c.icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300) }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: c.color, fontSize: '14px', opacity: 0.7, padding: 0,
        }}
      >✕</button>
    </div>
  )
}
```

---

## Execution order for Codex

1. `prisma/schema.prisma` — add `canApprove` field to `RolePermission`
2. Run: `npx prisma migrate dev --name add_can_approve`
3. `lib/prisma.ts` — singleton fix
4. `next.config.ts` — add `serverExternalPackages`
5. `components/ui/Toast.tsx` — replace with variant-aware version
6. `components/ui/Table.tsx` — replace with skeleton loading version
7. `app/api/dashboard/route.ts` — create (single round-trip dashboard)
8. `app/api/roles/[id]/route.ts` — add GET handler alongside existing DELETE
9. `app/api/roles/[id]/permissions/route.ts` — add `canApprove` to schema and PUT
10. `lib/rbac.ts` — add `canApprove` to Action type
11. `app/api/leaves/[id]/approve/route.ts` — change `canEdit` → `canApprove`
12. `app/api/leaves/[id]/reject/route.ts` — change `canEdit` → `canApprove`
13. `app/api/permissions/route.ts` — fetch fresh from DB
14. `app/admin/dashboard/page.tsx` — use new `/api/dashboard` endpoint
15. `app/admin/roles/page.tsx` — add `loading` state to Table
16. `app/admin/roles/[id]/page.tsx` — use new GET `/api/roles/:id`, add `canApprove` column, fix toast
17. `app/admin/members/page.tsx` — add `loading` state
18. `app/admin/students/page.tsx` — add `loading` state
19. `app/admin/leaves/page.tsx` — add `loading` state
20. `app/member/leaves/page.tsx` — full replacement (canApprove gating, assigned badge, toasts)
21. `app/(auth)/login/page.tsx` — fix stale selectedCollege on input edit