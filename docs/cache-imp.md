# Cache + Refresh Button — Full Implementation Guide

## Context

The repo already has two well-designed files that are **not yet used by any page**:

| File | Purpose |
|---|---|
| `lib/cache/store.ts` | In-memory key→value store that survives SPA navigation, cleared on logout/hard-reload |
| `lib/cache/useCachedFetch.ts` | React hook — returns cached data instantly, fetches only when cache is empty, exposes `refresh()` for manual re-fetch |
| `components/ui/RefreshButton.tsx` | Spinning button that calls `refresh()` and shows "Updated Xm ago" |

**Goal:** Wire these into every page that fetches list/detail data so that:
1. On login, each module fetches once from the DB.
2. SPA navigation (Complaints → Leaves → back) reads from cache — zero extra DB calls.
3. A manual **Refresh** button appears on each module page. Clicking it fetches fresh data once and updates the cache.
4. After a mutation (create / update / delete / approve), invalidate the affected cache key so the next read re-fetches automatically.
5. On logout, clear the entire cache.

---

## Step 1 — Verify the existing cache files are correct (no changes needed)

### `lib/cache/store.ts`
Already correct. Keys in `MANUAL_ONLY_KEYS` get `ttl: 0` (never auto-expire; refresh only on manual button click).

```
MANUAL_ONLY_KEYS:
  /api/leaves
  /api/complaints
  /api/roles
  /api/members
  /api/hostel-info
  /api/students
  /api/superadmin/colleges
```

### `lib/cache/useCachedFetch.ts`
Already correct. Returns `{ data, loading, error, refresh, fetchedAt }`.

### `components/ui/RefreshButton.tsx`
Already correct. Accepts `{ onRefresh, fetchedAt, label }`.

---

## Step 2 — Export the cache from an index file

Create `lib/cache/index.ts`:

```ts
export { cache } from './store'
export { useCachedFetch } from './useCachedFetch'
export type { UseCachedFetchResult } from './useCachedFetch'
```

---

## Step 3 — Clear cache on logout

Find the logout handler (wherever `localStorage.removeItem('accessToken')` or `router.push('/login')` is called — likely in the sidebar/layout component at `components/layout/`).

Add one line:

```ts
import { cache } from '@/lib/cache'
// inside the logout function, before redirect:
cache.clear()
```

---

## Step 4 — Rewrite each page to use `useCachedFetch` + `RefreshButton`

The pattern for every page is identical:

```ts
// BEFORE (direct fetch, re-runs on every mount)
const load = async () => {
  setLoading(true)
  const { data } = await apiJson<...>('/api/leaves')
  if (data?.ok) setLeaves(data.data)
  setLoading(false)
}
useEffect(() => { load() }, [])

// AFTER (cache-first, manual refresh only)
import { useCachedFetch } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'

const { data: leaves = [], loading, error, refresh, fetchedAt } = useCachedFetch<Leave[]>('/api/leaves')
// Use `leaves` directly. Add <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} /> to the header row.
```

After any **mutation** (create/update/delete/approve/reject), replace the old `load()` call with:

```ts
import { cache } from '@/lib/cache'
cache.invalidate('/api/leaves')   // triggers re-fetch on next read
```

---

## Step 5 — Page-by-page changes

### 5a. `app/admin/leaves/page.tsx`

**Imports — add:**
```ts
import { useCachedFetch, cache } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
```

**Remove:** `useState` for `leaves`, `members`, `loading`; remove the `load` function and its `useEffect`.

**Add hooks:**
```ts
const { data: leaves = [], loading: leavesLoading, refresh: refreshLeaves, fetchedAt } =
  useCachedFetch<Leave[]>('/api/leaves')
const { data: members = [], refresh: refreshMembers } =
  useCachedFetch<Member[]>('/api/members')

const loading = leavesLoading
```

**Manual refresh (both keys together):**
```ts
const handleRefresh = async () => {
  await Promise.all([refreshLeaves(), refreshMembers()])
}
```

**Replace every `load()` call after mutation with:**
```ts
cache.invalidate('/api/leaves')
cache.invalidate('/api/members')
```

**In JSX, change the heading row to:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
    Leaves
  </h1>
  <RefreshButton onRefresh={handleRefresh} fetchedAt={fetchedAt} />
</div>
```

---

### 5b. `app/admin/complaints/page.tsx`

**Imports — add:**
```ts
import { useCachedFetch, cache } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
```

**Replace `useState` + `load` + `useEffect` with:**
```ts
const { data: complaints = [], loading, refresh, fetchedAt } =
  useCachedFetch<Complaint[]>('/api/complaints')
```

**After `resolve()` mutation:**
```ts
cache.invalidate('/api/complaints')
```

**Heading row:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
    Complaints
  </h1>
  <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
</div>
```

---

