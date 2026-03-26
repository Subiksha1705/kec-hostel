# UI Implementation Prompt for Codex
## KEC Hostel — Admin & Student UI

---

## Context

The backend is fully implemented. All API routes are live. Now build the complete frontend UI. The app has three user types: **Admin**, **Admin Member (staff)**, and **Student**. Each has a separate login and dashboard.

---

## Design System

Use this design system consistently across every page. Do not deviate.

**Theme: Soft Pastel Light**

```css
/* globals.css — add these CSS variables */
:root {
  --bg:           #F9F7F4;      /* warm off-white page background */
  --surface:      #FFFFFF;      /* card / panel background */
  --surface-2:    #F3F0EC;      /* subtle nested surface */
  --border:       #E8E3DC;      /* all borders */
  --text-primary: #1C1917;      /* headings */
  --text-secondary:#6B6560;     /* labels, meta */
  --text-muted:   #A8A29E;      /* placeholders */

  /* Accent palette */
  --sage:         #A8BFA8;      /* primary action buttons */
  --sage-dark:    #7A9E7A;      /* hover state */
  --sage-light:   #E8F0E8;      /* button ghost / light badge */
  --blush:        #E8C4B8;      /* warning / pending badge */
  --sky:          #B8D4E8;      /* info / assigned badge */
  --lavender:     #C4B8E8;      /* secondary accent */
  --mint:         #B8E8D4;      /* success / approved badge */
  --rose:         #E8B8B8;      /* error / rejected badge */

  --radius:       10px;
  --radius-lg:    16px;
  --shadow:       0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md:    0 4px 12px rgba(0,0,0,0.08);
}
```

**Typography:** Import from Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
```
- Headings: `DM Serif Display`
- Body / UI: `DM Sans`

**Component rules:**
- Cards: `background: var(--surface)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow)`
- Buttons (primary): `background: var(--sage)`, `color: white`, `border-radius: var(--radius)`, hover → `var(--sage-dark)`
- Buttons (ghost): `background: var(--sage-light)`, `color: var(--sage-dark)`, `border: 1px solid var(--border)`
- Buttons (danger): `background: var(--rose)`, `color: #7A2020`
- Inputs: `background: var(--surface-2)`, `border: 1px solid var(--border)`, `border-radius: var(--radius)`, focus → `border-color: var(--sage)`
- Status badges:
  - `PENDING`  → `background: var(--blush)`,   `color: #7A3020`
  - `APPROVED` → `background: var(--mint)`,    `color: #1A5C3A`
  - `REJECTED` → `background: var(--rose)`,    `color: #7A2020`
  - `ASSIGNED` → `background: var(--sky)`,     `color: #1A3C5C`
- Table rows: alternate `var(--surface)` / `var(--surface-2)`, row hover → `var(--sage-light)`
- Sidebar: `background: var(--surface)`, `border-right: 1px solid var(--border)`, width `220px`

---

## Auth — Token Storage

Store tokens returned from login APIs in `localStorage`:
```ts
localStorage.setItem('accessToken', data.accessToken)
localStorage.setItem('refreshToken', data.refreshToken)
localStorage.setItem('userType', 'ADMIN' | 'MEMBER' | 'STUDENT')
```

Create a utility `lib/api/client.ts` that attaches the token automatically:
```ts
export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('accessToken')
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (res.status === 401) {
    localStorage.clear()
    window.location.href = '/login'
  }
  return res
}
```

---

## Page Structure

Use Next.js App Router. Route groups:

```
app/
  (auth)/
    login/page.tsx            ← single login page, user picks role
    register/page.tsx         ← admin registration (creates college too)
  (admin)/
    layout.tsx                ← sidebar + topbar layout
    dashboard/page.tsx
    roles/page.tsx
    roles/[id]/page.tsx       ← role detail + permissions editor
    members/page.tsx
    students/page.tsx
    leaves/page.tsx
  (member)/
    layout.tsx                ← same sidebar layout, fewer nav items
    dashboard/page.tsx
    students/page.tsx         ← if role has students.canView
    leaves/page.tsx           ← if role has leaves.canView
  (student)/
    layout.tsx                ← minimal layout
    dashboard/page.tsx
    leaves/page.tsx
```

---

## Shared Layout Component

Create `components/layout/Sidebar.tsx`. It should:
- Show the app name "KEC Hostel" at the top in `DM Serif Display`
- Show nav items as a vertical list with icons (use lucide-react icons)
- Highlight the active route
- Show a "Logout" button at the bottom that clears localStorage and redirects to `/login`
- Show a small user badge at the bottom (name + role type)

