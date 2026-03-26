v# KEC Hostel — MVP Implementation Plan
> **For:** Codex / AI-assisted implementation  
> **Repo:** `kec-hostel` (Next.js 16, App Router, Prisma 7, PostgreSQL, Tailwind 4)  
> **Stack confirmed:** Next.js App Router · Prisma · PostgreSQL · TypeScript · Tailwind CSS  
> **Do steps in order. Each step has exact file paths, full code, and clear instructions.**

---

## Current Repo State (Read Before Starting)

```
app/
  api/test/route.ts        ← only API route, uses raw pg, DELETE this
  page.tsx                 ← Next.js boilerplate, will be replaced
  layout.tsx               ← keep, update title/meta only
  globals.css              ← keep
lib/
  db.ts                    ← raw pg Pool, DELETE this
prisma/
  schema.prisma            ← exists but incomplete, will be fully replaced
prisma.config.ts           ← keep as-is
package.json               ← has both pg + @prisma/client, remove pg
```

---

## Step 1 — Clean Up Conflicting Files

**Why:** The repo has both `pg` (raw SQL) and `@prisma/client` installed. This causes confusion. Prisma is the chosen data layer. Remove `pg` and its usage completely before writing any new code.

### 1a. Delete these files

```
DELETE: lib/db.ts
DELETE: app/api/test/route.ts
```

### 1b. Remove `pg` from `package.json`

Open `package.json`. In the `dependencies` block, remove this line:
```json
"pg": "^8.20.0",
```

Also remove from `devDependencies` if present:
```json
"@types/pg": "..."
```

After editing, run:
```bash
yarn install
```

### 1c. Create `lib/prisma.ts`

Create a new file at `lib/prisma.ts` with this exact content:

```ts
import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var _prisma: PrismaClient | undefined
}

const prisma = globalThis._prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis._prisma = prisma
}

export default prisma
```

> This singleton pattern prevents creating multiple Prisma connections during hot reload in development. Always import from `@/lib/prisma` — never instantiate `PrismaClient` directly in route files.

---

## Step 2 — Fix and Replace `prisma/schema.prisma`

**Why:** The current schema is missing: `Class`, `Role`, `RolePermission`, `AdminMember` models. `Leave` is missing `assignedTo`, `reviewedBy`, `reviewedAt`, `collegeId`. `Student` is missing `rollNumber`, `classId`, `hostelId`. The `datasource` block is missing the `url` field which will break all migrations.

**Action:** Replace the entire contents of `prisma/schema.prisma` with the following. Do not keep the old content.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}


// ─── ENUMS ────────────────────────────────────────────────────────────────────


enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
}

enum ComplaintStatus {
  PENDING
  RESOLVED
}


// ─── COLLEGE ──────────────────────────────────────────────────────────────────


model College {
  id        String   @id @default(uuid())
  name      String
  domain    String?
  location  String
  createdAt DateTime @default(now())

  admins      Admin[]
  members     AdminMember[]
  students    Student[]
  hostels     Hostel[]
  classes     Class[]
  roles       Role[]
  gallery     Gallery[]
}


// ─── ADMIN (college owner) ────────────────────────────────────────────────────


model Admin {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  collegeId String
  createdAt DateTime @default(now())

  college   College  @relation(fields: [collegeId], references: [id])
}


// ─── ROLES ────────────────────────────────────────────────────────────────────


model Role {
  id        String   @id @default(uuid())
  name      String
  collegeId String
  createdAt DateTime @default(now())

  college     College          @relation(fields: [collegeId], references: [id])
  permissions RolePermission[]
  members     AdminMember[]
}


// ─── ROLE PERMISSIONS ─────────────────────────────────────────────────────────
// One row per module per role.
// module values: "students" | "leaves" | "complaints"


model RolePermission {
  id        String  @id @default(uuid())
  roleId    String
  module    String
  canView   Boolean @default(false)
  canCreate Boolean @default(false)
  canEdit   Boolean @default(false)
  canDelete Boolean @default(false)

  role      Role    @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@unique([roleId, module])
}


