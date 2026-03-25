# KEC Hostel — Full Feature Audit & Implementation Roadmap with Microsteps

> Repo: `https://github.com/Subiksha1705/kec-hostel.git`  
> Stack: Next.js 14 (App Router), TypeScript, Prisma, PostgreSQL, JWT auth  
> Audited: March 2026

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema Status](#2-database-schema-status)
3. [Superadmin — What's Done vs Pending](#3-superadmin)
4. [Admin — What's Done vs Pending](#4-admin)
5. [Role / Member — What's Done vs Pending](#5-role--member)
6. [Student — What's Done vs Pending](#6-student)
7. [Extra Things Already Built (Keep Them)](#7-extra-things-already-built-keep-them)
8. [Step-by-Step Implementation Plan with Microsteps](#8-step-by-step-implementation-plan-with-microsteps)
9. [API Reference — Current Endpoints](#9-api-reference--current-endpoints)

---

## 1. Architecture Overview

The project is a **multi-tenant hostel management system**. Every piece of data belongs to a `College`. There are four actor types, each with their own auth flow and route namespace:

| Actor | Route namespace | JWT `type` field | Auth endpoint |
|---|---|---|---|
| Superadmin | `/admin` (shared) | `SUPER` | `/api/auth/super/login` |
| Admin | `/admin` | `ADMIN` | `/api/auth/admin/login` |
| Member (staff) | `/member` | `MEMBER` | `/api/auth/member/login` |
| Student | `/student` | `STUDENT` | `/api/auth/student/login` |

### How auth works

All tokens are JWTs stored in **httpOnly cookies** (`accessToken` / `refreshToken`) and also in `localStorage` (for the client-side `AuthGuard`). The `middleware.ts` file guards route prefixes:

```
/admin  → requires type ADMIN or SUPER
/member → requires type MEMBER
/student → requires type STUDENT
```

The JWT payload carries `sub` (entity ID), `type`, `collegeId`, and for members also `roleId`, `classId`, `hostelId`. API routes call `getSession(req)` from `lib/auth/session.ts` which reads the `Authorization: Bearer <token>` header and verifies the JWT. This means all API requests from the frontend must include the token in the Authorization header — `lib/api/client.ts` handles this automatically by reading from `localStorage`.

### How RBAC works

Members have a `Role`. Each `Role` has a set of `RolePermission` rows — one per module (`students`, `leaves`, `complaints`). Each row has five boolean flags: `canView | canCreate | canEdit | canDelete | canApprove`.

`lib/rbac.ts` exports `requirePermission(roleId, module, action)` which throws `'FORBIDDEN'` if the member's role lacks the required flag. Admins bypass RBAC entirely — `requirePermission` should only be called when `session.type === 'MEMBER'`.

### How scope works

Members can be restricted to a specific `classId` or `hostelId` (set when they are created). `lib/scope.ts` exports:

- `assertScope(member, student)` — throws `'SCOPE_DENIED'` if the student is outside the member's assigned scope
- `scopeFilter(member)` — returns a Prisma `where` fragment that filters queries to only the member's class/hostel

---

## 2. Database Schema Status

All models for the core features are already in `prisma/schema.prisma`. The schema needs two small additions for the chatbot and hostel info feature.

| Model | Purpose | Status |
|---|---|---|
| `College` | Multi-tenant root | ✅ Complete |
| `Admin` | College admin user | ✅ Complete |
| `Role` | Staff roles | ✅ Complete |
| `RolePermission` | Per-module CRUD+Approve flags | ✅ Complete |
| `AdminMember` | Staff accounts with scope | ✅ Complete |
| `Class` | Class groupings | ✅ Complete |
| `Hostel` | Hostel groupings | ✅ Complete — needs 3 new fields |
| `Student` | Student accounts | ✅ Complete |
| `Leave` | Leave requests + approval chain | ✅ Complete |
| `Complaint` | Student complaints | ✅ In schema — no UI yet |
| `Review` | Student reviews | ✅ In schema — no UI yet |
| `Gallery` | Hostel images | ✅ In schema — no UI yet |

**Schema additions needed (Step 5):**

```prisma
model Hostel {
  // ... existing fields ...
  description    String?   // shown on student hostel info page
  rules          String?   // hostel rules
  chatbotContext String?   // the text the admin writes for the chatbot
}
```

No other schema changes needed for Steps 1–4 and 6–8.

---

## 3. Superadmin

### What is built

- ✅ `POST /api/auth/super/login` — checks email against `SUPER_ADMIN_EMAIL` env var, verifies password from DB, issues JWT with `type: 'SUPER'`. The middleware lets SUPER tokens access `/admin` routes.
- ✅ `scripts/create_college.ts` — CLI script to create a college
- ✅ `scripts/create_super_admin.ts` — CLI script to create/upsert an admin user with optional college creation

### What is pending

- ❌ No superadmin UI — no `/superadmin` page, no college list, no create college form, no create admin form

---

## 4. Admin

### What is built

- ✅ Login (`/api/auth/admin/login`) — bcrypt password verify, JWT with `type: 'ADMIN'`
- ✅ Dashboard (`/admin/dashboard`) — stats via `/api/dashboard`: student count, member count, role count, pending leaves
- ✅ Role management (`/admin/roles`) — full CRUD + permission matrix per module
- ✅ Member management (`/admin/members`) — full CRUD + bulk Excel import
- ✅ Student management (`/admin/students`) — full CRUD with class/hostel assignment

### What is partially built

- ⚠️ Leave approval (`/admin/leaves`) — admin can view all leaves and assign them to members, but **cannot directly approve or reject** — there are no approve/reject buttons in the admin UI even though the APIs support it

### What is pending

- ❌ Complaint viewer — model exists in DB, no `/admin/complaints` page, no GET/PUT complaint API routes
- ❌ Chatbot context editor — no `/admin/hostel-info` page, no API to save chatbot context
- ❌ Hostel info management — no admin page to view/edit hostel details

---

## 5. Role / Member

### What is built

- ✅ Member login (`/api/auth/member/login`)
- ✅ Member dashboard (`/member/dashboard`) — scoped stats
- ⚠️ Student view (`/member/students`) — page exists, scope filter applied in API, but `canCreate`/`canEdit`/`canDelete` RBAC checks are missing on POST/PUT/DELETE routes; action buttons don't hide based on permissions
- ⚠️ Leave management (`/member/leaves`) — page exists, `canApprove` is checked before showing approve/reject buttons, but only leaves assigned to the current member are shown

### What is pending

- ❌ Complaint viewer — no `/member/complaints` page
- ❌ Guest dashboard — not designed, no model, no auth, no routes

---

## 6. Student

### What is built

- ✅ Student login (`/api/auth/student/login`)
- ✅ Dashboard (`/student/dashboard`) — leave summary
- ✅ Leave request (`/student/leaves`) — submit with reason/dates, view history with status

### What is pending

- ❌ Complaint register — model in DB, no `/student/complaints` page, no POST complaint API
- ❌ Hostel info — no `/student/hostel-info` page
- ❌ Chatbot — no widget, no `/api/chatbot` route

---

## 7. Extra Things Already Built (Keep Them)

- ✅ **RBAC system** (`lib/rbac.ts`) — `requirePermission()` and `loadPermissions()` — solid, already used in several routes
- ✅ **Scope system** (`lib/scope.ts`) — `assertScope()` and `scopeFilter()` — already wired in leaves and students GET
- ✅ **Bulk member import** (`/api/members/bulk`) — Excel upload with created/skipped result report
- ✅ **Gallery model** — ready for hostel info image feature
- ✅ **Review model** — ready for student review/chatbot feature
- ✅ **Reusable UI components** — `Modal`, `Table`, `StatusBadge`, `Toast` — use these in every new page

---

## 8. Step-by-Step Implementation Plan with Microsteps

---

### Step 1 — Fix Leave Approval UX for Admin and Member

**Estimated time:** 1 day  
**Why first:** The APIs already exist. This is purely a frontend change. Small effort, immediate value.

**The problem:**  
In `app/admin/leaves/page.tsx`, the actions column only shows an "Assign" button for unassigned pending leaves. Once assigned, it shows the text "Assigned" with no further action. The admin has no approve/reject button at all, even though `PUT /api/leaves/[id]/approve` and `PUT /api/leaves/[id]/reject` already support `type: 'ADMIN'` callers without any assignment constraint.

In `app/member/leaves/page.tsx`, leaves assigned to the current member show correctly but the approve/reject buttons are only wired if `canApprove` is true from the permissions API.

---

#### Microsteps — Admin leave page

**1.1** Open `app/admin/leaves/page.tsx`.

**1.2** Add two new handler functions after the existing `assign` function:

```ts
const approveDirect = async (id: string) => {
  await apiJson(`/api/leaves/${id}/approve`, { method: 'PUT', body: JSON.stringify({}) })
  load()
}

const rejectDirect = async (id: string) => {
  await apiJson(`/api/leaves/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason: '' }) })
  load()
}
```

**1.3** In the `columns` array, find the `actions` render function. It currently has three branches:
- Pending + unassigned → shows "Assign" button
- Not pending → shows "Reviewed by X"
- Pending + assigned → shows "Assigned" text

**1.4** Replace the third branch (pending + assigned, currently shows plain "Assigned" text) and merge it with the first branch so that **all pending leaves** (assigned or not) show both "Assign" and direct "Approve"/"Reject" buttons:

```tsx
render: (item: Leave) => {
  if (item.status !== 'PENDING') {
    return (
      <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
        Reviewed by {item.reviewedBy?.name ?? 'Member'}
      </span>
    )
  }
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {!item.assignedTo && (
        <button
          onClick={() => setAssigning(item)}
          style={{
            background: 'var(--surface-2)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            padding: '5px 10px',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Assign
        </button>
      )}
      <button
        onClick={() => approveDirect(item.id)}
        style={{
          background: 'var(--mint)',
          color: '#1a5c3a',
          border: '1px solid var(--border)',
          padding: '5px 10px',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        Approve
      </button>
      <button
        onClick={() => rejectDirect(item.id)}
        style={{
          background: 'var(--rose)',
          color: '#7a2020',
          border: '1px solid var(--border)',
          padding: '5px 10px',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          fontSize: '13px',
        }}
      >
        Reject
      </button>
    </div>
  )
}
```

**1.5** Save and verify that:
- Pending leaves now show all three buttons (Assign, Approve, Reject)
- Clicking Approve calls `/api/leaves/[id]/approve` and refreshes the list
- Clicking Reject calls `/api/leaves/[id]/reject` and refreshes the list
- Non-pending leaves still show the reviewer name

---

#### Microsteps — Member leave page

**1.6** Open `app/member/leaves/page.tsx`.

**1.7** Notice the page already decodes `myId` from the JWT using `getMyId()` and fetches `canApprove` from `/api/permissions`. The issue is that the leave list from `/api/leaves` for a member only returns leaves where `assignedTo.id === session.sub` (enforced in the API). So members only see their assigned leaves — this is correct behaviour. The approve/reject buttons just need to always be shown for pending leaves when `canApprove` is true (they currently are, but verify).

**1.8** In the `columns` render for actions, confirm the current logic shows approve/reject buttons when `item.status === 'PENDING' && canApprove`. If it checks `item.assignedTo?.id === myId` additionally, **remove that extra check** — if the leave is returned from the API, it is already assigned to this member, so the additional check is redundant and can cause buttons to not appear due to the fragile JWT decode.

**1.9** Add two handler functions if not already present:

```ts
const approve = async (id: string) => {
  const { res } = await apiJson(`/api/leaves/${id}/approve`, { method: 'PUT', body: JSON.stringify({}) })
  if (res.ok) setToast({ message: 'Leave approved', variant: 'success' })
  else setToast({ message: 'Failed to approve', variant: 'error' })
  load()
}

const reject = async (id: string) => {
  const { res } = await apiJson(`/api/leaves/${id}/reject`, { method: 'PUT', body: JSON.stringify({}) })
  if (res.ok) setToast({ message: 'Leave rejected', variant: 'success' })
  else setToast({ message: 'Failed to reject', variant: 'error' })
  load()
}
```

**1.10** Test the full flow end-to-end:
- Admin submits a leave (logged in as student)
- Admin assigns the leave to a member
- Member logs in and sees the leave in their list
- Member approves — status changes to APPROVED
- Student dashboard reflects the updated status

---

### Step 2 — Complaint Register for Students

**Estimated time:** 1–2 days  
**Why second:** The DB model is complete (`Complaint` with `title`, `description`, `status`, `studentId`). No schema changes needed. Gives students a new feature immediately.

---

#### Microsteps — API

**2.1** Create the file `app/api/complaints/route.ts`.

**2.2** Add the GET handler — returns complaints scoped by caller type:

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/rbac'
import { scopeFilter } from '@/lib/scope'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
})

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)

    let where: object

    if (session.type === 'ADMIN' || session.type === 'SUPER') {
      // Admin sees all complaints for their college
      where = {
        student: { collegeId: session.collegeId },
      }
    } else if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'complaints', 'canView')
      // Member sees scoped complaints (filtered by their class/hostel)
      const filter = scopeFilter({
        collegeId: session.collegeId,
        classId: session.classId ?? null,
        hostelId: session.hostelId ?? null,
      })
      where = { student: filter }
    } else if (session.type === 'STUDENT') {
      // Student sees only their own complaints
      where = { studentId: session.sub }
    } else {
      return err('Forbidden', 403)
    }

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return ok(complaints)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    return err(msg, 500)
  }
}
```

**2.3** Add the POST handler in the same file — students only:

```ts
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'STUDENT') return err('Only students can submit complaints', 403)

    const body = createSchema.parse(await req.json())

    const student = await prisma.student.findUnique({ where: { id: session.sub } })
    if (!student) return err('Student not found', 404)

    const complaint = await prisma.complaint.create({
      data: {
        studentId: session.sub,
        title: body.title,
        description: body.description,
        status: 'PENDING',
      },
    })

    return ok(complaint, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
```

**2.4** Create the file `app/api/complaints/[id]/route.ts` for status updates:

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/rbac'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const updateSchema = z.object({
  status: z.enum(['PENDING', 'RESOLVED']),
})

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = getSession(req)

    if (session.type === 'STUDENT') return err('Forbidden', 403)

    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'complaints', 'canEdit')
    }

    const body = updateSchema.parse(await req.json())

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: { student: { select: { collegeId: true } } },
    })

    if (!complaint || complaint.student.collegeId !== session.collegeId) {
      return err('Not found', 404)
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: { status: body.status },
    })

    return ok(updated)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