**Admin nav items:**
- Dashboard (LayoutDashboard icon)
- Roles (Shield icon)
- Members (Users icon)
- Students (GraduationCap icon)
- Leaves (CalendarCheck icon)

**Member nav items:**
- Dashboard (LayoutDashboard icon)
- Students (GraduationCap icon) — show only if role has students.canView
- Leaves (CalendarCheck icon) — show only if role has leaves.canView

**Student nav items:**
- Dashboard (LayoutDashboard icon)
- My Leaves (CalendarCheck icon)

---

## Page-by-Page Specification

---

### Page: `/login`

**Purpose:** Single login page. User selects their role type and logs in.

**Layout:** Centered card on `var(--bg)`. Left side: app name + tagline. Right side: form.

**UI Elements:**
- App name "KEC Hostel" in `DM Serif Display`, large
- Tagline: "Hostel & Leave Management"
- Role selector: three toggle buttons — "Admin", "Staff", "Student" — styled like a segmented control using `var(--sage-light)` for selected
- Email input
- Password input (with show/hide toggle)
- "Sign In" primary button (full width)
- Link: "New college? Register here" → `/register` (show only when Admin tab is selected)

**On submit:**
- Admin → `POST /api/auth/admin/login`
- Staff → `POST /api/auth/member/login`
- Student → `POST /api/auth/student/login`
- On success: save token, redirect to correct dashboard
- On error: show inline error message below the form in `var(--rose)` background

---

### Page: `/register`

**Purpose:** Admin registers a new college + creates their admin account.

**Layout:** Same centered card as login.

**Fields:**
- College Name (text input)
- College Location (text input)
- Your Name (text input)
- Email (email input)
- Password (password input, min 8 chars)
- Confirm Password (must match)

**On submit:** `POST /api/auth/admin/register`  
On success: redirect to `/login` with a success message "College registered! Please log in."

---

### Page: `/admin/dashboard`

**Purpose:** Overview of the college.

**Layout:** 4 stat cards in a row, then a recent leaves table below.

**Stat cards** (fetch from respective list endpoints and count):
1. Total Students — count from `GET /api/students`
2. Total Members — count from `GET /api/members`
3. Total Roles — count from `GET /api/roles`
4. Pending Leaves — count from `GET /api/leaves` filtered by `status === 'PENDING'`

Each stat card: large number in `DM Serif Display`, label below in `var(--text-secondary)`, subtle icon top-right.

**Recent Leaves table:** last 5 leaves from `GET /api/leaves`, columns: Student Name, Reason, From, To, Status badge, Assigned To. Link "View all →" to `/admin/leaves`.

---

### Page: `/admin/roles`

**Purpose:** Admin creates and manages roles.

**Layout:** Page header + "New Role" button top right. Roles listed as cards in a grid (2 columns).

**Each role card shows:**
- Role name in `DM Serif Display`
- Number of members assigned (from `_count.members`)
- Permission summary: small pill badges for each module that has at least canView (e.g. "Students", "Leaves")
- Two action buttons: "Edit Permissions" (ghost) → navigates to `/admin/roles/[id]` | "Delete" (danger, disabled if members > 0)

**New Role modal (open on button click):**
- Input: Role Name
- Submit calls `POST /api/roles`
- On success: refetch roles list, close modal

---

### Page: `/admin/roles/[id]`

**Purpose:** Configure exactly which permissions this role has for each module.

**Layout:** Back button → `/admin/roles`. Role name as heading. Permission matrix table.

**Permission Matrix Table:**

| Module     | View | Create | Edit | Delete |
|------------|------|--------|------|--------|
| Students   | ☐    | ☐      | ☐    | ☐      |
| Leaves     | ☐    | ☐      | ☐    | ☐      |
| Complaints | ☐    | ☐      | ☐    | ☐      |

- Each cell is a styled checkbox. Checked = `var(--sage)` fill.
- Logic: if `canView` is unchecked, automatically uncheck and disable canCreate/canEdit/canDelete for that module.
- "Save Permissions" primary button at the bottom.
- On save: `PUT /api/roles/[id]/permissions` with array of all module permissions.
- Show a success toast "Permissions saved" for 3 seconds after save.

---

### Page: `/admin/members`

**Purpose:** Admin manages staff members.

**Layout:** Page header + "Add Member" button. Members listed in a table.

**Table columns:** Name | Email | Role | Scope (class or hostel name, or "Full Access") | Actions

**Actions per row:** "Edit" (ghost button) opens edit modal | "Remove" (danger) calls `DELETE /api/members/[id]`

