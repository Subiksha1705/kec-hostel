# College Management Platform — MVP PRD
**Phase 1 | Version 1.0 | Status: Ready to Build**

---

> **Core Principle:** Build a working system, not a perfect system.
> Ship it → test it → evolve it. Workflow engines, SLA timers, and escalation logic are Phase 3 — not now.

---

## 1. Overview

The MVP focuses on three things:

- **Admin setup** — colleges onboard, create roles, add staff members
- **Role-based access control** — simple module-level permissions (view, create, edit, delete)
- **Leave management** — students submit leaves, staff approve or reject

---

## 2. User Types

Only three user types in MVP. Super Admin is excluded for now.

### Admin (College-level)
- One per college — the primary account owner
- Can create and manage roles
- Can add and manage admin members (staff)
- Has full access to all modules

### Admin Member (Staff)
- Created by the Admin (warden, class advisor, HOD, etc.)
- Access is determined entirely by the role assigned to them
- May be optionally scoped to a specific class or hostel

### Student
- Registered under a college
- Can submit leave requests
- Can view their own leave status

---

## 3. Roles & Permissions

Roles are created by the Admin. A role defines which modules a member can access and at what level. No micro-level permissions — just module-level checkboxes.

### 3.1 How It Works

1. Admin creates a role (e.g. "Class Advisor", "Warden", "HOD")
2. Admin checks which modules this role can access and at what level
3. Admin assigns the role to a member
4. Member's access is automatically determined by the role

### 3.2 Permission Matrix (Example — Class Advisor Role)

| Module     | View | Create | Edit | Delete |
|------------|:----:|:------:|:----:|:------:|
| Students   | ✅   | —      | —    | —      |
| Leaves     | ✅   | —      | —    | —      |
| Complaints | ✅   | —      | —    | —      |

The Admin configures different permission levels per role. A Warden might have Create access on Leaves while a Class Advisor only has View.

---

## 4. Database Schema

### 4.1 `colleges`

| Column       | Type      | Notes                  |
|--------------|-----------|------------------------|
| id           | UUID      | Primary key            |
| name         | VARCHAR   | College name           |
| domain       | VARCHAR   | e.g. mit.edu.in        |
| created_at   | TIMESTAMP | Auto-set on insert     |

### 4.2 `admins`

| Column        | Type      | Notes                  |
|---------------|-----------|------------------------|
| id            | UUID      | Primary key            |
| name          | VARCHAR   | Full name              |
| email         | VARCHAR   | Unique, used for login |
| password_hash | TEXT      | Hashed password        |
| college_id    | UUID      | FK → colleges.id       |
| created_at    | TIMESTAMP | Auto-set on insert     |

### 4.3 `roles`

| Column     | Type      | Notes                          |
|------------|-----------|--------------------------------|
| id         | UUID      | Primary key                    |
| name       | VARCHAR   | e.g. Class Advisor, Warden     |
| college_id | UUID      | FK → colleges.id               |
| created_at | TIMESTAMP | Auto-set on insert             |

### 4.4 `role_permissions`

| Column     | Type    | Notes                                     |
|------------|---------|-------------------------------------------|
| id         | UUID    | Primary key                               |
| role_id    | UUID    | FK → roles.id                             |
| module     | VARCHAR | e.g. students, leaves, complaints         |
| can_view   | BOOLEAN | Default false                             |
| can_create | BOOLEAN | Default false                             |
| can_edit   | BOOLEAN | Default false                             |
| can_delete | BOOLEAN | Default false                             |

### 4.5 `admin_members`

| Column        | Type      | Notes                              |
|---------------|-----------|------------------------------------|
| id            | UUID      | Primary key                        |
| name          | VARCHAR   | Full name                          |
| email         | VARCHAR   | Unique                             |
| password_hash | TEXT      | Hashed password                    |
| role_id       | UUID      | FK → roles.id                      |
| college_id    | UUID      | FK → colleges.id                   |
| class_id      | UUID      | Nullable — scope to one class      |
| hostel_id     | UUID      | Nullable — scope to one hostel     |
| created_at    | TIMESTAMP | Auto-set on insert                 |

### 4.6 `students`

| Column      | Type      | Notes                           |
|-------------|-----------|---------------------------------|
| id          | UUID      | Primary key                     |
| name        | VARCHAR   | Full name                       |
| email       | VARCHAR   | Unique                          |
| roll_number | VARCHAR   | College roll number             |
| class_id    | UUID      | FK → classes.id                 |
| hostel_id   | UUID      | Nullable — if hostel student    |
| college_id  | UUID      | FK → colleges.id                |
| created_at  | TIMESTAMP | Auto-set on insert              |

### 4.7 `leaves`

| Column      | Type      | Notes                                    |
|-------------|-----------|------------------------------------------|
| id          | UUID      | Primary key                              |
| student_id  | UUID      | FK → students.id                         |
| reason      | TEXT      | Leave reason                             |
| from_date   | DATE      | Start date                               |
| to_date     | DATE      | End date                                 |
| status      | VARCHAR   | `PENDING` \| `APPROVED` \| `REJECTED`   |
| assigned_to | UUID      | FK → admin_members.id (nullable)         |
| reviewed_by | UUID      | FK → admin_members.id (nullable)         |
| reviewed_at | TIMESTAMP | When action was taken                    |
| college_id  | UUID      | FK → colleges.id                         |
| created_at  | TIMESTAMP | Auto-set on insert                       |