```

---

#### Microsteps — Student complaints page

**2.5** Create the file `app/student/complaints/page.tsx`.

**2.6** Add the following state at the top of the component:

```ts
const [complaints, setComplaints] = useState<Complaint[]>([])
const [isOpen, setIsOpen] = useState(false)
const [title, setTitle] = useState('')
const [description, setDescription] = useState('')
const [error, setError] = useState('')
const [loading, setLoading] = useState(true)
```

**2.7** Define a `Complaint` type matching the API response:

```ts
type Complaint = {
  id: string
  title: string
  description: string
  status: 'PENDING' | 'RESOLVED'
  createdAt: string
}
```

**2.8** Add a `load` function and call it in `useEffect`:

```ts
const load = async () => {
  setLoading(true)
  const { data } = await apiJson<{ ok: boolean; data: Complaint[] }>('/api/complaints')
  if (data?.ok) setComplaints(data.data)
  setLoading(false)
}
useEffect(() => { load() }, [])
```

**2.9** Add a `submit` function:

```ts
const submit = async () => {
  setError('')
  if (!title.trim() || !description.trim()) {
    setError('Please fill both title and description')
    return
  }
  const { res, data } = await apiJson<{ ok: boolean; error?: string }>('/api/complaints', {
    method: 'POST',
    body: JSON.stringify({ title: title.trim(), description: description.trim() }),
  })
  if (!res.ok || !data?.ok) {
    setError(data?.error ?? 'Failed to submit complaint')
    return
  }
  setTitle('')
  setDescription('')
  setIsOpen(false)
  load()
}
```

**2.10** Build the JSX. Use the existing `Modal`, `Table`, and `StatusBadge` components (same pattern as `student/leaves/page.tsx`):

- A heading "My Complaints" and a "Register Complaint" button
- A `Modal` with a Title input and a Description textarea and a Submit button and an error message div if `error` is set
- A `Table` with columns: Title, Description (truncated to 60 chars), Status (use `StatusBadge`), Date

**2.11** Add "Complaints" to the student sidebar in `components/layout/Sidebar.tsx`. Find the student `navItems` array and append:

```ts
{ href: '/student/complaints', label: 'Complaints', icon: <MessageSquare size={18} /> }
```

Import `MessageSquare` from `lucide-react` at the top of Sidebar.tsx.

---

### Step 3 — Complaint Viewer for Admin and Members

**Estimated time:** 1–2 days  
**Why third:** Depends on Step 2 (the API routes must exist). Admin and members need to see and resolve complaints.

---

#### Microsteps — Admin complaints page

**3.1** Create the file `app/admin/complaints/page.tsx`.

**3.2** Define the type:

```ts
type Complaint = {
  id: string
  title: string
  description: string
  status: 'PENDING' | 'RESOLVED'
  createdAt: string
  student: { name: string; rollNumber: string }
}
```

**3.3** Add state: `complaints`, `filter` (`'ALL' | 'PENDING' | 'RESOLVED'`), `loading`.

**3.4** Add `load` function calling `GET /api/complaints`.

**3.5** Add `resolve` function:

```ts
const resolve = async (id: string) => {
  await apiJson(`/api/complaints/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'RESOLVED' }),
  })
  load()
}
```

**3.6** Build JSX with:
- A heading "Complaints"
- Three filter pills: ALL / PENDING / RESOLVED (same pattern as admin leaves page — copy the filter button row and replace the `filters` array)
- A `Table` with columns: Student Name, Roll No, Title, Description (truncated), Status (StatusBadge), Date, Actions
- Actions column: show "Mark Resolved" button only when `item.status === 'PENDING'`; show "Resolved" text otherwise

**3.7** Add "Complaints" to the admin sidebar in `Sidebar.tsx`. Find the admin `navItems` array and append:

```ts
{ href: '/admin/complaints', label: 'Complaints', icon: <MessageSquare size={18} /> }
```

Also import `MessageSquare` from `lucide-react` if not already imported.

---

#### Microsteps — Member complaints page

**3.8** Create `app/member/complaints/page.tsx` — almost identical to the admin complaints page with two differences:

**3.9** At the top of `load`, first fetch permissions:

```ts
const { data: permsData } = await apiJson<{ ok: boolean; data: Permission[] }>('/api/permissions')
const complaintsPermission = permsData?.data?.find(p => p.module === 'complaints')
setCanEdit(complaintsPermission?.canEdit ?? false)
```

Add `canEdit` state: `const [canEdit, setCanEdit] = useState(false)`.

**3.10** In the actions column, only show "Mark Resolved" button if `canEdit` is true. If `canEdit` is false and status is PENDING, show a plain "-" or nothing.

**3.11** Add "Complaints" to the member sidebar. Find the member `navItems` in `Sidebar.tsx`. The sidebar already dynamically loads permissions for `students` and `leaves`. Extend this to also load `complaints` canView:

```ts
// In the useEffect that fetches permissions for MEMBER:
const complaints = perms.find((p) => p.module === 'complaints')?.canView ?? false
setPermissions({ students, leaves, complaints })
```

Update the state type: `{ students: boolean; leaves: boolean; complaints: boolean }` and default value. Then in the member `navItems`:

```ts
...(permissions.complaints
  ? [{ href: '/member/complaints', label: 'Complaints', icon: <MessageSquare size={18} /> }]
  : []),
```

---

### Step 4 — Apply RBAC Consistently to Member Routes

**Estimated time:** 1 day  
**Why fourth:** Before adding more features, harden what exists so member permissions are actually enforced.

---

#### Microsteps — Students API

**4.1** Open `app/api/students/[id]/route.ts`.

**4.2** In the `PUT` handler, find where it currently only checks for `ADMIN`/`SUPER`:

```ts
if (session.type !== 'ADMIN' && session.type !== 'SUPER') return err('Forbidden', 403)
```

Replace with:

```ts
if (session.type === 'MEMBER') {
  await requirePermission(session.roleId!, 'students', 'canEdit')
  // Also assert scope — the student must be in the member's class/hostel
  const student = await prisma.student.findUnique({ where: { id }, select: { classId: true, hostelId: true, collegeId: true } })
  if (!student || student.collegeId !== session.collegeId) return err('Not found', 404)
  assertScope({ classId: session.classId ?? null, hostelId: session.hostelId ?? null }, student)
} else if (session.type !== 'ADMIN' && session.type !== 'SUPER') {
  return err('Forbidden', 403)
}
```

Import `assertScope` from `@/lib/scope` if not already imported.

**4.3** In the `DELETE` handler, apply the same pattern but with `'canDelete'` instead of `'canEdit'`.

**4.4** In `app/api/students/route.ts`, the `POST` handler currently only allows `ADMIN`/`SUPER`. Add member support:

```ts
if (session.type === 'MEMBER') {
  await requirePermission(session.roleId!, 'students', 'canCreate')
} else if (session.type !== 'ADMIN' && session.type !== 'SUPER') {
  return err('Forbidden', 403)
}
```

---

#### Microsteps — Member student page UI

**4.5** Open `app/member/students/page.tsx`.

**4.6** At the start of the `load` function (or in a separate `useEffect`), fetch permissions:

```ts
const { data: permsData } = await apiJson<{ ok: boolean; data: Permission[] }>('/api/permissions')
const studentPerm = permsData?.data?.find(p => p.module === 'students')
setCanCreate(studentPerm?.canCreate ?? false)
setCanEdit(studentPerm?.canEdit ?? false)
setCanDelete(studentPerm?.canDelete ?? false)
```

**4.7** Add state variables: `canCreate`, `canEdit`, `canDelete` (all boolean, default false).

**4.8** In the JSX:
- Only show the "Add Student" button if `canCreate` is true
- Only show the "Edit" button in the table row if `canEdit` is true
- Only show the "Delete" button in the table row if `canDelete` is true

---

#### Microsteps — Verify scope on member leaves

**4.9** Open `app/api/leaves/route.ts`. The GET handler for MEMBER already uses `scopeFilter` — this is correct. Verify that the filter uses the member's `classId` and `hostelId` from the session (they come from the JWT payload, set during member login). No changes needed here — just confirm it works by logging in as a member with a scoped hostelId and verifying they only see leaves from students in that hostel.

---

### Step 5 — Hostel Info Management

**Estimated time:** 2–3 days  
**Why fifth:** Needed before the chatbot can work. Admin writes context; student reads it.

---

#### Microsteps — Schema migration

**5.1** Open `prisma/schema.prisma`. Find the `Hostel` model and add three new optional fields:

```prisma
model Hostel {
  id             String   @id @default(uuid())
  name           String
  location       String
  capacity       Int
  collegeId      String
  createdAt      DateTime @default(now())
  description    String?
  rules          String?
  chatbotContext String?

  college   College       @relation(fields: [collegeId], references: [id])
  students  Student[]
  members   AdminMember[]
}
```

**5.2** Run the migration:

```bash
npx prisma migrate dev --name add_hostel_info_fields
```

**5.3** Run `npx prisma generate` to regenerate the Prisma client.

---

#### Microsteps — API routes

**5.4** Create the file `app/api/hostel-info/route.ts`.

**5.5** Add the GET handler — any authenticated user can read hostel info for their college:

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)

    const hostel = await prisma.hostel.findFirst({
      where: { collegeId: session.collegeId },
      select: {
        id: true,
        name: true,
        location: true,
        capacity: true,
        description: true,
        rules: true,
        // Do NOT expose chatbotContext to students — only the chatbot API uses it internally
      },
    })

    if (!hostel) return err('No hostel found for this college', 404)

    return ok(hostel)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
```

**5.6** Add the PUT handler — admin only, updates all hostel info fields including chatbotContext:

```ts
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  capacity: z.number().int().positive().optional(),
  description: z.string().optional(),
  rules: z.string().optional(),
  chatbotContext: z.string().optional(),
})