**Add Member modal fields:**
- Name (text)
- Email (email)
- Password (password, min 8)
- Role (dropdown — fetch from `GET /api/roles`, show role names)
- Class Scope (dropdown — optional, fetch from classes. Show "No restriction" as default)
- Hostel Scope (dropdown — optional, fetch from hostels. Show "No restriction" as default)
- Submit calls `POST /api/members`

**Edit Member modal fields:** Same as add but without password. Calls `PUT /api/members/[id]`.

> To fetch classes and hostels, add two simple API routes:
> - `GET /api/classes` → `prisma.class.findMany({ where: { collegeId } })`
> - `GET /api/hostels` → `prisma.hostel.findMany({ where: { collegeId } })`

---

### Page: `/admin/students`

**Purpose:** Admin manages student records.

**Layout:** Page header + "Add Student" button. Students listed in a table.

**Table columns:** Roll No | Name | Email | Class | Hostel | Actions

**Actions per row:** "Edit" opens edit modal | (no delete in MVP)

**Add Student modal fields:**
- Name (text)
- Email (email)
- Password (password, min 8)
- Roll Number (text)
- Class (dropdown — optional, from `GET /api/classes`)
- Hostel (dropdown — optional, from `GET /api/hostels`)
- Submit calls `POST /api/students`

**Edit Student modal:** Name, Roll Number, Class, Hostel. Calls `PUT /api/students/[id]`.

---

### Page: `/admin/leaves`

**Purpose:** Admin views all leaves and assigns them to members.

**Layout:** Filter bar at top, then leave cards or table.

**Filter bar:** Status filter (All / Pending / Approved / Rejected) as toggle pills.

**Leave table columns:** Student | Roll No | Reason | From | To | Status badge | Assigned To | Actions

**Actions:**
- If `status === PENDING` and no assignedTo → show "Assign" button → opens assign modal
- If `status === PENDING` and has assignedTo → show assigned member name, no action needed (member will approve/reject)
- If `APPROVED` or `REJECTED` → show reviewed by + reviewed at, no actions

**Assign modal:**
- Dropdown: "Assign to member" — list all members from `GET /api/members`
- Submit calls `PUT /api/leaves/[id]/assign` with `{ memberId }`

---

### Page: `/member/dashboard`

**Purpose:** Member sees their assigned leaves summary.

**Layout:** Two stat cards (Assigned to me / Reviewed by me), then assigned leaves table.

**Assigned Leaves table:** fetch `GET /api/leaves` and filter `assignedToId === currentUser.id`. Columns: Student | Reason | From | To | Status | Actions

**Actions:**
- If `PENDING` and `assignedToId === me`: show "Approve" (mint button) and "Reject" (rose button)
- Approve → `PUT /api/leaves/[id]/approve`
- Reject → `PUT /api/leaves/[id]/reject`
- Both should ask for confirmation before calling API

---

### Page: `/member/students`

**Purpose:** Member views students in their scope.

**Layout:** Same as admin students table but read-only (no add/edit). Shows only students the member's scope allows.

Fetch `GET /api/students` — the backend automatically scope-filters.

**Table columns:** Roll No | Name | Email | Class | Hostel

---

### Page: `/member/leaves`

**Purpose:** Member views all leaves in their scope and acts on their assigned ones.