// ─── ADMIN MEMBERS (staff) ────────────────────────────────────────────────────
// Staff created by Admin. Access controlled by Role.
// classId / hostelId are optional scope restrictions.


model AdminMember {
  id        String   @id @default(uuid())
  name      String
  email     String   @unique
  password  String
  roleId    String
  collegeId String
  classId   String?
  hostelId  String?
  createdAt DateTime @default(now())

  role      Role     @relation(fields: [roleId], references: [id])
  college   College  @relation(fields: [collegeId], references: [id])
  class     Class?   @relation(fields: [classId], references: [id])
  hostel    Hostel?  @relation(fields: [hostelId], references: [id])

  assignedLeaves  Leave[] @relation("AssignedTo")
  reviewedLeaves  Leave[] @relation("ReviewedBy")
}


// ─── CLASS ────────────────────────────────────────────────────────────────────


model Class {
  id        String   @id @default(uuid())
  name      String
  collegeId String
  createdAt DateTime @default(now())

  college   College       @relation(fields: [collegeId], references: [id])
  students  Student[]
  members   AdminMember[]
}


// ─── HOSTEL ───────────────────────────────────────────────────────────────────


model Hostel {
  id        String   @id @default(uuid())
  name      String
  location  String
  capacity  Int
  collegeId String
  createdAt DateTime @default(now())

  college   College       @relation(fields: [collegeId], references: [id])
  students  Student[]
  members   AdminMember[]
}


// ─── STUDENT ──────────────────────────────────────────────────────────────────


model Student {
  id          String   @id @default(uuid())
  name        String
  email       String   @unique
  password    String
  rollNumber  String
  collegeId   String
  classId     String?
  hostelId    String?
  createdAt   DateTime @default(now())

  college     College    @relation(fields: [collegeId], references: [id])
  class       Class?     @relation(fields: [classId], references: [id])
  hostel      Hostel?    @relation(fields: [hostelId], references: [id])

  leaves      Leave[]
  complaints  Complaint[]
  reviews     Review[]
}


// ─── LEAVE ────────────────────────────────────────────────────────────────────


model Leave {
  id           String      @id @default(uuid())
  studentId    String
  reason       String
  fromDate     DateTime
  toDate       DateTime
  status       LeaveStatus @default(PENDING)
  assignedToId String?
  reviewedById String?
  reviewedAt   DateTime?
  collegeId    String
  createdAt    DateTime    @default(now())

  student      Student      @relation(fields: [studentId], references: [id])
  assignedTo   AdminMember? @relation("AssignedTo", fields: [assignedToId], references: [id])
  reviewedBy   AdminMember? @relation("ReviewedBy", fields: [reviewedById], references: [id])
}


// ─── COMPLAINT ────────────────────────────────────────────────────────────────


model Complaint {
  id          String          @id @default(uuid())
  studentId   String
  title       String
  description String
  status      ComplaintStatus @default(PENDING)
  createdAt   DateTime        @default(now())

  student     Student         @relation(fields: [studentId], references: [id])
}


// ─── REVIEW ───────────────────────────────────────────────────────────────────


model Review {
  id        String   @id @default(uuid())
  studentId String
  rating    Int
  comment   String?
  createdAt DateTime @default(now())

  student   Student  @relation(fields: [studentId], references: [id])
}


// ─── GALLERY ──────────────────────────────────────────────────────────────────