### 5c. `app/admin/hostel-info/page.tsx`

**Imports — add:**
```ts
import { useCachedFetch, cache } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
```

**Replace `useState<HostelInfo>` + `load` + `useEffect` with:**
```ts
const { data: hostelInfo, loading, refresh, fetchedAt } =
  useCachedFetch<HostelInfo>('/api/hostel-info')

// Derive form state from cache data
const [form, setForm] = useState<HostelInfo>(emptyForm)
useEffect(() => {
  if (hostelInfo) {
    setForm({
      name: hostelInfo.name ?? '',
      location: hostelInfo.location ?? '',
      capacity: hostelInfo.capacity ?? 0,
      description: hostelInfo.description ?? '',
      rules: hostelInfo.rules ?? '',
      chatbotContext: hostelInfo.chatbotContext ?? '',
    })
  }
}, [hostelInfo])
```

**After successful `save()` (PUT):**
```ts
cache.invalidate('/api/hostel-info')
```

**Heading row:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
    Hostel Info
  </h1>
  <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
</div>
```

---

### 5d. `app/admin/roles/page.tsx`

**Imports — add:**
```ts
import { useCachedFetch, cache } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
```

**Replace `useState<Role[]>` + `load` + `useEffect` with:**
```ts
const { data: roles = [], loading, refresh, fetchedAt } =
  useCachedFetch<Role[]>('/api/roles')
```

**After `createRole()` and any delete mutation:**
```ts
cache.invalidate('/api/roles')
```

**Heading row:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
    Roles
  </h1>
  <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
</div>
```

---

### 5e. `app/admin/members/page.tsx`

This page fetches `/api/members` plus `/api/roles`, `/api/classes`, `/api/hostels` for the form dropdowns.

**Imports — add:**
```ts
import { useCachedFetch, cache } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
```

**Replace individual `useState` + `load` with:**
```ts
const { data: members = [], loading: membersLoading, refresh: refreshMembers, fetchedAt } =
  useCachedFetch<Member[]>('/api/members')
const { data: roles = [], refresh: refreshRoles } =
  useCachedFetch<Role[]>('/api/roles')
// classes and hostels are small reference data — keep fetching normally OR add them to MANUAL_ONLY_KEYS

const loading = membersLoading

const handleRefresh = async () => {
  await Promise.all([refreshMembers(), refreshRoles()])
}
```

**After create/edit/delete member:**
```ts
cache.invalidate('/api/members')
```

**Heading row:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
    Members
  </h1>
  <RefreshButton onRefresh={handleRefresh} fetchedAt={fetchedAt} />
</div>
```

---

### 5f. `app/admin/students/page.tsx`

**Imports — add:**
```ts
import { useCachedFetch, cache } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
```

**Replace `useState<Student[]>` + `load` + `useEffect` with:**
```ts
const { data: students = [], loading, refresh, fetchedAt } =
  useCachedFetch<Student[]>('/api/students')
```

**After create/edit/delete:**
```ts
cache.invalidate('/api/students')
```

**Heading row:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
    Students
  </h1>
  <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
</div>
```

---

### 5g. `app/admin/colleges/page.tsx`

**Imports — add:**
```ts
import { useCachedFetch, cache } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
```

**Replace `useState<College[]>` + `load` + `useEffect` with:**
```ts
const { data: colleges = [], loading, refresh, fetchedAt } =
  useCachedFetch<College[]>('/api/superadmin/colleges')
```

**After create/invite admin:**
```ts
cache.invalidate('/api/superadmin/colleges')
```

**Heading row:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
    Colleges
  </h1>
  <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
</div>
```

---

### 5h. `app/member/leaves/page.tsx`

This page fetches both `/api/leaves` and `/api/permissions`.

**Imports — add:**
```ts
import { useCachedFetch, cache } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
```

**Replace:**
```ts
const { data: leaves = [], loading: leavesLoading, refresh: refreshLeaves, fetchedAt } =
  useCachedFetch<Leave[]>('/api/leaves')
const { data: perms = [] } = useCachedFetch<Permission[]>('/api/permissions')

const loading = leavesLoading
const canApprove = perms.find((p) => p.module === 'leaves')?.canApprove ?? false

const handleRefresh = async () => {
  await refreshLeaves()
}
```

**After approve/reject mutations:**
```ts
cache.invalidate('/api/leaves')
```

**Heading row:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
    Leaves
  </h1>
  <RefreshButton onRefresh={handleRefresh} fetchedAt={fetchedAt} />
</div>
```

---

### 5i. `app/member/complaints/page.tsx`

**Imports — add:**
```ts
import { useCachedFetch, cache } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
```