Same layout as `/admin/leaves` but:
- No "Assign" action (members can't assign)
- Show "Approve" / "Reject" only on leaves where `assignedToId === currentMemberId`

---

### Page: `/student/dashboard`

**Purpose:** Student sees their leave history summary.

**Layout:** Three stat cards (Total Submitted / Approved / Pending), then a leave history table.

---

### Page: `/student/leaves`

**Purpose:** Student submits leaves and tracks status.

**Layout:** "Apply for Leave" button top right. Leave history table below.

**Leave history table columns:** Reason | From | To | Status badge | Assigned To | Reviewed By | Submitted On

**Apply for Leave modal fields:**
- Reason (textarea)
- From Date (date picker)
- To Date (date picker, must be ≥ from date)
- Submit calls `POST /api/leaves`

---

## Two New API Routes to Add

These are needed by the UI dropdowns. Add them to the repo:

### `app/api/classes/route.ts`
```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    const classes = await prisma.class.findMany({
      where: { collegeId: session.collegeId },
      orderBy: { name: 'asc' },
    })
    return ok(classes)
  } catch {
    return err('Unauthorized', 401)
  }
}
```

### `app/api/hostels/route.ts`
```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    const hostels = await prisma.hostel.findMany({
      where: { collegeId: session.collegeId },
      orderBy: { name: 'asc' },
    })
    return ok(hostels)
  } catch {
    return err('Unauthorized', 401)
  }
}
```

---

## Shared UI Components to Build

Create these reusable components in `components/ui/`:

### `Modal.tsx`
- Props: `isOpen`, `onClose`, `title`, `children`
- Overlay: semi-transparent dark background
- Modal box: `var(--surface)`, `var(--radius-lg)`, `var(--shadow-md)`
- Close button (X) top right
- Trap focus when open

### `StatusBadge.tsx`
- Props: `status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ASSIGNED'`
- Renders a small pill with correct background from design system

### `Table.tsx`
- Props: `columns`, `data`, `emptyMessage`
- Alternating row backgrounds
- Empty state: centered illustration area with `emptyMessage` text

### `StatCard.tsx`
- Props: `label`, `value`, `icon`
- Renders one of the stat cards used on dashboards

### `Toast.tsx`
- Simple fixed bottom-right toast notification
- Auto-dismisses after 3 seconds
- Variants: `success` (mint), `error` (rose)

---

## Routing / Auth Guard

Create `components/AuthGuard.tsx`. Wrap every layout with it.

```tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthGuard({
  children,
  allowedType,
}: {
  children: React.ReactNode
  allowedType: 'ADMIN' | 'MEMBER' | 'STUDENT'
}) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    const type = localStorage.getItem('userType')
    if (!token || type !== allowedType) {
      router.replace('/login')
    }
  }, [allowedType, router])

  return <>{children}</>
}
```

Use it in each layout:
```tsx
// app/(admin)/layout.tsx
import AuthGuard from '@/components/AuthGuard'
import Sidebar from '@/components/layout/Sidebar'

export default function AdminLayout({ children }) {
  return (
    <AuthGuard allowedType="ADMIN">
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <Sidebar userType="ADMIN" />
        <main style={{ flex: 1, padding: '32px' }}>{children}</main>
      </div>
    </AuthGuard>
  )
}
```

---

## Install Required Packages

```bash
yarn add lucide-react
```

No other new packages needed. Do not install shadcn, radix, or any component library — build all UI from scratch using Tailwind and inline styles with the CSS variables defined above.

---

## Final File Tree for UI

```
app/
  (auth)/
    login/page.tsx
    register/page.tsx
  (admin)/
    layout.tsx
    dashboard/page.tsx
    roles/page.tsx
    roles/[id]/page.tsx
    members/page.tsx
    students/page.tsx
    leaves/page.tsx
  (member)/
    layout.tsx
    dashboard/page.tsx
    students/page.tsx
    leaves/page.tsx
  (student)/
    layout.tsx
    dashboard/page.tsx
    leaves/page.tsx
  api/
    classes/route.ts          ← NEW
    hostels/route.ts          ← NEW
    ... (existing routes)
components/
  layout/
    Sidebar.tsx
  ui/
    Modal.tsx
    StatusBadge.tsx
    Table.tsx
    StatCard.tsx
    Toast.tsx
  AuthGuard.tsx
lib/
  api/
    client.ts                 ← NEW (apiFetch utility)
    response.ts               ← existing
```

---

## Implementation Checklist for Codex

```
[ ] Add CSS variables + DM Sans/DM Serif Display fonts to app/globals.css
[ ] Create lib/api/client.ts (apiFetch with auto token)
[ ] Add app/api/classes/route.ts
[ ] Add app/api/hostels/route.ts
[ ] Create components/AuthGuard.tsx
[ ] Create components/layout/Sidebar.tsx
[ ] Create components/ui/Modal.tsx
[ ] Create components/ui/StatusBadge.tsx
[ ] Create components/ui/Table.tsx
[ ] Create components/ui/StatCard.tsx
[ ] Create components/ui/Toast.tsx
[ ] Create app/(auth)/login/page.tsx
[ ] Create app/(auth)/register/page.tsx
[ ] Create app/(admin)/layout.tsx
[ ] Create app/(admin)/dashboard/page.tsx
[ ] Create app/(admin)/roles/page.tsx
[ ] Create app/(admin)/roles/[id]/page.tsx
[ ] Create app/(admin)/members/page.tsx
[ ] Create app/(admin)/students/page.tsx
[ ] Create app/(admin)/leaves/page.tsx
[ ] Create app/(member)/layout.tsx
[ ] Create app/(member)/dashboard/page.tsx
[ ] Create app/(member)/students/page.tsx
[ ] Create app/(member)/leaves/page.tsx
[ ] Create app/(student)/layout.tsx
[ ] Create app/(student)/dashboard/page.tsx
[ ] Create app/(student)/leaves/page.tsx
[ ] Update app/page.tsx to redirect to /login
```
