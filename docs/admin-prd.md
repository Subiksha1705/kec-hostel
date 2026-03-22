# Admin Module PRD + Implementation Steps

## Purpose
Deliver the Admin module for HostelHub that enables hostel staff to manage students, leaves, complaints, hostel data, and guest-facing content, with strict college isolation and efficient backend performance.

## Scope (MVP)
Admin can:
- Manage students (add/edit/deactivate)
- Review and approve/reject leave requests
- View and resolve complaints
- Configure hostel profile (name, capacity, location)
- Manage guest gallery content (upload/delete)
- Manage roles & permissions (create roles, assign module access)
- Manage admin members (add, remove, change role)
- Create colleges

Out of scope (MVP):
- Super admin
- Analytics
- Advanced leave rules
- Public reviews moderation

## Users
- Admin (hostel staff)

## Data Isolation
- All admin actions are scoped to a single `collegeId`.
- Any read/write must include college scoping.

## Core Screens
- Admin Dashboard (summary counts, recent activity)
- Students (list + create/edit)
- Leaves (pending queue + status updates)
- Complaints (pending/resolved + status updates)
- Hostel Config
- Gallery
- Roles & Permissions
- Admin Members
- Colleges

## Success Criteria
- 100% of admin actions are scoped to college data
- Leave/complaint statuses update immediately for students
- Guest page reflects admin changes within seconds

---

# Implementation Plan (Admin Module)

## Phase 1: Foundations
1. **Finalize schema & tenancy guarantees**
   - Ensure `collegeId` exists on `Admin`, `Student`, `Hostel`, `Gallery`, and is consistently enforced in queries.
   - Prefer database-level constraints or query helpers that always include `collegeId`.

2. **Authentication & authorization**
   - Admin login with role check (Role.ADMIN)
   - Session/token includes `adminId` + `collegeId`
   - Middleware enforces role + college scoping

3. **Service layer conventions**
   - Create service helpers: `requireAdmin`, `requireCollegeScope`
   - All service calls accept `collegeId` explicitly to prevent leaks

4. **College creation**
   - Define who can create colleges (platform admin vs. college admin)
   - If allowed in MVP:
     - `POST /admin/colleges` (create college + initial admin assignment)
     - `GET /admin/colleges` (list, if multi-college admin)

## Phase 2: Student Management
1. **Backend**
   - Endpoints:
     - `POST /admin/students` (create)
     - `GET /admin/students` (list, paginated)
     - `PATCH /admin/students/:id` (update)
     - `PATCH /admin/students/:id/deactivate` (soft disable)
   - Server-side validation for `email`, `roomNumber`

2. **Frontend**
   - List with pagination and search
   - Create/edit modal

## Phase 3: Leave Management
1. **Backend**
   - `GET /admin/leaves?status=PENDING` (queue)
   - `PATCH /admin/leaves/:id` (approve/reject)
   - Ensure leave belongs to student in admin’s college

2. **Frontend**
   - Pending queue + history tabs
   - Status update controls

## Phase 4: Complaint Management
1. **Backend**
   - `GET /admin/complaints?status=PENDING`
   - `PATCH /admin/complaints/:id` (resolve)
   - Ensure complaint belongs to student in admin’s college

2. **Frontend**
   - Pending/resolved view
   - Detail drawer

## Phase 5: Hostel Config + Gallery
1. **Hostel Config**
   - `GET /admin/hostel` and `PATCH /admin/hostel`

2. **Gallery**
   - `POST /admin/gallery` (upload + metadata)
   - `DELETE /admin/gallery/:id`
   - Store image URL (cloud or local storage)

## Phase 6: Roles & Admin Members (Main Requirement)
1. **Backend (RBAC)**
   - Concepts:
     - Role = set of permissions
     - Permission = allow view/create/edit/delete per module
   - Modules:
     - Students, Leaves, Complaints, Hostel, Gallery, Roles, Members
   - Endpoints:
     - `POST /admin/roles` (create role with permissions)
     - `GET /admin/roles` (list roles)
     - `PATCH /admin/roles/:id` (update permissions)
     - `DELETE /admin/roles/:id` (delete role if not in use)
     - `POST /admin/members` (add admin user with role)
     - `GET /admin/members` (list admins)
     - `PATCH /admin/members/:id` (change role, update status)
     - `DELETE /admin/members/:id` (remove admin user)
   - Enforcement:
     - Middleware checks permission per route (view/create/edit/delete)
     - Super admin of the college can manage roles/members

2. **Frontend**
   - Roles screen:
     - Create/edit role
     - Permission matrix (module × view/create/edit/delete)
   - Members screen:
     - List admins, assign role
     - Change role and remove member

---

# Backend Processing Details

## Access Control
- Resolve admin session → `adminId` + `collegeId`
- Every query is scoped with `collegeId`
- For `Leave` and `Complaint`, scope by joining through `Student.collegeId`
- Enforce module-level permissions (view/create/edit/delete) for every admin route

## Validation & Data Integrity
- Use request validation on create/update routes
- Reject any cross-college IDs early

## Event Consistency
- Admin updates (leave/complaint/hostel/gallery) should be reflected immediately in student/guest views

---

# Caching Strategy (Reduce API Calls)

## What to Cache
- Admin dashboard summary (counts of pending leaves, pending complaints, total students)
- Guest-facing hostel profile + gallery
- Student list (paginated) with short TTL
- Roles list and permissions (short TTL; invalidate on role change)
- Admin members list (short TTL; invalidate on member change)

## Where to Cache
- In-memory cache (server) for low scale
- Redis recommended for multi-instance deployment

## Suggested Cache Keys
- `admin:dashboard:{collegeId}`
- `guest:hostel:{collegeId}`
- `guest:gallery:{collegeId}`
- `admin:students:{collegeId}:page:{n}:q:{search}`
- `admin:roles:{collegeId}`
- `admin:members:{collegeId}:page:{n}:q:{search}`

## Invalidation Rules
- On student create/update/deactivate → invalidate student list + dashboard counts
- On leave status update → invalidate dashboard + student leave list
- On complaint status update → invalidate dashboard + student complaint list
- On hostel/gallery update → invalidate guest caches
- On role create/update/delete → invalidate roles cache + members cache (if roles shown)
- On member add/update/delete → invalidate members cache

## HTTP Optimization
- Use `ETag` or `Last-Modified` for guest endpoints
- Support `If-None-Match` to avoid re-downloading gallery data

---

# Open Questions
- Should admins create students or should students self-register?
- Do we need soft-delete vs. hard-delete for students?
- Where will gallery images be stored (S3, Cloudinary, local)?
- Do we enforce password reset or admin invite flow?
- Who is the initial "college super admin" that can manage roles and members?