**Replace:**
```ts
const { data: complaints = [], loading: complaintsLoading, refresh: refreshComplaints, fetchedAt } =
  useCachedFetch<Complaint[]>('/api/complaints')
const { data: perms = [] } = useCachedFetch<Permission[]>('/api/permissions')

const loading = complaintsLoading
const canEdit = perms.find((p) => p.module === 'complaints')?.canEdit ?? false
```

**After resolve mutation:**
```ts
cache.invalidate('/api/complaints')
```

**Heading row:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
    Complaints
  </h1>
  <RefreshButton onRefresh={refreshComplaints} fetchedAt={fetchedAt} />
</div>
```

---

### 5j. `app/student/leaves/page.tsx`

**Imports — add:**
```ts
import { useCachedFetch, cache } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
```

**Replace:**
```ts
const { data: leaves = [], loading, refresh, fetchedAt } =
  useCachedFetch<Leave[]>('/api/leaves')
```

**After submit (POST new leave):**
```ts
cache.invalidate('/api/leaves')
```

**Heading row:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
    My Leaves
  </h1>
  <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
</div>
```

---

### 5k. `app/student/complaints/page.tsx`

**Imports — add:**
```ts
import { useCachedFetch, cache } from '@/lib/cache'
import RefreshButton from '@/components/ui/RefreshButton'
```

**Replace:**
```ts
const { data: complaints = [], loading, refresh, fetchedAt } =
  useCachedFetch<Complaint[]>('/api/complaints')
```

**After submit (POST new complaint):**
```ts
cache.invalidate('/api/complaints')
```

**Heading row:**
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <h1 style={{ margin: 0, fontFamily: 'var(--font-dm-serif), "DM Serif Display", serif' }}>
    My Complaints
  </h1>
  <RefreshButton onRefresh={refresh} fetchedAt={fetchedAt} />
</div>
```

---

## Step 6 — Add `/api/permissions` to `MANUAL_ONLY_KEYS` in `store.ts`

`/api/permissions` is fetched by member pages alongside leaves and complaints. Add it so it is also cache-first:

```ts
// lib/cache/store.ts — inside MANUAL_ONLY_KEYS set
'/api/permissions',
```

---

## Step 7 — Role detail page (`app/admin/roles/[id]/page.tsx`)

If this page fetches role details directly, apply the same pattern with the key `/api/roles/${id}`:

```ts
const { data: role, loading, refresh, fetchedAt } =
  useCachedFetch<RoleDetail>(`/api/roles/${params.id}`)
```

After editing permissions:
```ts
cache.invalidate(`/api/roles/${params.id}`)
cache.invalidate('/api/roles')   // invalidate the list too
```

---

## Step 8 — `useCachedFetch` handles multiple simultaneous mounts correctly

When two components on the same page use the same key (e.g. `/api/leaves`), the hook's `fetchingRef` guard prevents duplicate in-flight requests. The second caller will resolve from cache once the first populates it. No additional work needed.

---

## Summary of behaviour after implementation

| Scenario | DB calls |
|---|---|
| Login → navigate to Leaves | 1 (first visit) |
| Navigate away → come back to Leaves | 0 (served from cache) |
| Click Refresh button | 1 (forced fresh fetch) |
| Approve a leave (mutation) | 0 during action; 1 on next page open (cache invalidated) |
| Full page reload (F5) | 1 per module visited (cache cleared) |
| Logout → login again | 1 per module visited (cache cleared on logout) |

---

## Files changed summary

| File | Change |
|---|---|
| `lib/cache/index.ts` | **CREATE** — re-exports store + hook |
| `lib/cache/store.ts` | Add `/api/permissions` to `MANUAL_ONLY_KEYS` |
| `components/layout/*.tsx` (logout handler) | Add `cache.clear()` before redirect |
| `app/admin/leaves/page.tsx` | Use `useCachedFetch` + `RefreshButton` |
| `app/admin/complaints/page.tsx` | Use `useCachedFetch` + `RefreshButton` |
| `app/admin/hostel-info/page.tsx` | Use `useCachedFetch` + `RefreshButton` |
| `app/admin/roles/page.tsx` | Use `useCachedFetch` + `RefreshButton` |
| `app/admin/roles/[id]/page.tsx` | Use `useCachedFetch` + `RefreshButton` |
| `app/admin/members/page.tsx` | Use `useCachedFetch` + `RefreshButton` |
| `app/admin/students/page.tsx` | Use `useCachedFetch` + `RefreshButton` |
| `app/admin/colleges/page.tsx` | Use `useCachedFetch` + `RefreshButton` |
| `app/member/leaves/page.tsx` | Use `useCachedFetch` + `RefreshButton` |
| `app/member/complaints/page.tsx` | Use `useCachedFetch` + `RefreshButton` |
| `app/student/leaves/page.tsx` | Use `useCachedFetch` + `RefreshButton` |
| `app/student/complaints/page.tsx` | Use `useCachedFetch` + `RefreshButton` |