model Gallery {
  id        String   @id @default(uuid())
  imageUrl  String
  caption   String?
  collegeId String
  createdAt DateTime @default(now())

  college   College  @relation(fields: [collegeId], references: [id])
}
```

### Run the migration

Make sure `DATABASE_URL` is set in `.env`:
```
DATABASE_URL="postgresql://user:password@localhost:5432/kec_hostel"
```

Then run:
```bash
yarn prisma migrate dev --name init_mvp_schema
yarn prisma generate
```

---

## Step 3 — Install Required Packages

**Why:** Auth needs `bcryptjs` for password hashing and `jsonwebtoken` for JWT. `zod` for input validation. None are currently in `package.json`.

Run:
```bash
yarn add bcryptjs jsonwebtoken zod
yarn add -D @types/bcryptjs @types/jsonwebtoken
```

---

## Step 4 — Auth Utilities

**Why:** JWT sign/verify and password hashing are used in every auth route. Centralise them here so they are never duplicated.

### 4a. Create `lib/auth/password.ts`

```ts
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed)
}
```

### 4b. Create `lib/auth/jwt.ts`

```ts
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET!
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

export type TokenUserType = 'ADMIN' | 'MEMBER' | 'STUDENT'

export interface JwtPayload {
  sub: string          // user id
  type: TokenUserType
  collegeId: string
  roleId?: string      // only for MEMBER
  classId?: string     // only for MEMBER, nullable
  hostelId?: string    // only for MEMBER, nullable
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '15m' })
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload
}
```

Add to `.env`:
```
JWT_SECRET="replace-with-long-random-string"
JWT_REFRESH_SECRET="replace-with-different-long-random-string"
```

### 4c. Create `lib/auth/session.ts`

This helper is called at the top of every protected API route. It reads the `Authorization` header, verifies the token, and returns the payload. If the token is missing or invalid it throws — the route handler catches and returns 401.

```ts
import { NextRequest } from 'next/server'
import { verifyAccessToken, JwtPayload } from './jwt'

export function getSession(req: NextRequest): JwtPayload {
  const header = req.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) throw new Error('UNAUTHORIZED')

  try {
    return verifyAccessToken(token)
  } catch {
    throw new Error('UNAUTHORIZED')
  }
}
```

### 4d. Create `lib/api/response.ts`

Standardises all API responses so every route returns the same shape.

```ts
import { NextResponse } from 'next/server'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function err(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}
```

---

## Step 5 — RBAC and Scope Helpers

**Why:** Every protected route does two checks: (1) does this role have permission to do this action on this module? (2) is this student within the member's class/hostel scope? Centralise both checks here.

### 5a. Create `lib/rbac.ts`

```ts
import prisma from '@/lib/prisma'

type Action = 'canView' | 'canCreate' | 'canEdit' | 'canDelete'

/**
 * Checks if a role has permission to perform an action on a module.
 * Throws 'FORBIDDEN' if not.
 * ADMINs bypass this check — call only for MEMBER type users.
 */
export async function requirePermission(
  roleId: string,
  module: string,
  action: Action
): Promise<void> {
  const permission = await prisma.rolePermission.findUnique({
    where: { roleId_module: { roleId, module } },
  })

  if (!permission || !permission[action]) {
    throw new Error('FORBIDDEN')
  }
}
```

### 5b. Create `lib/scope.ts`

```ts
/**
 * Checks if a member's scope allows them to access a given student.
 *
 * Rules (from PRD):
 *   - classId set  → member can only see students in that class
 *   - hostelId set → member can only see students in that hostel
 *   - both null    → full access (all students in the college)
 *   - both set     → student must match both
 *
 * Throws 'SCOPE_DENIED' if access is not allowed.
 * ADMINs bypass this — call only for MEMBER type users.
 */
export function assertScope(
  member: { classId: string | null; hostelId: string | null },
  student: { classId: string | null; hostelId: string | null }
): void {
  if (member.classId && student.classId !== member.classId) {
    throw new Error('SCOPE_DENIED')
  }
  if (member.hostelId && student.hostelId !== member.hostelId) {
    throw new Error('SCOPE_DENIED')
  }
}

/**
 * Returns a Prisma `where` clause fragment that filters students
 * to only those visible to this member. Use in list queries.
 */