export async function PUT(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN' && session.type !== 'SUPER') return err('Forbidden', 403)

    const body = updateSchema.parse(await req.json())

    const hostel = await prisma.hostel.findFirst({ where: { collegeId: session.collegeId } })
    if (!hostel) return err('No hostel found for this college', 404)

    const updated = await prisma.hostel.update({
      where: { id: hostel.id },
      data: body,
    })

    return ok(updated)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
```

---

#### Microsteps — Admin hostel info editor page

**5.7** Create `app/admin/hostel-info/page.tsx`.

**5.8** Add state: `form` object with fields `name`, `location`, `capacity`, `description`, `rules`, `chatbotContext`; also `loading` and `saving` and `success` boolean.

**5.9** Add a `load` function that fetches from `GET /api/hostel-info` and populates the form state.

**5.10** Add a `save` function that calls `PUT /api/hostel-info` with the form state and shows a success message.

**5.11** Build JSX with these fields:
- **Hostel Name** — text input
- **Location** — text input
- **Capacity** — number input
- **Description** — `<textarea>` (3–4 rows) — shown on student hostel info page
- **Rules** — `<textarea>` (5–6 rows) — shown on student hostel info page
- **Chatbot Context** — `<textarea>` (8–10 rows) — with a helper text below: *"This text is used as knowledge for the chatbot. Write hostel rules, FAQs, timings, and any information students commonly ask about."*
- A "Save Changes" button that calls `save()`
- A success message when `saving` completes

**5.12** Add "Hostel Info" to the admin sidebar navItems:

```ts
{ href: '/admin/hostel-info', label: 'Hostel Info', icon: <Building size={18} /> }
```

Import `Building` from `lucide-react`.

---

#### Microsteps — Student hostel info page

**5.13** Create `app/student/hostel-info/page.tsx`.

**5.14** Add state: `hostel` (the API response object), `loading`.

**5.15** Fetch from `GET /api/hostel-info` in `useEffect`.

**5.16** Build JSX — read-only display:

- A heading "Hostel Information"
- Info cards: Name, Location, Capacity (students)
- A "Description" section — render the `description` text in a readable block
- A "Rules" section — render the `rules` text, ideally split by newlines into a list

**5.17** Add "Hostel Info" to the student sidebar navItems:

```ts
{ href: '/student/hostel-info', label: 'Hostel Info', icon: <Building size={18} /> }
```

---

### Step 6 — Superadmin UI

**Estimated time:** 2–3 days  
**Why sixth:** Currently manageable via CLI, but needed for non-technical operators.

---

#### Microsteps — New API routes

**6.1** Create `app/api/superadmin/colleges/route.ts`.

**6.2** Add a helper guard at the top of each superadmin route — create `lib/auth/superGuard.ts`:

```ts
import { JwtPayload } from './jwt'
import { err } from '@/lib/api/response'

export function requireSuper(session: JwtPayload) {
  if (session.type !== 'SUPER') return err('Forbidden — superadmin only', 403)
  return null
}
```

**6.3** Add GET handler in `app/api/superadmin/colleges/route.ts`:

```ts
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    const guard = requireSuper(session)
    if (guard) return guard

    const colleges = await prisma.college.findMany({
      include: { admins: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return ok(colleges)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
```

**6.4** Add POST handler in the same file — creates a college:

```ts
const createCollegeSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  domain: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    const guard = requireSuper(session)
    if (guard) return guard

    const body = createCollegeSchema.parse(await req.json())

    const college = await prisma.college.create({
      data: { name: body.name, location: body.location, domain: body.domain },
    })

    return ok(college, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
```

**6.5** Create `app/api/superadmin/admins/route.ts` — creates an admin for a given college:

```ts
const createAdminSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  collegeId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    const guard = requireSuper(session)
    if (guard) return guard

    const body = createAdminSchema.parse(await req.json())

    const college = await prisma.college.findUnique({ where: { id: body.collegeId } })
    if (!college) return err('College not found', 404)

    const existing = await prisma.admin.findUnique({ where: { email: body.email } })
    if (existing) return err('Email already in use', 409)

    const hashed = await hashPassword(body.password)

    const admin = await prisma.admin.create({
      data: { name: body.name, email: body.email, password: hashed, collegeId: body.collegeId },
    })

    const { password: _, ...safe } = admin
    return ok(safe, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
```

---

#### Microsteps — Superadmin colleges page

**6.6** The admin layout already allows `type: 'SUPER'` (see `AuthGuard` — it checks `allowedType === 'ADMIN' && type === 'SUPER'`). So a superadmin logging in can access `/admin` pages. The simplest approach is to add a conditional "Colleges" section to the admin sidebar that only appears when `userType === 'ADMIN'` and `localStorage.getItem('userType') === 'SUPER'`.

**6.7** In `Sidebar.tsx`, in the admin `navItems` useMemo, check for the SUPER type:

```ts
if (userType === 'ADMIN') {
  const isSuper = typeof window !== 'undefined' && localStorage.getItem('userType') === 'SUPER'
  return [
    { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    ...(isSuper ? [{ href: '/admin/colleges', label: 'Colleges', icon: <School size={18} /> }] : []),
    { href: '/admin/roles', label: 'Roles', icon: <Shield size={18} /> },
    // ... rest of items
  ]
}
```

Import `School` from `lucide-react`.

**6.8** Create `app/admin/colleges/page.tsx`.

**6.9** Add state: `colleges` array, `isOpen` for create modal, `form` with `name`, `location`, `domain` fields, `adminForm` with `name`, `email`, `password`, `collegeId`, `showAdminModal` boolean.

**6.10** Add `load` function fetching from `GET /api/superadmin/colleges`.

**6.11** Add `createCollege` function posting to `POST /api/superadmin/colleges`.

**6.12** Add `createAdmin` function posting to `POST /api/superadmin/admins`.

**6.13** Build JSX:
- Heading "Colleges" with a "Create College" button
- A `Table` with columns: College Name, Location, Domain, Admins (count or list of emails), Created At, Actions
- Actions column: a "Set Admin" button that opens `adminModal` with the `collegeId` pre-filled
- "Create College" `Modal` with Name, Location, Domain fields and a Submit button
- "Set Admin" `Modal` with Name, Email, Password fields and a Submit button

---

### Step 7 — Chatbot

**Estimated time:** 3–5 days  
**Why seventh:** Depends on Step 5 (chatbot context stored in DB). Most complex feature.

---

#### Microsteps — API

**7.1** Add `ANTHROPIC_API_KEY` to your `.env` file (get from console.anthropic.com):

```
ANTHROPIC_API_KEY=sk-ant-...
```

**7.2** Create `app/api/chatbot/route.ts`.

**7.3** Add the POST handler:

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  message: z.string().min(1).max(1000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional().default([]),
})

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'STUDENT' && session.type !== 'MEMBER') {
      return err('Forbidden', 403)
    }

    const { message, history } = schema.parse(await req.json())

    // Fetch the chatbot context saved by the admin
    const hostel = await prisma.hostel.findFirst({
      where: { collegeId: session.collegeId },
      select: { chatbotContext: true, name: true },
    })

    const systemPrompt = hostel?.chatbotContext
      ? `You are a helpful hostel assistant for ${hostel.name}. Use the following information to answer student questions accurately and helpfully.\n\n${hostel.chatbotContext}\n\nIf a question is not covered by the above information, say so politely and suggest the student contact the hostel office.`
      : `You are a helpful hostel assistant. Answer student questions politely. If you don't know something, suggest they contact the hostel office.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          ...history,
          { role: 'user', content: message },
        ],
      }),
    })

    if (!response.ok) {
      return err('Chatbot service unavailable', 503)
    }

    const data = await response.json()
    const reply = data.content?.[0]?.text ?? 'Sorry, I could not generate a response.'

    return ok({ reply })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid message', 400)
    return err(msg, 500)
  }
}
```

---

#### Microsteps — ChatbotWidget component

**7.4** Create `components/ChatbotWidget.tsx`.

**7.5** Add state:

```ts
const [open, setOpen] = useState(false)
const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
const [input, setInput] = useState('')
const [loading, setLoading] = useState(false)
const bottomRef = useRef<HTMLDivElement>(null)
```

**7.6** Add `send` function:

```ts
const send = async () => {
  const text = input.trim()
  if (!text || loading) return

  const newMessages = [...messages, { role: 'user' as const, content: text }]
  setMessages(newMessages)
  setInput('')
  setLoading(true)

  const { data } = await apiJson<{ ok: boolean; data: { reply: string } }>('/api/chatbot', {
    method: 'POST',
    body: JSON.stringify({
      message: text,
      history: messages, // send conversation history for context
    }),
  })

  const reply = data?.data?.reply ?? 'Sorry, something went wrong. Please try again.'
  setMessages([...newMessages, { role: 'assistant', content: reply }])
  setLoading(false)
}
```

**7.7** Add a `useEffect` that scrolls to `bottomRef` whenever `messages` changes:

```ts
useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages])
```

**7.8** Handle Enter key in the input:

```ts
const handleKey = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}
```

**7.9** Build JSX — two parts:

**The toggle button** (always visible, fixed bottom-right):

```tsx
<button
  onClick={() => setOpen(o => !o)}
  style={{
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: 'var(--sage)',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  }}
>
  <MessageCircle size={22} />
