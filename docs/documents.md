# Feature: Announcements Carousel with Parallel Routing

## Overview
Add an announcements carousel to the student dashboard using **Next.js App Router parallel routing**. Admins/Wardens post announcements (poster image, description, link); students see them as an auto-playing carousel in the dashboard sidebar.

---

## 1. Database — Add `Announcement` model to `prisma/schema.prisma`

```prisma
model Announcement {
  id          String   @id @default(cuid())
  title       String
  description String
  imageUrl    String?
  linkUrl     String?
  linkLabel   String?
  postedBy    String
  role        String        // "Admin" | "Warden" | "Chief Warden" | "Staff"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([isActive, createdAt])
}
```

Run after adding:
```bash
yarn prisma migrate dev --name add_announcements
```

---

## 2. API Routes

### `src/app/api/announcements/route.ts`

```ts
// GET  — returns all active announcements, newest first
// POST — creates a new announcement (admin/warden use)

GET  /api/announcements
POST /api/announcements
     Body: { title, description, imageUrl?, linkUrl?, linkLabel?, postedBy, role }
```

- `GET`: `prisma.announcement.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })`
- `POST`: validate required fields (`title`, `description`, `postedBy`, `role`), then `prisma.announcement.create(...)`
- Return appropriate HTTP status codes (`200`, `201`, `400`, `500`)

---

## 3. Parallel Routing Structure

```
src/app/dashboard/
├── layout.tsx                  ← MODIFY: add announcements slot
├── page.tsx                    ← unchanged (existing dashboard)
└── @announcements/
    ├── page.tsx                ← NEW: server component, fetches announcements
    └── loading.tsx             ← NEW: skeleton shown while fetching
```

### `src/app/dashboard/layout.tsx`

Accept and render the `@announcements` parallel slot:

```tsx
interface DashboardLayoutProps {
  children: React.ReactNode;
  announcements: React.ReactNode;  // parallel slot
}

export default function DashboardLayout({ children, announcements }: DashboardLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
        <main>{children}</main>
        <aside className="xl:sticky xl:top-6">{announcements}</aside>
      </div>
    </div>
  );
}
```

### `src/app/dashboard/@announcements/page.tsx`

Server component — fetches from DB and passes to carousel:

```tsx
import { prisma } from "@/lib/prisma";
import AnnouncementsCarousel from "@/components/announcements/AnnouncementsCarousel";

export default async function AnnouncementsSlot() {
  const announcements = await prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return <AnnouncementsCarousel announcements={announcements} />;
}
```

### `src/app/dashboard/@announcements/loading.tsx`

Pulse skeleton matching the carousel card height (~380px). Include:
- A rectangular image placeholder (h-44)
- Two text line placeholders
- A small row for meta + button placeholder

---

## 4. Component — `src/components/announcements/AnnouncementsCarousel.tsx`

`"use client"` component.

### Props

```ts
interface Announcement {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  postedBy: string;
  role: string;
  createdAt: Date | string;
}

interface Props {
  announcements: Announcement[];
}
```

### Behaviour

| Feature | Detail |
|---|---|
| Auto-play | Advance every **5 seconds** |
| Pause | Pause auto-play on mouse hover |
| Navigation | Prev/Next chevron buttons |
| Keyboard | `ArrowLeft` / `ArrowRight` keys |
| Touch | Swipe left/right (touchstart → touchend delta > 50px) |
| Progress bar | Thin bar at card bottom, animates 0→100% in 5s, resets on slide change |
| Dot indicators | One dot per slide; active dot wider; click to jump |
| Empty state | Show a "No announcements" placeholder if array is empty |

### Card Layout (per announcement)

```
┌──────────────────────────────────┐
│  [Role Badge]        [N / Total] │  ← overlaid on image
│                                  │
│        poster imageUrl           │  h-44, object-cover
│   (fallback: icon if no image)   │
├──────────────────────────────────┤
│  Title (2-line clamp)            │
│  Description (3-line clamp)      │
│                                  │
│  👤 postedBy   📅 date  [Link →] │
└──────────────────────────────────┘
```

- **Role badge colours**: Admin → red, Warden → blue, Chief Warden → purple, Staff → amber, default → slate
- **Link button**: only render if `linkUrl` is non-null; label = `linkLabel ?? "Learn More"`; open in new tab
- **Date format**: `day Month year` (e.g. `20 Mar 2025`) using `toLocaleDateString("en-IN")`
- Use `next/image` with `fill` and `unoptimized` for imageUrl

### Slide transition

On slide change apply a brief `opacity-0 + translate-x` CSS transition (300ms) to both image and content, direction-aware (next → slide left, prev → slide right).

---

## 5. Component — `src/components/announcements/AdminAnnouncementForm.tsx`

`"use client"` form for admins/wardens to post announcements.

### Fields

| Field | Type | Required |
|---|---|---|
| Title | text input | ✓ |
| Description | textarea (3 rows) | ✓ |
| Poster Image URL | url input | optional |
| Link URL | url input | optional |
| Link Button Label | text input | optional |
| Posted By | text input | ✓ |
| Role | select: Admin / Chief Warden / Warden / Hostel Staff / Staff | ✓ |

### Behaviour
- On submit: `POST /api/announcements` with JSON body
- Show loading spinner on button while request is in-flight
- On success: clear form, show green success message (auto-dismiss after 3s)
- On error: show red error message with dismiss button

### Usage
Place in the admin panel page:

```tsx
// src/app/admin/announcements/page.tsx
import AdminAnnouncementForm from "@/components/announcements/AdminAnnouncementForm";

export default function AdminAnnouncementsPage() {
  return (
    <div className="max-w-lg mx-auto py-8">
      <AdminAnnouncementForm />
    </div>
  );
}
```

---

## 6. Summary of Files to Create / Modify

| Action | Path |
|---|---|
| **MODIFY** | `prisma/schema.prisma` — add `Announcement` model |
| **CREATE** | `src/app/api/announcements/route.ts` |
| **MODIFY** | `src/app/dashboard/layout.tsx` — add parallel slot |
| **CREATE** | `src/app/dashboard/@announcements/page.tsx` |
| **CREATE** | `src/app/dashboard/@announcements/loading.tsx` |
| **CREATE** | `src/components/announcements/AnnouncementsCarousel.tsx` |
| **CREATE** | `src/components/announcements/AdminAnnouncementForm.tsx` |

---

## Notes for Codex
- Use existing `@/lib/prisma` import for the Prisma client (adjust if path differs)
- Use existing Tailwind config — no new dependencies needed
- The `@announcements` folder name is the parallel slot name; the layout prop must match exactly: `announcements`
- Both the main dashboard (`children`) and the announcements slot (`announcements`) are fetched **in parallel** — they do not block each other
- The `loading.tsx` inside `@announcements` is automatically used by Next.js as the Suspense fallback for that slot only