export function scopeFilter(member: {
  classId: string | null
  hostelId: string | null
  collegeId: string
}) {
  return {
    collegeId: member.collegeId,
    ...(member.classId ? { classId: member.classId } : {}),
    ...(member.hostelId ? { hostelId: member.hostelId } : {}),
  }
}
```

---

## Step 6 — Auth API Routes

**Why:** Three user types log in separately. Each returns an access token (short-lived, 15m) and refresh token (long-lived, 7d) as HttpOnly cookies.

### 6a. Create `app/api/auth/admin/login/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    const admin = await prisma.admin.findUnique({ where: { email: body.email } })
    if (!admin) return err('Invalid credentials', 401)

    const valid = await verifyPassword(body.password, admin.password)
    if (!valid) return err('Invalid credentials', 401)

    const payload = { sub: admin.id, type: 'ADMIN' as const, collegeId: admin.collegeId }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    return ok({ accessToken, refreshToken })
  } catch (e) {
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err('Server error', 500)
  }
}
```

### 6b. Create `app/api/auth/member/login/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    const member = await prisma.adminMember.findUnique({ where: { email: body.email } })
    if (!member) return err('Invalid credentials', 401)

    const valid = await verifyPassword(body.password, member.password)
    if (!valid) return err('Invalid credentials', 401)

    const payload = {
      sub: member.id,
      type: 'MEMBER' as const,
      collegeId: member.collegeId,
      roleId: member.roleId,
      classId: member.classId ?? undefined,
      hostelId: member.hostelId ?? undefined,
    }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    return ok({ accessToken, refreshToken })
  } catch (e) {
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err('Server error', 500)
  }
}
```

### 6c. Create `app/api/auth/student/login/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword } from '@/lib/auth/password'
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    const student = await prisma.student.findUnique({ where: { email: body.email } })
    if (!student) return err('Invalid credentials', 401)

    const valid = await verifyPassword(body.password, student.password)
    if (!valid) return err('Invalid credentials', 401)

    const payload = { sub: student.id, type: 'STUDENT' as const, collegeId: student.collegeId }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    return ok({ accessToken, refreshToken })
  } catch (e) {
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err('Server error', 500)
  }
}
```

### 6d. Create `app/api/auth/admin/register/route.ts`

This is how the first Admin account for a college is created. This route is public (no auth required). It creates the College and the Admin in one transaction.

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({
  collegeName: z.string().min(1),
  collegeLocation: z.string().min(1),
  adminName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())

    const existing = await prisma.admin.findUnique({ where: { email: body.email } })
    if (existing) return err('Email already registered', 409)

    const hashed = await hashPassword(body.password)

    const result = await prisma.$transaction(async (tx) => {
      const college = await tx.college.create({
        data: { name: body.collegeName, location: body.collegeLocation },
      })
      const admin = await tx.admin.create({
        data: {
          name: body.adminName,
          email: body.email,
          password: hashed,
          collegeId: college.id,
        },
      })
      return { college, admin }
    })

    return ok({ collegeId: result.college.id, adminId: result.admin.id }, 201)
  } catch (e) {
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err('Server error', 500)
  }
}
```

---

## Step 7 — Roles API

**Why:** Admin creates roles and sets which modules each role can access. These routes are admin-only.

### 7a. Create `app/api/roles/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
})