</button>
```

**The chat panel** (shown when `open` is true):

```tsx
{open && (
  <div style={{
    position: 'fixed',
    bottom: '88px',
    right: '24px',
    width: '340px',
    height: '460px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 200,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    overflow: 'hidden',
  }}>
    {/* Header */}
    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
      Hostel Assistant
    </div>

    {/* Messages */}
    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {messages.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
          Hi! Ask me anything about your hostel — timings, rules, facilities, or procedures.
        </p>
      )}
      {messages.map((msg, i) => (
        <div key={i} style={{
          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
          background: msg.role === 'user' ? 'var(--sage-light)' : 'var(--surface-2)',
          color: msg.role === 'user' ? 'var(--sage-dark)' : 'var(--text-primary)',
          padding: '8px 12px',
          borderRadius: '12px',
          maxWidth: '80%',
          fontSize: '14px',
          lineHeight: 1.5,
        }}>
          {msg.content}
        </div>
      ))}
      {loading && (
        <div style={{ alignSelf: 'flex-start', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Typing...
        </div>
      )}
      <div ref={bottomRef} />
    </div>

    {/* Input */}
    <div style={{ padding: '12px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px' }}>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Type a message..."
        style={{
          flex: 1,
          padding: '8px 12px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          fontSize: '14px',
        }}
      />
      <button
        onClick={send}
        disabled={loading || !input.trim()}
        style={{
          background: 'var(--sage)',
          color: 'white',
          border: 'none',
          borderRadius: 'var(--radius)',
          padding: '8px 12px',
          cursor: 'pointer',
        }}
      >
        Send
      </button>
    </div>
  </div>
)}
```

**7.10** Import `MessageCircle` from `lucide-react`.

**7.11** Open `app/student/layout.tsx`. Import `ChatbotWidget` and add it inside the return, after `<main>`:

```tsx
import ChatbotWidget from '@/components/ChatbotWidget'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedType="STUDENT">
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar userType="STUDENT" />
        <main style={{ flex: 1, padding: '32px' }}>{children}</main>
        <ChatbotWidget />
      </div>
    </AuthGuard>
  )
}
```

**7.12** Test the chatbot flow:
- Log in as admin, go to Hostel Info, write some chatbot context (e.g. "Hostel gates close at 10pm. Laundry is available on Sundays. Contact warden at 9876543210.")
- Log in as student, open the chatbot widget
- Ask "What time do hostel gates close?" — should answer "10pm"
- Ask something not in context — should say it doesn't know and suggest contacting the office

---

### Step 8 — Guest Dashboard

**Estimated time:** 2–3 days  
**Why last:** Needs design clarity first. Implemented last after everything else is stable.

**Decision:** Guest = unauthenticated public user who can view hostel info. No login required.

---

#### Microsteps — Public API

**8.1** Create `app/api/public/hostel-info/route.ts` — no auth required, returns public hostel info given a `collegeId` query param:

```ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const collegeId = searchParams.get('collegeId')

  if (!collegeId) {
    return NextResponse.json({ ok: false, error: 'collegeId is required' }, { status: 400 })
  }

  const hostel = await prisma.hostel.findFirst({
    where: { collegeId },
    select: {
      id: true,
      name: true,
      location: true,
      capacity: true,
      description: true,
      rules: true,
      college: { select: { name: true } },
    },
  })

  if (!hostel) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, data: hostel })
}
```

**Note:** This route does NOT use `getSession()` — it is intentionally public. Do not expose `chatbotContext` here.

**8.2** Create `app/api/public/colleges/route.ts` — returns a searchable list of colleges (for the guest landing page to pick a college):

```ts
export async function GET() {
  const colleges = await prisma.college.findMany({
    select: { id: true, name: true, location: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ ok: true, data: colleges })
}
```

---

#### Microsteps — Guest pages

**8.3** Update `middleware.ts` to explicitly exclude the `/guest` prefix from auth checks — currently it only protects `/admin`, `/member`, `/student`, so `/guest` is already unprotected. Verify by checking the `PROTECTED` object — `/guest` should not be listed. No change needed.

**8.4** Create `app/guest/page.tsx` — the guest landing page:

- Fetch the college list from `GET /api/public/colleges`
- Show a search input and a list of colleges
- Each college has a "View Hostel Info" link pointing to `/guest/[collegeId]`

**8.5** Create `app/guest/[collegeId]/page.tsx` — the guest hostel info page:

- Fetch from `GET /api/public/hostel-info?collegeId=<id>`
- Display: hostel name, college name, location, capacity, description, rules
- A "Student Login" button linking to `/login` for students who want to access the full app

**8.6** Create `app/guest/layout.tsx` — a simple layout with no sidebar (just a top navbar with the app name and a "Login" link):

```tsx
export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{
        padding: '16px 32px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontWeight: 600, fontSize: '18px' }}>Hostel Portal</span>
        <a href="/login" style={{ color: 'var(--sage-dark)', textDecoration: 'none', fontWeight: 500 }}>Login</a>
      </header>
      <main style={{ padding: '32px' }}>{children}</main>
    </div>
  )
}
```

**8.7** Add a link to the guest portal on the login page (`app/(auth)/login/page.tsx`) so anyone can discover it: *"View hostel info without logging in →"*

---

## 9. API Reference — Current Endpoints

### Auth

| Method | Path | Caller | Description |
|---|---|---|---|
| POST | `/api/auth/super/login` | Superadmin | Login, returns JWT with `type: SUPER` |
| POST | `/api/auth/admin/login` | Admin | Login, returns JWT with `type: ADMIN` |
| POST | `/api/auth/admin/register` | Anyone | Register admin account |
| POST | `/api/auth/member/login` | Member | Login, returns JWT with `type: MEMBER` |
| POST | `/api/auth/student/login` | Student | Login, returns JWT with `type: STUDENT` |
| POST | `/api/auth/logout` | All | Clears cookies |
| POST | `/api/auth/change-password` | All | Change own password |

### Roles

| Method | Path | Caller | Description |
|---|---|---|---|
| GET | `/api/roles` | Admin | List all roles for college |
| POST | `/api/roles` | Admin | Create role |
| GET | `/api/roles/[id]` | Admin | Get role with its permissions |
| PUT | `/api/roles/[id]` | Admin | Update role name |
| DELETE | `/api/roles/[id]` | Admin | Delete role (cascades permissions) |
| GET | `/api/roles/[id]/permissions` | Admin | Get all permissions for a role |
| PUT | `/api/roles/[id]/permissions` | Admin | Bulk-update all permissions for a role |
| GET | `/api/roles/public` | Member login page | Get role list (for login form dropdown) |

### Members

| Method | Path | Caller | Description |
|---|---|---|---|
| GET | `/api/members` | Admin | List all members with role/class/hostel |
| POST | `/api/members` | Admin | Create member |
| PUT | `/api/members/[id]` | Admin | Update member |
| DELETE | `/api/members/[id]` | Admin | Delete member |
| POST | `/api/members/bulk` | Admin | Bulk create from Excel file |

### Students

| Method | Path | Caller | Description |
|---|---|---|---|
| GET | `/api/students` | Admin, Member (canView) | List students (scoped for members) |
| POST | `/api/students` | Admin | Create student |
| PUT | `/api/students/[id]` | Admin | Update student |
| DELETE | `/api/students/[id]` | Admin | Delete student |

### Leaves

| Method | Path | Caller | Description |
|---|---|---|---|
| GET | `/api/leaves` | All | List leaves (scoped per role type) |
| POST | `/api/leaves` | Student | Submit leave request |
| PUT | `/api/leaves/[id]/assign` | Admin, Member (canCreate) | Assign leave to a member |
| PUT | `/api/leaves/[id]/approve` | Admin, Member (canApprove, if assigned) | Approve leave |
| PUT | `/api/leaves/[id]/reject` | Admin, Member (canApprove, if assigned) | Reject leave |

### Other (existing)

| Method | Path | Caller | Description |
|---|---|---|---|
| GET | `/api/dashboard` | Admin, SUPER | Dashboard stats |
| GET | `/api/permissions` | Member | Get own role's permissions |
| GET | `/api/classes` | Admin, Member | List classes for college |
| GET | `/api/hostels` | Admin, Member | List hostels for college |
| GET | `/api/colleges/search` | Login pages | Search colleges by name/domain |

### APIs to be created

| Method | Path | Caller | Step | Description |
|---|---|---|---|---|
| GET | `/api/complaints` | Student (own), Member (canView, scoped), Admin | Step 2 | List complaints |
| POST | `/api/complaints` | Student | Step 2 | Submit complaint |
| PUT | `/api/complaints/[id]` | Admin, Member (canEdit) | Step 3 | Update complaint status |
| GET | `/api/hostel-info` | All authenticated | Step 5 | Get hostel info (no chatbotContext) |
| PUT | `/api/hostel-info` | Admin | Step 5 | Update hostel info + chatbotContext |
| POST | `/api/chatbot` | Student, Member | Step 7 | Send message, get LLM response |
| GET | `/api/superadmin/colleges` | SUPER only | Step 6 | List all colleges |
| POST | `/api/superadmin/colleges` | SUPER only | Step 6 | Create college |
| POST | `/api/superadmin/admins` | SUPER only | Step 6 | Create admin for college |
| GET | `/api/public/hostel-info` | No auth | Step 8 | Public hostel info by collegeId |
| GET | `/api/public/colleges` | No auth | Step 8 | List all colleges for guest landing |