---

## 5. Scope Logic

Admin members can be optionally scoped to a class or hostel. No complex INCLUDE/EXCLUDE — just two nullable fields.

### Rules

- `class_id` set → member can only see students in that class
- `hostel_id` set → member can only see students in that hostel
- Both null → full access to all students in the college
- Both set → restricted to students matching both conditions

### Backend Check

```ts
if (member.class_id && student.class_id !== member.class_id) throw "SCOPE_DENIED";
if (member.hostel_id && student.hostel_id !== member.hostel_id) throw "SCOPE_DENIED";
```

---

## 6. Leave Management Flow

Single-step approval. No workflow engine. No multi-stage routing.

### Flow

1. Student submits a leave request (reason, from date, to date)
2. Admin or Admin Member with `leaves.create` access assigns the request to a staff member
3. Assigned staff member reviews and Approves or Rejects
4. Student sees updated status on their dashboard

### Status States

| Status     | Meaning                          |
|------------|----------------------------------|
| `PENDING`  | Submitted, not yet reviewed      |
| `APPROVED` | Approved by assigned staff       |
| `REJECTED` | Rejected (optional reason)       |

> ⚠️ **No multi-step approvals in MVP.** Multi-level workflows (advisor → HOD → warden) are a Phase 3 feature. One person is responsible, one decision is made.

---

## 7. Authentication

- Email + password login for all user types
- JWT-based sessions (access token + refresh token)
- Role and scope injected into JWT payload for fast permission checks
- Separate login endpoints for Admin, Admin Members, and Students
- Password hashing with bcrypt
- No OAuth / social login in MVP

---

## 8. Key API Endpoints

### Auth
```
POST /auth/admin/login
POST /auth/member/login
POST /auth/student/login
POST /auth/refresh
```

### Roles
```
GET    /roles                    — list all roles for college
POST   /roles                    — create new role
GET    /roles/:id/permissions    — get permissions for role
PUT    /roles/:id/permissions    — update permissions for role
DELETE /roles/:id                — delete role (if no members assigned)
```

### Admin Members
```
GET    /members       — list all members (scoped by college)
POST   /members       — create member
PUT    /members/:id   — update member (role, scope)
DELETE /members/:id   — remove member
```

### Students
```
GET  /students       — list students (scope-filtered automatically)
POST /students       — create student record
PUT  /students/:id   — update student info
```

### Leaves
```
POST /leaves                  — student submits leave
GET  /leaves                  — list leaves (filtered by scope + role)
PUT  /leaves/:id/assign       — admin assigns leave to a member
PUT  /leaves/:id/approve      — member approves leave
PUT  /leaves/:id/reject       — member rejects leave
```

---

## 9. Permission Check Logic

Every API endpoint performs two checks in order:

**Step 1 — Role Permission Check**
```ts
if (!role.permissions.includes("module.action")) throw "FORBIDDEN";
```

**Step 2 — Scope Check**
```ts
if (member.class_id && student.class_id !== member.class_id) throw "SCOPE_DENIED";
```

Admin bypasses scope checks. Admin Members always go through both.

---

## 10. Tech Stack

| Layer          | Choice                              |
|----------------|-------------------------------------|
| Frontend       | Next.js (App Router) + Tailwind CSS + shadcn/ui |
| Backend        | Node.js + Express (or Next.js API routes) |
| Database       | PostgreSQL + Prisma ORM             |
| Auth           | JWT + bcrypt                        |
| Hosting        | Vercel or Railway                   |
| DB Hosting     | Supabase or Neon                    |

No queues, no workers, no schedulers in MVP.

---

## 11. Explicitly Out of Scope (Phase 1)

Do not build these now. They are Phase 3+ features.

- ❌ Workflow engine / multi-step approvals
- ❌ SLA timers and escalation logic
- ❌ `workflow_templates`, `workflow_steps`, `leave_step_records` tables
- ❌ Dynamic role assignment algorithm
- ❌ INCLUDE/EXCLUDE scope configuration
- ❌ `permission_scope_config` table
- ❌ Super Admin
- ❌ Email / SMS notifications
- ❌ Complaints module (Phase 2)
- ❌ Mobile app
- ❌ Analytics or reporting dashboard

---

## 12. Phased Roadmap

| Phase | Scope | Timeline |
|-------|-------|----------|
| **Phase 1 — MVP** | Auth, Roles, Members, Students, Leave (single approval) | Now |
| **Phase 2 — Growth** | Complaints, In-app Notifications | After launch |
| **Phase 3 — Scale** | Multi-step Workflows, Advanced Scopes, SLA Engine | When needed |

> Phase 3 features should only be scoped when Phase 1 is live and there is real user feedback demanding them. Do not pre-build.

---

## 13. MVP Success Criteria

Phase 1 is complete when all of the following are true:

- [ ] Admin can sign up and onboard their college
- [ ] Admin can create roles with module-level permissions
- [ ] Admin can add staff members and assign roles
- [ ] Staff members can log in and see only what their role allows
- [ ] Students can log in and submit leave requests
- [ ] Staff can approve or reject assigned leaves
- [ ] Scope restrictions work correctly for class and hostel filters
- [ ] All API endpoints return correct permission errors when access is denied

> ✅ If all 8 criteria above are met, the MVP is shippable. Do not delay launch for features not on this list.