// GET /api/roles — list all roles for the admin's college
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const roles = await prisma.role.findMany({
      where: { collegeId: session.collegeId },
      include: { permissions: true, _count: { select: { members: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return ok(roles)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

// POST /api/roles — create a new role
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const body = createSchema.parse(await req.json())

    const role = await prisma.role.create({
      data: { name: body.name, collegeId: session.collegeId },
    })

    return ok(role, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
```

### 7b. Create `app/api/roles/[id]/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

// DELETE /api/roles/:id — delete a role only if no members are assigned to it
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const role = await prisma.role.findUnique({
      where: { id: params.id },
      include: { _count: { select: { members: true } } },
    })

    if (!role) return err('Role not found', 404)
    if (role.collegeId !== session.collegeId) return err('Forbidden', 403)
    if (role._count.members > 0) return err('Cannot delete role with assigned members', 409)

    await prisma.role.delete({ where: { id: params.id } })

    return ok({ deleted: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
```

### 7c. Create `app/api/roles/[id]/permissions/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const MODULES = ['students', 'leaves', 'complaints'] as const

const permissionSchema = z.array(
  z.object({
    module: z.enum(MODULES),
    canView: z.boolean(),
    canCreate: z.boolean(),
    canEdit: z.boolean(),
    canDelete: z.boolean(),
  })
)

// GET /api/roles/:id/permissions
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const role = await prisma.role.findUnique({ where: { id: params.id } })
    if (!role || role.collegeId !== session.collegeId) return err('Not found', 404)

    const permissions = await prisma.rolePermission.findMany({ where: { roleId: params.id } })
    return ok(permissions)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

// PUT /api/roles/:id/permissions — replaces all permissions for the role
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const role = await prisma.role.findUnique({ where: { id: params.id } })
    if (!role || role.collegeId !== session.collegeId) return err('Not found', 404)

    const body = permissionSchema.parse(await req.json())

    // Delete existing permissions and replace with new ones atomically
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: params.id } }),
      prisma.rolePermission.createMany({
        data: body.map((p) => ({ roleId: params.id, ...p })),
      }),
    ])

    const updated = await prisma.rolePermission.findMany({ where: { roleId: params.id } })
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

## Step 8 — Admin Members API

**Why:** Admin creates staff accounts and assigns them a role. Optionally scopes them to a class or hostel.

### 8a. Create `app/api/members/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().uuid(),
  classId: z.string().uuid().optional(),
  hostelId: z.string().uuid().optional(),
})

// GET /api/members
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const members = await prisma.adminMember.findMany({
      where: { collegeId: session.collegeId },
      include: { role: true, class: true, hostel: true },
      orderBy: { createdAt: 'asc' },
    })

    // Never send password hashes to client
    return ok(members.map(({ password: _, ...m }) => m))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}

// POST /api/members
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const body = createSchema.parse(await req.json())

    // Verify role belongs to this college
    const role = await prisma.role.findUnique({ where: { id: body.roleId } })
    if (!role || role.collegeId !== session.collegeId) return err('Invalid role', 400)

    const existing = await prisma.adminMember.findUnique({ where: { email: body.email } })
    if (existing) return err('Email already in use', 409)

    const hashed = await hashPassword(body.password)

    const member = await prisma.adminMember.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashed,
        roleId: body.roleId,
        collegeId: session.collegeId,
        classId: body.classId ?? null,
        hostelId: body.hostelId ?? null,
      },
    })

    const { password: _, ...safe } = member
    return ok(safe, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
```

### 8b. Create `app/api/members/[id]/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  roleId: z.string().uuid().optional(),
  classId: z.string().uuid().nullable().optional(),
  hostelId: z.string().uuid().nullable().optional(),
})

// PUT /api/members/:id
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const member = await prisma.adminMember.findUnique({ where: { id: params.id } })
    if (!member || member.collegeId !== session.collegeId) return err('Not found', 404)

    const body = updateSchema.parse(await req.json())

    const updated = await prisma.adminMember.update({
      where: { id: params.id },
      data: body,
    })

    const { password: _, ...safe } = updated
    return ok(safe)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}

// DELETE /api/members/:id
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const member = await prisma.adminMember.findUnique({ where: { id: params.id } })
    if (!member || member.collegeId !== session.collegeId) return err('Not found', 404)

    await prisma.adminMember.delete({ where: { id: params.id } })
    return ok({ deleted: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
```

---

## Step 9 — Students API

**Why:** Admin can create/list/update students. Members can list students but only within their scope.

### 9a. Create `app/api/students/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/rbac'
import { scopeFilter } from '@/lib/scope'
import { hashPassword } from '@/lib/auth/password'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  rollNumber: z.string().min(1),
  classId: z.string().uuid().optional(),
  hostelId: z.string().uuid().optional(),
})

