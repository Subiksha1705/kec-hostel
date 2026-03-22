# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Product Name: HostelHub (Multi-College Hostel Management System)

---

# 1. Overview

## 1.1 Purpose

Build a scalable hostel management system that supports:

* Students
* Admin (hostel staff)
* Guests (public users)

The system should allow complete control via admin dashboard, with dynamic data reflected across student and guest interfaces.

## 1.2 Vision

Create a multi-tenant platform where:

* Any college can onboard
* Each college manages its own hostel independently
* No data overlap between colleges

## 1.3 Goals

* Centralized hostel operations
* Reduce manual work (leave, complaints)
* Improve student experience
* Provide public-facing hostel info for guests

---

# 2. User Roles

## 2.1 Student

* Access personal dashboard
* Apply for leave
* Register complaints
* Submit reviews

## 2.2 Admin (Hostel Staff)

* Manage students
* Approve/reject leave
* Handle complaints
* Configure hostel data
* Manage guest-facing content

## 2.3 Guest (Public User)

* View hostel info
* View gallery
* Contact/chat support

## 2.4 Future: Super Admin

* Manage multiple colleges
* Platform-level analytics

---

# 3. Core Modules

## 3.1 Student Module

Features:

* Dashboard
* Leave Application
* Complaint Registration
* Reviews / Feedback

User Stories:

* Student can apply for leave and track status
* Student can raise complaints and view resolution
* Student can submit feedback

## 3.2 Admin Module

Student Management:

* Add / Edit / Delete students

Leave Management:

* View leave requests
* Approve / Reject
* Configure leave rules

Complaint Management:

* View complaints
* Update status (pending/resolved)

Hostel Configuration:

* Add hostel details
* Manage rooms / capacity

Gallery Management:

* Upload / delete images
* Manage guest landing page visuals

## 3.3 Guest Module

Features:

* View hostel information
* View gallery images
* Contact / chatbot
* View facilities

Key Rule:
All guest content is controlled by admin

---

# 4. Multi-Tenant Requirement

System must support multiple colleges.

Each entity must include:

* college_id

Entities:

* Students
* Admins
* Hostels
* Complaints
* Leaves
* Gallery

Behavior:

* Data must be isolated per college
* No cross-college visibility

---

# 5. Core Workflows

## 5.1 Leave Flow

1. Student applies leave
2. Request stored
3. Admin reviews
4. Admin approves/rejects
5. Status updated to student

## 5.2 Complaint Flow

1. Student submits complaint
2. Admin views complaint
3. Admin updates status
4. Student sees resolution

## 5.3 Guest Content Flow

1. Admin uploads gallery / updates info
2. Data stored in database
3. Guest page reflects updates dynamically

---

# 6. Functional Requirements

* Role-based authentication (Student/Admin)
* Student dashboard with leave and complaint tracking
* Leave application system
* Complaint management system
* Admin dashboard with CRUD operations
* Guest page with dynamic content

---

# 7. Non-Functional Requirements

* Secure authentication
* Scalable for multiple colleges
* Responsive UI (mobile + desktop)
* Fast API response
* Data isolation per college

---

# 8. Success Metrics

* Percentage of leave requests processed digitally
* Complaint resolution time
* Admin usage frequency
* Guest engagement

---

# 9. Constraints

* Must use PostgreSQL (Neon DB)
* Should support Next.js backend
* No hardcoded data
* Must be modular and extensible

---

# 10. Future Enhancements

* Super Admin panel
* Notifications (email/SMS)
* AI chatbot integration
* Analytics dashboard

---

# 11. Acceptance Criteria

* Student can apply leave and admin can approve
* Complaint lifecycle works end-to-end
* Admin can update guest page dynamically
* Multiple colleges operate without data overlap

---

# 12. Final Summary

A multi-tenant hostel management system with centralized admin control, supporting student operations and dynamic guest interaction.

---

# 13. Admin Panel (Phase 1 – Implementation Scope)

## 13.1 Authentication

* Admin login using email + password
* No admin signup (admins are pre-created via seed)
* Session handling (JWT or cookie-based – implementation choice)

---

## 13.2 Admin Dashboard (Main Sections)

### 1. Overview Dashboard

* Summary cards:

  * Total Students
  * Pending Leaves
  * Pending Complaints
  * Recent Activities

---

### 2. Leave Approval Module

* View all leave requests
* Filter by status (Pending / Approved / Rejected)
* Approve / Reject leave
* View student details

---

### 3. Student Management

* Add Student
* View Students list
* Edit / Delete Student

Data fields:

* Name
* Email
* Password
* Room Number

---

### 4. Hostel Configuration

* Add hostel details
* Update:

  * Hostel name
  * Location
  * Capacity

---

### 5. Complaint Management

* View complaints
* Update status (Pending → Resolved)
* View student info

---

### 6. Reviews Management

* View all reviews
* View ratings and comments
* (Optional Phase 2: analytics)

---

### 7. Guest Dashboard Configuration

(Admin-controlled public page)

Admin can configure:

* Hostel description
* Facilities list
* Basic content (single page for now)

---

### 8. Gallery Management

* Upload images
* Delete images
* Images reflect on guest landing page

---

### 9. Chatbot Context Configuration

* Admin can define default chatbot context
* Stored in DB
* Used later for:

  * Guest chatbot
    n  - Student assistant

Example:

* Hostel rules
* Contact info
* FAQs

---

## 13.3 Phase 1 Constraints

* No student login yet
* No guest UI yet
* Focus only on admin APIs + basic UI

---

## 13.4 Phase 1 Milestones

Milestone 1:

* Admin login working

Milestone 2:

* Add student working

Milestone 3:

* Leave + Complaint APIs ready

Milestone 4:

* Guest config + Gallery stored in DB

---

## 13.5 Future Integration (Phase 2)

* Student panel will consume:

  * Leaves
  * Complaints
  * Reviews

* Guest panel will consume:

  * Gallery
  * Hostel info
  * Chatbot context

---

## 13.6 Key Principle

Admin is the source of truth.

All data flows:
Admin → Database → Student & Guest Interfaces