// GET /api/students
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)

    let where: object

    if (session.type === 'ADMIN') {
      where = { collegeId: session.collegeId }
    } else if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'students', 'canView')
      where = scopeFilter({
        collegeId: session.collegeId,
        classId: session.classId ?? null,
        hostelId: session.hostelId ?? null,
      })
    } else {
      return err('Forbidden', 403)
    }

    const students = await prisma.student.findMany({
      where,
      include: { class: true, hostel: true },
      orderBy: { name: 'asc' },
    })

    return ok(students.map(({ password: _, ...s }) => s))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    return err(msg, 500)
  }
}

// POST /api/students — Admin only
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const body = createSchema.parse(await req.json())

    const existing = await prisma.student.findUnique({ where: { email: body.email } })
    if (existing) return err('Email already in use', 409)

    const hashed = await hashPassword(body.password)

    const student = await prisma.student.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashed,
        rollNumber: body.rollNumber,
        collegeId: session.collegeId,
        classId: body.classId ?? null,
        hostelId: body.hostelId ?? null,
      },
    })

    const { password: _, ...safe } = student
    return ok(safe, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
```

### 9b. Create `app/api/students/[id]/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  rollNumber: z.string().min(1).optional(),
  classId: z.string().uuid().nullable().optional(),
  hostelId: z.string().uuid().nullable().optional(),
})

// PUT /api/students/:id — Admin only
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req)
    if (session.type !== 'ADMIN') return err('Forbidden', 403)

    const student = await prisma.student.findUnique({ where: { id: params.id } })
    if (!student || student.collegeId !== session.collegeId) return err('Not found', 404)

    const body = updateSchema.parse(await req.json())
    const updated = await prisma.student.update({ where: { id: params.id }, data: body })

    const { password: _, ...safe } = updated
    return ok(safe)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
```

---

## Step 10 — Leaves API

**Why:** This is the core MVP feature. Students submit leaves. Admin/Member assigns them. Assigned member approves or rejects.

### 10a. Create `app/api/leaves/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/rbac'
import { scopeFilter } from '@/lib/scope'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const createSchema = z.object({
  reason: z.string().min(1),
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
})

// GET /api/leaves
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)

    let where: object

    if (session.type === 'ADMIN') {
      where = { collegeId: session.collegeId }
    } else if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'leaves', 'canView')
      // Filter leaves to only students in member's scope
      const studentFilter = scopeFilter({
        collegeId: session.collegeId,
        classId: session.classId ?? null,
        hostelId: session.hostelId ?? null,
      })
      where = { student: studentFilter }
    } else if (session.type === 'STUDENT') {
      // Students only see their own leaves
      where = { studentId: session.sub }
    } else {
      return err('Forbidden', 403)
    }

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
        assignedTo: { select: { id: true, name: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return ok(leaves)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (msg === 'FORBIDDEN') return err('Forbidden', 403)
    return err(msg, 500)
  }
}

// POST /api/leaves — Student submits a leave request
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (session.type !== 'STUDENT') return err('Only students can submit leaves', 403)

    const body = createSchema.parse(await req.json())

    const student = await prisma.student.findUnique({ where: { id: session.sub } })
    if (!student) return err('Student not found', 404)

    const leave = await prisma.leave.create({
      data: {
        studentId: session.sub,
        reason: body.reason,
        fromDate: new Date(body.fromDate),
        toDate: new Date(body.toDate),
        status: 'PENDING',
        collegeId: student.collegeId,
      },
    })

    return ok(leave, 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    if (e instanceof z.ZodError) return err('Invalid request body', 400)
    return err(msg, 500)
  }
}
```

### 10b. Create `app/api/leaves/[id]/assign/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { requirePermission } from '@/lib/rbac'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({ memberId: z.string().uuid() })

// PUT /api/leaves/:id/assign — Admin or Member with leaves.canCreate assigns the leave
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req)

    if (session.type === 'MEMBER') {
      await requirePermission(session.roleId!, 'leaves', 'canCreate')
    } else if (session.type !== 'ADMIN') {
      return err('Forbidden', 403)
    }

    const { memberId } = schema.parse(await req.json())

    const leave = await prisma.leave.findUnique({ where: { id: params.id } })
    if (!leave || leave.collegeId !== session.collegeId) return err('Not found', 404)
    if (leave.status !== 'PENDING') return err('Leave is not in PENDING status', 409)

    // Verify the target member belongs to the same college
    const member = await prisma.adminMember.findUnique({ where: { id: memberId } })
    if (!member || member.collegeId !== session.collegeId) return err('Invalid member', 400)

    const updated = await prisma.leave.update({
      where: { id: params.id },
      data: { assignedToId: memberId },
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

### 10c. Create `app/api/leaves/[id]/approve/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'

// PUT /api/leaves/:id/approve — only the assigned member (or admin) can approve
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req)

    const leave = await prisma.leave.findUnique({ where: { id: params.id } })
    if (!leave || leave.collegeId !== session.collegeId) return err('Not found', 404)
    if (leave.status !== 'PENDING') return err('Leave is not in PENDING status', 409)

    // Members can only approve if they are the assigned member
    if (session.type === 'MEMBER' && leave.assignedToId !== session.sub) {
      return err('You are not assigned to this leave', 403)
    }

    if (session.type === 'STUDENT') return err('Forbidden', 403)

    const updated = await prisma.leave.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        reviewedById: session.sub,
        reviewedAt: new Date(),
      },
    })

    return ok(updated)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
```

### 10d. Create `app/api/leaves/[id]/reject/route.ts`

```ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth/session'
import { ok, err } from '@/lib/api/response'
import { z } from 'zod'

const schema = z.object({ reason: z.string().optional() })

// PUT /api/leaves/:id/reject — only the assigned member (or admin) can reject
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = getSession(req)
    const body = schema.parse(await req.json())

    const leave = await prisma.leave.findUnique({ where: { id: params.id } })
    if (!leave || leave.collegeId !== session.collegeId) return err('Not found', 404)
    if (leave.status !== 'PENDING') return err('Leave is not in PENDING status', 409)

    if (session.type === 'MEMBER' && leave.assignedToId !== session.sub) {
      return err('You are not assigned to this leave', 403)
    }

    if (session.type === 'STUDENT') return err('Forbidden', 403)

    const updated = await prisma.leave.update({
      where: { id: params.id },
      data: {
        status: 'REJECTED',
        reviewedById: session.sub,
        reviewedAt: new Date(),
      },
    })

    return ok(updated)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    if (msg === 'UNAUTHORIZED') return err('Unauthorized', 401)
    return err(msg, 500)
  }
}
```

---

## Step 11 — Seed File

**Why:** Without seed data you can't test any of the above manually. This creates one college, one admin, one role with permissions, one member, one student, and one leave.

### Create `prisma/seed.ts`

```ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const college = await prisma.college.upsert({
    where: { id: 'seed-college-id' },
    update: {},
    create: {
      id: 'seed-college-id',
      name: 'KEC College',
      location: 'Coimbatore',
    },
  })

  const adminPassword = await bcrypt.hash('admin@123', 12)
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@kec.ac.in' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@kec.ac.in',
      password: adminPassword,
      collegeId: college.id,
    },
  })

  const role = await prisma.role.upsert({
    where: { id: 'seed-role-id' },
    update: {},
    create: {
      id: 'seed-role-id',
      name: 'Class Advisor',
      collegeId: college.id,
    },
  })

  await prisma.rolePermission.upsert({
    where: { roleId_module: { roleId: role.id, module: 'students' } },
    update: {},
    create: { roleId: role.id, module: 'students', canView: true },
  })

  await prisma.rolePermission.upsert({
    where: { roleId_module: { roleId: role.id, module: 'leaves' } },
    update: {},
    create: { roleId: role.id, module: 'leaves', canView: true, canCreate: true },
  })

  const memberPassword = await bcrypt.hash('member@123', 12)
  const member = await prisma.adminMember.upsert({
    where: { email: 'advisor@kec.ac.in' },
    update: {},
    create: {
      name: 'Class Advisor',
      email: 'advisor@kec.ac.in',
      password: memberPassword,
      roleId: role.id,
      collegeId: college.id,
    },
  })

  const studentPassword = await bcrypt.hash('student@123', 12)
  const student = await prisma.student.upsert({
    where: { email: 'student@kec.ac.in' },
    update: {},
    create: {
      name: 'Test Student',
      email: 'student@kec.ac.in',
      password: studentPassword,
      rollNumber: '21CS001',
      collegeId: college.id,
    },
  })

  await prisma.leave.create({
    data: {
      studentId: student.id,
      reason: 'Medical appointment',
      fromDate: new Date('2025-02-01'),
      toDate: new Date('2025-02-02'),
      status: 'PENDING',
      collegeId: college.id,
    },
  })

  console.log('Seed complete')
  console.log('Admin:   admin@kec.ac.in / admin@123')
  console.log('Member:  advisor@kec.ac.in / member@123')
  console.log('Student: student@kec.ac.in / student@123')
}

main().finally(() => prisma.$disconnect())
```

Add to `package.json` scripts:
```json
"seed": "ts-node --compiler-options '{\"module\":\"CommonJS\"}' prisma/seed.ts"
```

Run with:
```bash
yarn prisma db seed
```

Or directly:
```bash
yarn seed
```

---

## Step 12 — Environment Variables

**Why:** Without these set, nothing runs. Create `.env` in the repo root (never commit this file).

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/kec_hostel"
JWT_SECRET="your-super-secret-access-token-key-min-32-chars"
JWT_REFRESH_SECRET="your-different-refresh-token-key-min-32-chars"
```

Make sure `.env` is in `.gitignore`:
```
echo ".env" >> .gitignore
```

---

## Final File Tree After All Steps

```
app/
  api/
    auth/
      admin/
        login/route.ts
        register/route.ts
      member/
        login/route.ts
      student/
        login/route.ts
    roles/
      route.ts
      [id]/
        route.ts
        permissions/route.ts
    members/
      route.ts
      [id]/route.ts
    students/
      route.ts
      [id]/route.ts
    leaves/
      route.ts
      [id]/
        assign/route.ts
        approve/route.ts
        reject/route.ts
  page.tsx               ← replace boilerplate later
  layout.tsx             ← keep
  globals.css            ← keep
lib/
  prisma.ts              ← NEW (replaces db.ts)
  rbac.ts                ← NEW
  scope.ts               ← NEW
  auth/
    jwt.ts               ← NEW
    password.ts          ← NEW
    session.ts           ← NEW
  api/
    response.ts          ← NEW
prisma/
  schema.prisma          ← REPLACED
  seed.ts                ← NEW
.env                     ← NEW (never commit)
```

---

## Implementation Order Checklist

```
[ ] Step 1  — Delete lib/db.ts, delete app/api/test/route.ts, remove pg from package.json, create lib/prisma.ts
[ ] Step 2  — Replace prisma/schema.prisma fully, run prisma migrate dev, run prisma generate
[ ] Step 3  — yarn add bcryptjs jsonwebtoken zod + types
[ ] Step 4  — Create lib/auth/password.ts, lib/auth/jwt.ts, lib/auth/session.ts, lib/api/response.ts
[ ] Step 5  — Create lib/rbac.ts, lib/scope.ts
[ ] Step 6  — Create all 4 auth routes (admin login, admin register, member login, student login)
[ ] Step 7  — Create roles routes (list, create, delete, get/put permissions)
[ ] Step 8  — Create members routes (list, create, update, delete)
[ ] Step 9  — Create students routes (list, create, update)
[ ] Step 10 — Create leaves routes (list, submit, assign, approve, reject)
[ ] Step 11 — Create prisma/seed.ts, add seed script to package.json, run seed
[ ] Step 12 — Create .env with DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET
```
