# 🏥 MediCore — Full-Stack Hospital Management System

> A production-grade, role-based Hospital Management System (HMS) built to demonstrate senior-level full-stack architecture, secure multi-tenant access control, and modern healthcare UX design.

![Status](https://img.shields.io/badge/status-in--development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Node.js%20%7C%20PostgreSQL-informational)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Complete Module List](#3-complete-module-list)
4. [Detailed Module Breakdown](#4-detailed-module-breakdown)
5. [User Roles & Access Control](#5-user-roles--access-control)
6. [Database Schema](#6-database-schema)
7. [Authentication System Design](#7-authentication-system-design)
8. [Project Structure](#8-project-structure)
9. [Implementation Roadmap](#9-implementation-roadmap)
10. [Free Tools & Resources](#10-free-tools--resources)
11. [Setup Instructions](#11-setup-instructions)

---

## 1. Project Overview

**MediCore** is a full-stack Hospital Management System that digitizes and centralizes the core operational workflows of a mid-sized hospital: patient intake, clinical documentation, appointment logistics, pharmacy dispensing, lab diagnostics, bed occupancy, billing, and inventory — all governed by a strict role-based permission model.

### Why this is a strong portfolio project

Most portfolio CRUD apps (todo lists, blogs, e-commerce clones) demonstrate basic competency. A Hospital Management System is a deliberately chosen **domain-complex** project because it forces — and lets you showcase — decisions that senior engineers are actually evaluated on:

| Signal a hiring manager looks for | How MediCore demonstrates it |
|---|---|
| Modeling complex, interrelated domains | 8+ interlinked entities (patients, encounters, prescriptions, labs, beds, invoices) with real referential integrity |
| Access control at scale | 8 distinct roles, each with different read/write/approve permissions on the *same* resources |
| Data integrity under concurrency | Bed allocation, appointment slot booking, and pharmacy stock deduction all require race-condition-safe transactions |
| Regulatory/compliance awareness | Audit logging, soft-deletes on medical records, PII handling patterns modeled after HIPAA-style principles |
| End-to-end product thinking | Distinct UX flows for a stressed nurse on a ward tablet vs. an admin doing monthly reporting vs. a patient on a phone |
| Production readiness | Migrations, seed data, environment config, containerization, CI, and a deployable live demo |

This is positioned as a **full-stack architecture and UX showcase**, not a toy app — the README itself doubles as an architecture decision record (ADR) that you can walk an interviewer through.

### Core Objectives

- Model a realistic hospital operational workflow end-to-end (registration → consultation → diagnosis → treatment → billing → discharge).
- Enforce strict, auditable role-based access control (RBAC).
- Ship a UI that is fast, accessible, and appropriate to each role's context (desk-bound admin vs. mobile bedside nurse).
- Use only free/open-source tools so the entire project — including hosting — costs $0 to build, run, and demo.
- Be deployable as a live, clickable demo linkable from a CV/LinkedIn, not just a GitHub repo.

### Target Audience for the Demo

- Recruiters/hiring managers doing a 5-minute click-through.
- Technical interviewers who will read the code and ask about trade-offs.
- Yourself, six months from now, needing a reference architecture.

---

## 2. Technology Stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend Framework** | Next.js 15 (App Router, React 19, Server Components) | Hybrid SSR/CSR, file-based routing, built-in API routes for BFF patterns, first-class Vercel deployment |
| **Styling** | Tailwind CSS v4 + `shadcn/ui` (Radix primitives) | Utility-first velocity + accessible, unstyled component primitives you fully own (no black-box UI kit) |
| **State/Data Fetching** | TanStack Query (React Query) + Zustand | Server-state caching/invalidation separated from lightweight local/UI state |
| **Forms & Validation** | React Hook Form + Zod | Type-safe schema validation shared between client and server |
| **Animation** | GSAP (+ ScrollTrigger) for orchestrated/timeline animation, Anime.js for lightweight one-off micro-interactions | GSAP handles complex, sequenced UI motion (page transitions, the ward floor-plan bed-status morph, staggered dashboard-card reveals); Anime.js covers small, cheap interactions (button/icon feedback, notification bell shake) without pulling in a heavier timeline engine for trivial cases |
| **Charts/Data Visualization** | Chart.js (via `react-chartjs-2`) as the primary charting library | Canvas-based rendering handles dense clinical/financial datasets (occupancy trends, revenue-by-department) more efficiently than SVG-based alternatives at scale, with a large plugin ecosystem for annotations and zoom |
| **Backend Framework** | Node.js + Express (or NestJS for the "senior" variant) | Express for a lean REST API you fully control; NestJS noted as an alternative if you want to show DI/module architecture patterns |
| **Database** | PostgreSQL | Relational integrity matters here (patients ↔ appointments ↔ billing ↔ inventory all have hard foreign-key relationships); free via Supabase/Neon/Railway |
| **ORM** | Prisma | Type-safe queries, migrations, and a schema file that doubles as living documentation |
| **Authentication** | Self-implemented JWT (access + refresh tokens) with `bcrypt` password hashing | Demonstrates you understand auth internals rather than outsourcing it — critical for interviews. (Clerk/Auth0 free tier noted as a drop-in alternative if you want to spend time elsewhere) |
| **Authorization** | Custom RBAC middleware + policy layer (CASL) | Fine-grained, resource-level permission checks beyond simple role strings |
| **Real-time** | Socket.IO | Live bed-status updates, lab-result-ready notifications, appointment-queue updates |
| **File Storage** | Supabase Storage / Cloudinary free tier | Lab report PDFs, prescription scans, profile photos |
| **Email/Notifications** | Resend (free tier) or Nodemailer + Ethereal for dev | Appointment confirmations, password resets |
| **Testing** | Vitest + React Testing Library (frontend), Jest + Supertest (backend), Playwright (E2E) | Unit, integration, and E2E coverage across the stack |
| **CI/CD** | GitHub Actions | Lint, type-check, test, and deploy on push |
| **Hosting — Frontend** | Vercel (free tier) | Native Next.js support, previews per PR |
| **Hosting — Backend** | Railway or Render (free tier) | Simple Node deployment with managed Postgres add-ons |
| **Hosting — Database** | Neon or Supabase (free tier Postgres) | Serverless Postgres, branching for dev/staging |
| **Monitoring** | Sentry (free tier) | Error tracking across frontend and backend |
| **API Documentation** | Swagger/OpenAPI (`swagger-jsdoc` + `swagger-ui-express`) | Interviewers can hit `/api-docs` and explore your API live |

> **Trade-off note:** Express is chosen over NestJS as the primary recommendation because it forces *you* to design the layering (routes → controllers → services → repositories) by hand, which is more visible evidence of architectural thinking in a portfolio review than inheriting NestJS's opinionated structure. If you're more confident presenting DI/decorators in an interview, NestJS is an equally valid — arguably more "enterprise" — choice.

---

## 3. Complete Module List

1. Authentication & User Management
2. Patient Management
3. Doctor / Staff Management
4. Appointment Scheduling
5. Medical Records (EHR)
6. Billing & Invoicing
7. Pharmacy Management
8. Laboratory Management
9. Ward / Bed Management
10. Inventory & Asset Management
11. Notifications & Communication
12. Reporting & Analytics
13. Audit Logging & Compliance
14. Settings & Configuration

---

## 4. Detailed Module Breakdown

Each module below follows the same template: **Core Features → Database Tables → User Roles → API Endpoints → UI/UX Considerations**.

### 4.1 Authentication & User Management

**Core Features**
- Registration (staff created by Admin; patients self-register)
- Login with email/password, JWT issuance
- Refresh-token rotation, logout (token blacklisting)
- Forgot/reset password via emailed token
- Multi-factor prompt for Admin/Doctor roles (optional TOTP)
- Account activation/deactivation

**Database Tables**
```
users (id, first_name, last_name, email, password_hash, role, phone, is_active, created_at, updated_at)
refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, created_at)
password_reset_tokens (id, user_id, token_hash, expires_at, used_at)
```

**User Roles:** All roles interact with this module (it's the entry point).

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/auth/register` | Register a patient account | Public |
| POST | `/api/auth/staff` | Create a staff account | Admin |
| POST | `/api/auth/login` | Authenticate, issue access+refresh tokens | Public |
| POST | `/api/auth/refresh` | Rotate access token | Authenticated (refresh cookie) |
| POST | `/api/auth/logout` | Revoke refresh token | Authenticated |
| POST | `/api/auth/forgot-password` | Send reset email | Public |
| POST | `/api/auth/reset-password` | Consume token, set new password | Public |
| GET | `/api/auth/me` | Return current user profile + role | Authenticated |

**UI/UX Considerations**
- **Wireframe:** Split-screen login — left panel branding/illustration, right panel a minimal single-column form (email, password, "Forgot password?" link, primary CTA button full-width).
- **Workflow:** On login, redirect based on role (`Admin → /dashboard`, `Doctor → /doctor/queue`, `Patient → /portal`) — role-aware routing is itself a UX decision worth calling out in an interview.
- **Accessibility:** Labelled inputs (not placeholder-only), visible focus rings, `aria-live="polite"` region for inline error messages, minimum 4.5:1 contrast ratio, password visibility toggle with `aria-pressed`.
- **Interaction pattern:** Optimistic disable-on-submit for the login button with a spinner, inline field-level validation on blur (not on every keystroke, to avoid error-flicker while typing).

---

### 4.2 Patient Management

**Core Features**
- Patient registration (walk-in via Receptionist, or self-service portal)
- Demographic + insurance/emergency-contact profile
- Patient search (name, phone, MRN — medical record number)
- Patient timeline: unified view of appointments, visits, prescriptions, lab results, invoices
- Merge duplicate patient records (Admin-only utility)

**Database Tables**
```
patients (id, user_id [nullable, for portal login], mrn, first_name, last_name, dob, gender,
          blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone,
          insurance_provider, insurance_policy_no, created_at, updated_at, deleted_at)
patient_allergies (id, patient_id, allergen, severity, notes)
patient_documents (id, patient_id, uploaded_by, file_url, doc_type, created_at)
```

**User Roles:** Receptionist (create/edit), Doctor/Nurse (read + clinical annotate), Billing Officer (read for invoicing), Admin (full), Patient (read/edit own profile only).

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/patients` | Paginated, searchable list | Receptionist, Doctor, Nurse, Admin |
| POST | `/api/patients` | Register new patient | Receptionist, Admin |
| GET | `/api/patients/:id` | Full profile + timeline | Role-scoped |
| PATCH | `/api/patients/:id` | Update demographics | Receptionist, Admin, Patient (self) |
| DELETE | `/api/patients/:id` | Soft-delete | Admin |
| GET | `/api/patients/:id/timeline` | Aggregated visit history | Doctor, Nurse, Admin, Patient (self) |
| POST | `/api/patients/:id/documents` | Upload scanned document | Receptionist, Doctor, Admin |

**UI/UX Considerations**
- **Wireframe:** A patient list as a dense, sortable data table on desktop (Admin/Receptionist view) that **collapses to stacked cards** on tablet/mobile (Nurse ward-round view) — same data, responsive re-composition rather than a squeezed table.
- **Workflow:** Registration is a **progressive multi-step form** (Demographics → Contact/Emergency → Insurance → Review) rather than one long form, with a persistent step-progress indicator, since front-desk staff are frequently interrupted mid-entry and need to resume.
- **Accessibility:** MRN auto-copy button with `aria-label="Copy medical record number"`; date-of-birth entry supports both a native `<input type="date">` and a manual-typed fallback for the many older patients whose caregivers fill this in.
- **Interaction pattern:** Live search-as-you-type with debounce (300ms) and skeleton loading rows, not a full-page spinner, to keep the receptionist's context stable during a busy queue.

---

### 4.3 Doctor / Staff Management

**Core Features**
- Staff directory with specialization, department, shift schedule
- Doctor availability calendar (defines bookable slots for Appointment module)
- Leave/time-off requests and approval
- Performance/attendance overview (Admin)

**Database Tables**
```
staff (id, user_id, employee_code, department_id, designation, specialization,
       date_joined, shift_pattern, is_active)
departments (id, name, description)
staff_availability (id, staff_id, day_of_week, start_time, end_time, slot_duration_minutes)
staff_leave_requests (id, staff_id, start_date, end_date, reason, status, approved_by)
```

**User Roles:** Admin (full CRUD), Doctor/Nurse/Pharmacist/Lab Tech (read own profile, manage own availability/leave requests), Receptionist (read-only directory for scheduling).

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/staff` | List/filter staff by department/specialization | Admin, Receptionist |
| POST | `/api/staff` | Onboard new staff member | Admin |
| GET | `/api/staff/:id/availability` | Get bookable slots | Receptionist, Patient (booking flow) |
| PUT | `/api/staff/:id/availability` | Set weekly availability | Staff (self), Admin |
| POST | `/api/staff/:id/leave-requests` | Request leave | Staff (self) |
| PATCH | `/api/staff/leave-requests/:id` | Approve/reject | Admin |

**UI/UX Considerations**
- **Wireframe:** Department directory as a filterable grid of staff cards (photo, name, specialization, "Available today" badge) — visual scanning matters more than tabular density here since receptionists are pattern-matching on availability, not reading exact data.
- **Workflow:** Availability-setting uses a **weekly grid picker** (click-drag to paint available blocks across a 7×24 grid) rather than repeated dropdown forms — directly demonstrates non-trivial interaction design in a portfolio review.
- **Accessibility:** The drag-to-paint grid has a full keyboard-operable fallback (arrow keys + spacebar to toggle a cell, announced via `aria-pressed`).
- **Interaction pattern:** Leave-request approvals surface as a badge-counted inbox item for Admin, not buried in a settings page — reduces the "action hidden in menu" anti-pattern.

---

### 4.4 Appointment Scheduling

**Core Features**
- Slot-based booking against doctor availability (no double-booking, transactional lock)
- Walk-in vs. scheduled visit distinction
- Rescheduling / cancellation with reason capture
- Waitlist when a preferred slot is full
- Automated reminders (email/SMS-style notification)
- Queue/token display for the day (who's next)

**Database Tables**
```
appointments (id, patient_id, doctor_id, department_id, scheduled_at, duration_minutes,
              status [scheduled|checked_in|in_progress|completed|cancelled|no_show],
              reason_for_visit, created_by, created_at, updated_at)
appointment_waitlist (id, patient_id, doctor_id, preferred_date, notified_at)
```

**User Roles:** Receptionist (book/reschedule for any patient), Doctor (view own queue, mark complete), Patient (self-book/cancel via portal), Nurse (check-in), Admin (full oversight).

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/appointments` | List, filterable by date/doctor/status | Role-scoped |
| POST | `/api/appointments` | Book new appointment (transactional slot-lock) | Receptionist, Patient |
| PATCH | `/api/appointments/:id/reschedule` | Move to new slot | Receptionist, Patient |
| PATCH | `/api/appointments/:id/cancel` | Cancel with reason | Receptionist, Patient, Doctor |
| PATCH | `/api/appointments/:id/check-in` | Mark patient arrived | Nurse, Receptionist |
| PATCH | `/api/appointments/:id/complete` | Close out visit | Doctor |
| GET | `/api/appointments/queue/:doctorId` | Today's live queue | Doctor, Nurse |

**UI/UX Considerations**
- **Wireframe:** Booking flow presented as a **calendar + time-slot grid** (à la Calendly): pick a date on a month view, available times render as tappable chips, unavailable slots are visually muted (not hidden — hidden slots make patients think the doctor doesn't work that day).
- **Workflow:** Doctor's "Today's Queue" is a single-column, large-touch-target list (works on a bedside tablet), auto-refreshing via Socket.IO as check-ins happen — no manual refresh button needed.
- **Accessibility:** Calendar grid is fully keyboard-navigable (arrow keys move focus between days, Enter selects), status changes announced via a live region so screen-reader users get real-time queue updates.
- **Interaction pattern:** Double-booking is prevented **optimistically in the UI** (slot disappears the instant it's selected, pending confirmation) **and enforced pessimistically in the DB** via a unique constraint + row-level lock — a good talking point on optimistic UI vs. backend integrity. Month-to-month calendar navigation uses a lightweight GSAP slide transition (direction-aware — next month slides left, previous slides right) so the date grid change reads as spatial movement rather than an abrupt content swap.

---

### 4.5 Medical Records (EHR)

**Core Features**
- Consultation notes (SOAP format: Subjective, Objective, Assessment, Plan)
- Diagnosis coding (ICD-10 style free-text + code)
- Prescription creation (linked to Pharmacy module)
- Vitals capture (BP, temp, pulse, weight, height, BMI auto-calc)
- Attachments (scans, referral letters)
- Immutable history — edits create a new version, never overwrite (audit-safe)

**Database Tables**
```
encounters (id, patient_id, doctor_id, appointment_id, encounter_date, chief_complaint,
            subjective, objective, assessment, plan, status, created_at)
diagnoses (id, encounter_id, icd_code, description)
vitals (id, encounter_id, recorded_by, bp_systolic, bp_diastolic, temperature_c,
        pulse_bpm, weight_kg, height_cm, recorded_at)
prescriptions (id, encounter_id, patient_id, doctor_id, status, created_at)
prescription_items (id, prescription_id, medicine_id, dosage, frequency, duration_days, notes)
```

**User Roles:** Doctor (full write on own encounters), Nurse (vitals entry), Patient (read own records), Lab Tech (read relevant diagnostic orders), Admin (read-only oversight + compliance export).

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/encounters` | Start new consultation record | Doctor |
| PATCH | `/api/encounters/:id` | Update SOAP notes (versioned) | Doctor (own) |
| POST | `/api/encounters/:id/vitals` | Record vitals | Nurse, Doctor |
| POST | `/api/encounters/:id/prescriptions` | Issue prescription | Doctor |
| GET | `/api/patients/:id/records` | Full clinical history | Doctor, Patient (self), Admin |
| GET | `/api/encounters/:id/export` | PDF export of visit summary | Doctor, Patient (self) |

**UI/UX Considerations**
- **Wireframe:** Consultation screen is a **three-pane layout** — left: patient snapshot (allergies, active meds, last vitals, sticky while scrolling); center: SOAP note editor; right: quick-action panel (order lab, write prescription, schedule follow-up). This mirrors how doctors actually think during a visit: context, documentation, action, all visible at once.
- **Workflow:** Prescription-writing uses a **type-ahead medicine search** pulling from the Pharmacy inventory (so you can't prescribe something out of stock without an explicit override + warning banner) — a nice cross-module integration to highlight.
- **Accessibility:** SOAP sections use proper `<fieldset>`/`<legend>` grouping; critical allergy alerts render as a persistent, high-contrast, non-dismissible-until-acknowledged banner (`role="alert"`) — patient-safety-critical UI shouldn't be easy to accidentally dismiss.
- **Interaction pattern:** Autosave every 15 seconds with a subtle "Saved" timestamp indicator (like Google Docs) rather than a manual save button — consultation notes must never be lost mid-visit.

---

### 4.6 Billing & Invoicing

**Core Features**
- Auto-generate line items from consultations, lab orders, pharmacy dispenses, bed charges
- Manual line-item addition (miscellaneous charges)
- Multiple payment methods (cash, card, insurance claim)
- Partial payments / payment plans
- Invoice PDF generation
- Insurance claim status tracking

**Database Tables**
```
invoices (id, patient_id, encounter_id, status [draft|issued|partially_paid|paid|void],
          subtotal, tax, discount, total, issued_at, due_at)
invoice_items (id, invoice_id, source_type [consultation|lab|pharmacy|bed|other],
               source_id, description, quantity, unit_price, line_total)
payments (id, invoice_id, method, amount, transaction_ref, paid_at, recorded_by)
insurance_claims (id, invoice_id, provider, policy_no, claimed_amount, status, submitted_at)
```

**User Roles:** Billing Officer (full CRUD on invoices/payments), Receptionist (view + collect payment at desk), Patient (view own invoices, pay online), Admin (financial reporting oversight).

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/invoices` | List, filter by status/patient/date | Billing Officer, Admin |
| POST | `/api/invoices` | Generate invoice from an encounter | Billing Officer (system-assisted) |
| POST | `/api/invoices/:id/items` | Add manual charge | Billing Officer |
| POST | `/api/invoices/:id/payments` | Record a payment | Billing Officer, Receptionist |
| GET | `/api/invoices/:id/pdf` | Download invoice PDF | Billing Officer, Patient (self) |
| POST | `/api/invoices/:id/claims` | Submit insurance claim | Billing Officer |

**UI/UX Considerations**
- **Wireframe:** Invoice-builder as a running **receipt-style right-hand panel** that updates live as line items are added from the left-hand "add charge" catalog — the mental model of a physical checkout register, familiar to non-technical billing staff.
- **Workflow:** Payment recording is a **modal, not a page navigation** — billing staff process dozens of payments per shift and shouldn't lose list context each time.
- **Accessibility:** All monetary values use consistent, localized currency formatting with `aria-label` including the full amount in words for screen readers on critical confirmation dialogs (e.g., "Confirm payment of one hundred twenty dollars").
- **Interaction pattern:** Destructive actions (voiding an invoice) require a confirmation dialog with the reason typed in, not just an "Are you sure?" click — financial actions need an audit trail, and the UI should make capturing that trail effortless rather than an afterthought.

---

### 4.7 Pharmacy Management

**Core Features**
- Medicine catalog (name, form, strength, manufacturer, batch, expiry)
- Stock-in (purchase orders received) / stock-out (dispensed against prescriptions)
- Prescription fulfillment queue for pharmacists
- Low-stock and near-expiry alerts
- Batch/lot tracking for recalls

**Database Tables**
```
medicines (id, name, generic_name, form, strength, manufacturer, reorder_threshold)
medicine_batches (id, medicine_id, batch_no, quantity_in_stock, unit_cost, expiry_date, received_at)
dispenses (id, prescription_item_id, batch_id, quantity_dispensed, dispensed_by, dispensed_at)
purchase_orders (id, supplier_id, status, ordered_at, received_at)
purchase_order_items (id, purchase_order_id, medicine_id, quantity, unit_cost)
suppliers (id, name, contact_person, phone, email)
```

**User Roles:** Pharmacist (fulfill prescriptions, manage stock), Admin (supplier/purchase-order oversight), Doctor (read-only stock visibility while prescribing).

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/pharmacy/medicines` | Catalog with current stock levels | Pharmacist, Doctor |
| GET | `/api/pharmacy/queue` | Pending prescriptions to fulfill | Pharmacist |
| POST | `/api/pharmacy/dispense/:prescriptionItemId` | Dispense against a batch (FIFO by expiry) | Pharmacist |
| POST | `/api/pharmacy/purchase-orders` | Create PO to supplier | Pharmacist, Admin |
| POST | `/api/pharmacy/purchase-orders/:id/receive` | Receive stock, create new batch | Pharmacist |
| GET | `/api/pharmacy/alerts` | Low-stock / near-expiry list | Pharmacist, Admin |

**UI/UX Considerations**
- **Wireframe:** Fulfillment queue is a **kanban-style board** (Pending → Preparing → Ready for Pickup) rather than a flat list — mirrors physical pharmacy workflow and lets pharmacists visually track WIP.
- **Workflow:** Dispensing auto-suggests the batch with the **soonest expiry date first** (FEFO — first-expire-first-out), shown transparently in the UI so the pharmacist can override with a reason if needed.
- **Accessibility:** Expiry-risk is never communicated by color alone — a red badge also carries the text "Expires in 12 days" for colorblind users.
- **Interaction pattern:** Barcode-style batch lookup (manual code entry field, later extensible to real barcode scanner hardware input) speeds up stock-receiving without redesigning the form for actual scanner support later.

---

### 4.8 Laboratory Management

**Core Features**
- Lab test catalog (CBC, lipid panel, imaging, etc.) with pricing
- Test ordering from a consultation
- Sample collection tracking (barcode/label)
- Result entry (structured values + reference ranges, or PDF/image upload for imaging)
- Result approval workflow (Lab Tech enters → Pathologist/senior confirms, optional)
- Critical-value flagging and doctor notification

**Database Tables**
```
lab_tests_catalog (id, name, category, price, sample_type, turnaround_hours)
lab_orders (id, encounter_id, patient_id, ordered_by, status [ordered|collected|in_progress|completed|cancelled])
lab_order_items (id, lab_order_id, test_id, status)
lab_results (id, lab_order_item_id, result_value, unit, reference_range, is_critical,
             entered_by, verified_by, result_file_url, resulted_at)
```

**User Roles:** Lab Technician (collect, enter results), Doctor (order tests, view results), Patient (view own results once released), Admin (catalog/pricing management).

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| POST | `/api/lab/orders` | Order test(s) from a consultation | Doctor |
| GET | `/api/lab/orders/queue` | Pending collection/processing queue | Lab Technician |
| PATCH | `/api/lab/orders/:id/collect` | Mark sample collected | Lab Technician |
| POST | `/api/lab/results/:itemId` | Enter result | Lab Technician |
| PATCH | `/api/lab/results/:id/verify` | Senior sign-off | Admin/Senior Lab Tech |
| GET | `/api/patients/:id/lab-results` | Patient's result history | Doctor, Patient (self) |

**UI/UX Considerations**
- **Wireframe:** Result-entry form auto-renders **inline reference ranges** next to each input field with a live "Normal / High / Low" indicator as the technician types — reduces transcription errors, the single biggest real-world lab risk.
- **Workflow:** A critical value (e.g., dangerously high potassium) triggers an **immediate, non-dismissible modal + real-time push notification** to the ordering doctor via Socket.IO — a genuinely important patient-safety UX pattern worth explaining in an interview.
- **Accessibility:** Reference-range status is conveyed with icon + text + color (never color alone); all result tables have proper `<th scope="col">` headers for screen-reader table navigation.
- **Interaction pattern:** Imaging results support drag-and-drop file upload with inline PDF/image preview before submission, avoiding a blind "upload and hope" experience.

---

### 4.9 Ward / Bed Management

**Core Features**
- Ward/room/bed hierarchy with real-time occupancy status
- Admission and discharge workflow
- Bed transfer (ward-to-ward)
- Daily bed-charge accrual (feeds Billing module)
- Visual floor-plan / occupancy board

**Database Tables**
```
wards (id, name, department_id, floor)
beds (id, ward_id, bed_number, bed_type, daily_rate, status [available|occupied|maintenance])
admissions (id, patient_id, bed_id, admitted_by, admitted_at, expected_discharge_at,
            discharged_at, discharge_summary)
bed_transfers (id, admission_id, from_bed_id, to_bed_id, transferred_at, reason)
```

**User Roles:** Nurse (update bed status, log transfers), Doctor (admit/discharge decisions), Admin (ward configuration, occupancy reporting), Billing Officer (read-only, for charge accrual).

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/wards/occupancy` | Real-time occupancy grid | Nurse, Doctor, Admin |
| POST | `/api/admissions` | Admit patient to a bed | Doctor, Nurse |
| PATCH | `/api/admissions/:id/transfer` | Move to another bed | Nurse |
| PATCH | `/api/admissions/:id/discharge` | Discharge with summary | Doctor |
| GET | `/api/wards/:id/beds` | Beds within a ward + status | Nurse, Doctor, Admin |

**UI/UX Considerations**
- **Wireframe:** A **visual floor-plan grid** (beds as color-coded tiles: green=available, red=occupied, gray=maintenance) rather than a text table — nurses scan this at a glance during handovers, and it's a strong visual centerpiece for a portfolio screenshot.
- **Workflow:** Discharge is a **guided checklist modal** (outstanding invoice? pending lab results? medication reconciliation done?) that must be explicitly acknowledged before the bed is freed — prevents premature discharge of an unbilled or incomplete case.
- **Accessibility:** The floor-plan grid has an equivalent accessible **list view toggle** for screen-reader users, since a purely visual grid of colored tiles is not natively accessible.
- **Interaction pattern:** Real-time updates via Socket.IO mean the occupancy board updates for all connected nurses instantly when any one of them admits/discharges a patient — no polling, no stale data. Bed-status changes (available → occupied) are animated with a short GSAP color-morph and tile-flip (~300ms) rather than an instant swap, so a status change happening from another nurse's action is actually noticed at a glance instead of silently appearing.

---

### 4.10 Inventory & Asset Management

**Core Features**
- Non-pharmacy inventory: medical equipment, consumables (gloves, syringes), linens
- Stock-level tracking per department
- Equipment maintenance scheduling and status
- Reorder alerts

**Database Tables**
```
inventory_items (id, name, category, department_id, unit, reorder_threshold, current_stock)
inventory_transactions (id, item_id, type [in|out|adjustment], quantity, reason, performed_by, created_at)
equipment (id, name, department_id, serial_no, status [operational|maintenance|retired], last_serviced_at, next_service_due)
```

**User Roles:** Admin (full CRUD, cross-department oversight), Nurse (log consumable usage per ward), Lab Technician (lab equipment maintenance logging).

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/inventory` | List items, filter by department | Admin, department staff |
| POST | `/api/inventory/transactions` | Log stock in/out | Admin, Nurse |
| GET | `/api/inventory/alerts` | Below-threshold items | Admin |
| GET | `/api/equipment` | Equipment registry + status | Admin, department staff |
| PATCH | `/api/equipment/:id/service` | Log a maintenance event | Admin |

**UI/UX Considerations**
- **Wireframe:** Department-scoped inventory dashboards (a nurse on Ward 3 sees only Ward 3's consumables by default, with an explicit "View all departments" toggle for Admin) — scoping the default view to relevant context reduces cognitive load.
- **Workflow:** Stock adjustments require a **reason code dropdown** (damaged, expired, used, miscount) rather than free text alone, making later reporting/analytics actually usable.
- **Accessibility:** Reorder-alert badges use both numeric counts and text ("3 items low"), not bare color dots.
- **Interaction pattern:** Bulk stock-count reconciliation view (spreadsheet-like inline-editable table) for periodic physical audits, since typing one-by-one forms for 200 items is a real usability failure.

---

### 4.11 Notifications & Communication

**Core Features**
- In-app notification center (bell icon, unread count)
- Email notifications for appointment confirmations, password resets, critical lab results
- Internal staff messaging (optional stretch feature)
- Configurable notification preferences per role

**Database Tables**
```
notifications (id, user_id, type, title, body, is_read, link, created_at)
notification_preferences (id, user_id, channel [in_app|email], category, is_enabled)
```

**User Roles:** All roles (recipients), Admin (system-wide broadcast capability).

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/notifications` | User's notifications, paginated | All authenticated |
| PATCH | `/api/notifications/:id/read` | Mark as read | Owner |
| POST | `/api/notifications/broadcast` | Send system-wide announcement | Admin |
| PUT | `/api/notifications/preferences` | Update opt-in/out settings | Owner |

**UI/UX Considerations**
- **Wireframe:** Standard bell-icon dropdown with grouped-by-day notifications, unread items visually distinguished by a left-border accent (not just bold text, which is easy to miss).
- **Workflow:** Critical clinical notifications (e.g., critical lab value) bypass the passive bell icon entirely and use an interrupting toast + sound cue, distinct from routine notifications like "appointment reminder."
- **Accessibility:** New notifications are announced via `aria-live="polite"` for the bell counter; critical alerts use `aria-live="assertive"`.
- **Interaction pattern:** "Mark all as read" plus per-item swipe-to-dismiss on mobile/tablet views. New arrivals trigger a small Anime.js bell-shake + unread-count pop (~200ms, single keyframe) rather than a static badge change — cheap enough to run on every arrival without competing for attention with the toast itself.

---

### 4.12 Reporting & Analytics

**Core Features**
- Operational dashboards: daily patient volume, appointment no-show rate, average wait time
- Financial dashboards: revenue by department, outstanding invoices, insurance claim status
- Clinical dashboards: common diagnoses, prescription volume, bed occupancy trends
- Exportable reports (CSV/PDF)
- Custom date-range filtering

**Database Tables**
> Primarily read-model/aggregation queries over existing tables; optionally a materialized view layer:
```
report_snapshots (id, report_type, params_json, generated_by, generated_at, file_url)
```

**User Roles:** Admin (full access to all dashboards), Doctor (own clinical stats), Billing Officer (financial dashboards), department heads (department-scoped views).

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/reports/operational` | KPIs: volume, wait time, no-show rate | Admin |
| GET | `/api/reports/financial` | Revenue, outstanding, claims | Billing Officer, Admin |
| GET | `/api/reports/clinical` | Diagnoses, prescriptions, occupancy | Doctor, Admin |
| POST | `/api/reports/export` | Generate CSV/PDF export | Admin, Billing Officer |

**UI/UX Considerations**
- **Wireframe:** Dashboard as a **responsive card grid** of KPI tiles at the top (big numbers, trend arrows) with detailed charts below — the classic "glanceable summary, drill-down detail" pattern.
- **Workflow:** Every chart has a **consistent global date-range filter** in a sticky header rather than per-chart filters, so comparing metrics across the same period doesn't require re-configuring each widget.
- **Accessibility:** All charts (built with Chart.js) include a "View as table" toggle and expose an `aria-label` summarizing the chart's key takeaway (e.g., "Bar chart: revenue by department, Cardiology highest at $42,000") — canvas-rendered charts are otherwise invisible to screen readers, so this text alternative isn't optional.
- **Interaction pattern:** Loading states use skeleton chart placeholders (matching the shape of the eventual chart) rather than a generic spinner, reducing layout shift. KPI tiles count up from 0 to their final value on load using Anime.js (short, ~600ms ease-out) for a polished first-paint moment without becoming distracting on re-render.

---

### 4.13 Audit Logging & Compliance

**Core Features**
- Immutable log of sensitive actions (record views, edits, deletions, permission changes, exports)
- Filterable audit trail viewer for Admin
- Automatic logging middleware (not manually called per-route, to guarantee coverage)

**Database Tables**
```
audit_logs (id, user_id, action, resource_type, resource_id, before_json, after_json,
            ip_address, user_agent, created_at)
```

**User Roles:** Admin only (view); system writes to this table automatically for all roles.

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/audit-logs` | Filterable log viewer | Admin |
| GET | `/api/audit-logs/:resourceType/:resourceId` | History for a specific record | Admin |

**UI/UX Considerations**
- **Wireframe:** A dense, monospace-leaning log table (timestamp, actor, action, resource) with expandable rows revealing the before/after JSON diff — modeled on developer-facing tools like GitHub's audit log, since Admins reviewing this are power users, not casual ones.
- **Workflow:** Filters persist in the URL query string so an Admin can bookmark/share a specific audit view ("show me all deletions by user X in March").
- **Accessibility:** JSON diffs are rendered with both color-coding (added/removed) and explicit +/- prefixes, so the diff is legible without color.

---

### 4.14 Settings & Configuration

**Core Features**
- Hospital profile (name, logo, address, branding for invoices/PDFs)
- Department and role management
- Tax/billing configuration (tax rates, currency)
- Notification templates
- System-wide feature toggles

**Database Tables**
```
hospital_settings (id, key, value_json, updated_by, updated_at)
```

**User Roles:** Admin only.

**API Endpoints**
| Method | Endpoint | Description | Access |
|---|---|---|---|
| GET | `/api/settings` | Fetch all settings | Admin |
| PUT | `/api/settings/:key` | Update a setting | Admin |

**UI/UX Considerations**
- **Wireframe:** Tabbed settings page (General / Departments / Billing / Notifications / Users) — a familiar, low-risk pattern for infrequently visited configuration screens.
- **Workflow:** Destructive/high-impact settings (e.g., changing tax rate retroactively) show a confirmation summarizing the downstream impact before saving.
- **Accessibility:** Tabs are implemented with proper ARIA tab-panel roles (`role="tablist"`, `role="tab"`, `aria-selected`) and full keyboard arrow-key navigation between tabs.

---

## 5. User Roles & Access Control

| Role | Primary Purpose | Key Modules | Notable Restrictions |
|---|---|---|---|
| **Admin** | System owner, cross-department oversight | All modules (full access) | Cannot edit clinical notes authored by a doctor (view-only, to preserve clinical authorship integrity) |
| **Doctor** | Clinical care delivery | Medical Records, Appointments, Lab (order/view), Pharmacy (prescribe), Ward (admit/discharge) | Can only edit their own encounters/prescriptions; read-only on billing |
| **Nurse** | Bedside/ward operations | Ward/Bed, Vitals (within Medical Records), Appointments (check-in), Inventory (consumables) | Cannot write diagnoses or prescriptions; cannot access billing or financial reports |
| **Receptionist** | Front-desk operations | Patient registration, Appointment Scheduling, basic Billing (payment collection) | Cannot view clinical notes, lab results, or prescriptions in detail |
| **Pharmacist** | Medication dispensing & stock | Pharmacy Management (full) | Read-only on patient demographics; no access to consultation notes beyond the prescription itself |
| **Lab Technician** | Diagnostic testing | Laboratory Management (full) | No access to billing, pharmacy, or unrelated clinical notes |
| **Billing Officer** | Financial operations | Billing & Invoicing (full), Reporting (financial) | No access to clinical notes, lab results, or prescriptions (only line-item descriptions needed for invoicing) |
| **Patient** | Self-service portal | Own profile, own appointments (book/cancel), own medical records (read-only), own invoices, own lab results | Strictly scoped to own `patient_id` — enforced at the query layer, not just UI-hidden |

### RBAC Enforcement Model

Access control is enforced at **three layers**, not just the UI:

1. **Route-level middleware** — `requireRole(['Admin', 'Doctor'])` blocks unauthorized roles before a controller even runs.
2. **Resource-ownership checks** — e.g., a Doctor can `PATCH /encounters/:id` only if `encounter.doctor_id === req.user.staffId`; a Patient can `GET /patients/:id` only if `patient.user_id === req.user.id`.
3. **Field-level filtering** — some endpoints return different payload shapes per role (e.g., a Receptionist's patient response omits `diagnoses` and `prescriptions` fields entirely, rather than the frontend simply choosing not to render fields it *did* receive).

```js
// Example: resource-ownership middleware
function requireOwnerOrRole(resourceLoader, allowedRoles = []) {
  return async (req, res, next) => {
    if (allowedRoles.includes(req.user.role)) return next();
    const resource = await resourceLoader(req.params.id);
    if (!resource) return res.status(404).json({ error: 'Not found' });
    if (resource.ownerId === req.user.id) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}
```

---

## 6. Database Schema

### High-Level Entity Relationship Overview

```
users ──1:1── patients
users ──1:1── staff ──N:1── departments

patients ──1:N── appointments ──N:1── staff (doctor)
patients ──1:N── encounters ──N:1── staff (doctor)
                     │
                     ├──1:N── diagnoses
                     ├──1:N── vitals
                     ├──1:N── prescriptions ──1:N── prescription_items ──N:1── medicines
                     └──1:N── lab_orders ──1:N── lab_order_items ──1:1── lab_results

patients ──1:N── admissions ──N:1── beds ──N:1── wards ──N:1── departments

patients ──1:N── invoices ──1:N── invoice_items
invoices ──1:N── payments
invoices ──1:N── insurance_claims

medicines ──1:N── medicine_batches ──1:N── dispenses
suppliers ──1:N── purchase_orders ──1:N── purchase_order_items

users ──1:N── notifications
users ──1:N── audit_logs (as actor)
```

### Design Notes

- **Soft deletes** (`deleted_at`) are used on `patients`, `encounters`, and `invoices` — medical and financial records should never be hard-deleted for compliance/audit reasons.
- **Encounters are append-only/versioned** at the application layer: a `PATCH` to an encounter's notes creates a new row in an `encounter_revisions` table rather than overwriting, preserving a legal record of what was documented and when.
- **Money is stored as integer cents** (`total_cents`), never floating point, to avoid rounding errors in financial calculations.
- **Timestamps are stored in UTC**; the frontend converts to the hospital's configured local timezone for display.
- Composite indexes on frequently filtered columns: `appointments(doctor_id, scheduled_at)`, `invoices(patient_id, status)`, `medicine_batches(medicine_id, expiry_date)`.

### Sample Prisma Schema Excerpt

```prisma
model Patient {
  id                    String    @id @default(uuid())
  userId                String?   @unique
  mrn                   String    @unique
  firstName             String
  lastName              String
  dob                   DateTime
  gender                Gender
  phone                 String
  email                 String?
  bloodGroup            String?
  insuranceProvider     String?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  deletedAt             DateTime?

  appointments          Appointment[]
  encounters            Encounter[]
  admissions            Admission[]
  invoices              Invoice[]

  @@index([lastName, firstName])
}

model Appointment {
  id             String            @id @default(uuid())
  patientId      String
  doctorId       String
  scheduledAt    DateTime
  durationMin    Int               @default(15)
  status         AppointmentStatus @default(SCHEDULED)
  reasonForVisit String?

  patient        Patient           @relation(fields: [patientId], references: [id])
  doctor         Staff             @relation(fields: [doctorId], references: [id])

  @@index([doctorId, scheduledAt])
}

enum AppointmentStatus {
  SCHEDULED
  CHECKED_IN
  IN_PROGRESS
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

---

## 7. Authentication System Design

### Login / Registration Flow

1. **Patient self-registration:** `POST /api/auth/register` → creates a `users` row (`role = 'patient'`) and a linked `patients` row → password hashed with `bcrypt` (cost factor 12) → welcome email sent.
2. **Staff onboarding:** Only an Admin can create staff accounts (`POST /api/auth/staff`) — staff cannot self-register, closing an obvious privilege-escalation hole.
3. **Login:** `POST /api/auth/login` validates credentials → issues a short-lived **access token** (JWT, 15 min expiry, contains `userId`, `role`, `staffId`/`patientId`) and a long-lived **refresh token** (7 days, stored as an httpOnly, secure, `SameSite=strict` cookie, hashed before storing in `refresh_tokens`).
4. **Silent refresh:** Frontend uses TanStack Query's retry/interceptor pattern — on a 401, it calls `/api/auth/refresh` once, retries the original request, and only redirects to login if refresh also fails.
5. **Logout:** Revokes the refresh token server-side (sets `revoked_at`) and clears the cookie — access tokens simply expire naturally within 15 minutes.

### RBAC Implementation

- JWT payload includes `role` and `permissions` (a denormalized snapshot at issuance time, refreshed on next login) so most authorization checks don't require a DB round-trip.
- A policy layer built with **CASL** defines abilities declaratively:

```js
function defineAbilitiesFor(user) {
  const { can, build } = new AbilityBuilder(createMongoAbility);

  if (user.role === 'Doctor') {
    can('read', 'Patient');
    can('manage', 'Encounter', { doctorId: user.staffId });
    can('create', 'Prescription');
  }
  if (user.role === 'Patient') {
    can('read', ['Appointment', 'Invoice', 'LabResult'], { patientId: user.patientId });
    can('create', 'Appointment');
  }
  // ...additional roles

  return build();
}
```

- This lets both backend middleware **and** the frontend (e.g., conditionally rendering a "Delete" button) share the exact same rule definitions, avoiding UI/API permission drift.

### Password Security

- `bcrypt` with cost factor 12; passwords never logged or returned in any API response.
- Password policy enforced via Zod schema: minimum 10 characters, at least one number and one symbol.
- Rate-limiting on `/api/auth/login` (`express-rate-limit`, 5 attempts per 15 minutes per IP+email pair) to mitigate brute force.
- Reset tokens are single-use, hashed at rest, and expire after 30 minutes.

### Session Management

- Stateless access tokens (JWT) — no server-side session store needed for authorization checks.
- Refresh tokens are stateful (DB-backed) specifically so they **can** be revoked (logout-all-devices, admin-forced deactivation).
- Optional device/session list view for users ("You're logged in on 2 devices") backed by the `refresh_tokens` table.

---

## 8. Project Structure

```
medicore/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── admin/
│   │   │   │   ├── doctor/
│   │   │   │   ├── nurse/
│   │   │   │   ├── receptionist/
│   │   │   │   ├── pharmacy/
│   │   │   │   ├── lab/
│   │   │   │   ├── billing/
│   │   │   │   └── layout.tsx        # Role-aware shell (sidebar per role)
│   │   │   ├── portal/               # Patient-facing self-service portal
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui primitives
│   │   │   ├── patients/
│   │   │   ├── appointments/
│   │   │   ├── billing/
│   │   │   └── shared/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api-client.ts         # Typed fetch wrapper
│   │   │   ├── abilities.ts          # CASL frontend rules
│   │   │   └── validators/           # Shared Zod schemas
│   │   └── styles/
│   │
│   └── api/                          # Express backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.routes.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   └── auth.validators.ts
│       │   │   ├── patients/
│       │   │   ├── appointments/
│       │   │   ├── encounters/
│       │   │   ├── pharmacy/
│       │   │   ├── lab/
│       │   │   ├── billing/
│       │   │   ├── wards/
│       │   │   └── inventory/
│       │   ├── middleware/
│       │   │   ├── authenticate.ts
│       │   │   ├── authorize.ts
│       │   │   ├── auditLog.ts
│       │   │   └── errorHandler.ts
│       │   ├── config/
│       │   ├── lib/
│       │   │   ├── prisma.ts
│       │   │   ├── jwt.ts
│       │   │   └── socket.ts
│       │   └── app.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── tests/
│           ├── unit/
│           └── integration/
│
├── packages/
│   ├── shared-types/                 # Shared TS types/interfaces (DTOs)
│   └── shared-validators/            # Zod schemas used by both web + api
│
├── e2e/                               # Playwright end-to-end tests
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docker-compose.yml                 # Local Postgres + services
├── .env.example
├── turbo.json                         # Monorepo task orchestration (Turborepo)
└── README.md
```

**Architectural rationale:**
- **Monorepo (Turborepo)** keeps frontend, backend, and shared types/validators in one place with shared tooling — a strong signal of scalable team-project structure, even as a solo project.
- **Module-per-domain** backend structure (`modules/patients`, `modules/billing`, etc.) rather than layer-per-type (`all controllers/`, `all services/`) scales better and is easier to navigate as the domain grows — this is the same reasoning NestJS bakes in by convention.
- **`packages/shared-validators`** means a Zod schema for "create appointment" is defined once and imported by both the Express route validator and the React Hook Form resolver — zero drift between client and server validation.

---

## 9. Implementation Roadmap

### Phase 0 — Foundation (Week 1)
- Monorepo scaffolding (Turborepo, TypeScript config, ESLint/Prettier)
- Prisma schema for core entities (users, patients, staff, departments)
- Docker Compose for local Postgres
- CI pipeline skeleton (lint + type-check on PR)

### Phase 1 — MVP (Weeks 2–4)
*Goal: a coherent, demoable slice covering the patient journey end-to-end.*
- Authentication & RBAC (Admin, Doctor, Receptionist, Patient roles only to start)
- Patient Management (register, search, profile)
- Doctor/Staff directory + availability
- Appointment Scheduling (book, reschedule, cancel, check-in)
- Basic Medical Records (encounter notes, vitals — no versioning yet)
- Role-based dashboard shells for each role

**Complexity assessment:** Moderate. This phase establishes every architectural pattern (auth, RBAC, form validation, data tables) that later phases reuse, so it will take proportionally longer than its feature count suggests.

### Phase 2 — Core Clinical & Financial Loop (Weeks 5–7)
- Prescriptions + Pharmacy Management (catalog, stock, dispensing)
- Lab Management (ordering, result entry)
- Billing & Invoicing (auto-generated line items, payments)
- Notification system (in-app + email for appointments)

**Complexity assessment:** High. This is where true cross-module integration happens (a prescription touches Medical Records + Pharmacy + Billing simultaneously) — budget extra time for transactional correctness (e.g., stock deduction on dispense).

### Phase 3 — Operational Depth (Weeks 8–9)
- Ward/Bed Management with real-time occupancy (Socket.IO)
- Inventory & Asset Management
- Nurse and Pharmacist/Lab Technician role dashboards fully fleshed out
- Audit logging middleware applied system-wide

**Complexity assessment:** Moderate-High. Real-time features (Socket.IO) introduce new testing challenges (need to test event emission/consumption, not just REST responses).

### Phase 4 — Analytics, Polish & Compliance (Weeks 10–11)
- Reporting & Analytics dashboards (operational, financial, clinical)
- Settings & Configuration module
- Accessibility audit pass (axe-core, keyboard navigation testing) across all modules
- Performance pass (query optimization, React Query cache tuning, image optimization)

### Phase 5 — Production Readiness & Launch (Week 12)
- E2E test suite (Playwright) covering the 5 critical user journeys (registration → appointment → consultation → prescription → billing)
- Seed script with realistic demo data (fake patients, a week of appointments, sample invoices) so the live demo isn't empty
- Deploy: Vercel (frontend) + Railway/Render (backend) + Neon/Supabase (DB)
- Record a 2–3 minute demo walkthrough video for the README/LinkedIn
- Write architecture decision records (ADRs) for the 3–4 most interesting trade-offs made

> **Total estimated timeline:** ~12 weeks at a part-time (10–15 hrs/week) pace, realistic for a student building this alongside coursework. Phase 1 alone is a legitimate, demoable portfolio piece if time runs short — don't wait until Phase 5 to start showing it to people.

---

## 10. Free Tools & Resources

**Frontend**
- [Next.js](https://nextjs.org) — framework
- [Tailwind CSS](https://tailwindcss.com) — styling
- [shadcn/ui](https://ui.shadcn.com) — accessible component primitives
- [TanStack Query](https://tanstack.com/query) — server-state management
- [Zustand](https://zustand-demo.pmnd.rs) — lightweight client state
- [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) — forms & validation
- [Chart.js](https://www.chartjs.org) + [react-chartjs-2](https://react-chartjs-2.js.org) — charts/analytics
- [GSAP](https://gsap.com) (GreenSock) — timeline-based/orchestrated animation
- [Anime.js](https://animejs.com) — lightweight micro-interaction animation
- [Lucide Icons](https://lucide.dev) — icon set

**Backend**
- [Express](https://expressjs.com) or [NestJS](https://nestjs.com)
- [Prisma](https://www.prisma.io) — ORM
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) + [bcrypt](https://www.npmjs.com/package/bcrypt)
- [CASL](https://casl.js.org) — authorization rules
- [Socket.IO](https://socket.io) — real-time updates
- [express-rate-limit](https://www.npmjs.com/package/express-rate-limit)
- [swagger-jsdoc](https://www.npmjs.com/package/swagger-jsdoc) + [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express)

**Database & Infra (free tiers)**
- [Neon](https://neon.tech) or [Supabase](https://supabase.com) — serverless Postgres
- [pgAdmin](https://www.pgadmin.org) — DB GUI
- [Vercel](https://vercel.com) — frontend hosting
- [Railway](https://railway.app) or [Render](https://render.com) — backend hosting
- [Cloudinary](https://cloudinary.com) — file/image storage
- [Resend](https://resend.com) — transactional email

**Testing & Quality**
- [Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com)
- [Jest](https://jestjs.io) + [Supertest](https://www.npmjs.com/package/supertest)
- [Playwright](https://playwright.dev) — E2E
- [axe-core](https://github.com/dequelabs/axe-core) — accessibility auditing
- [Sentry](https://sentry.io) — error monitoring (free tier)

**Dev Tooling**
- [Turborepo](https://turbo.build) — monorepo orchestration
- [ESLint](https://eslint.org) + [Prettier](https://prettier.io)
- [Docker](https://www.docker.com) + Docker Compose — local Postgres
- [GitHub Actions](https://github.com/features/actions) — CI/CD

---

## 11. Setup Instructions

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/medicore.git
cd medicore

# 2. Install dependencies (monorepo root)
npm install

# 3. Copy environment variables
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, RESEND_API_KEY, etc.

# 4. Start local Postgres via Docker
docker-compose up -d

# 5. Run migrations and seed demo data
cd apps/api
npx prisma migrate dev
npx prisma db seed

# 6. Start the backend
npm run dev          # runs on http://localhost:4000

# 7. In a new terminal, start the frontend
cd apps/web
npm run dev          # runs on http://localhost:3000

# 8. (Optional) Run the test suites
npm run test         # unit + integration
npm run test:e2e     # Playwright E2E (requires both servers running)
```

**Demo credentials** (from seed script):
| Role | Email | Password |
|---|---|---|
| Admin | admin@medicore.demo | Demo@1234 |
| Doctor | doctor@medicore.demo | Demo@1234 |
| Receptionist | reception@medicore.demo | Demo@1234 |
| Patient | patient@medicore.demo | Demo@1234 |

---

## Closing Note for Reviewers

This README is intentionally written as both a **build plan** and an **architecture walkthrough** — the goal is that a hiring manager or interviewer can read it end-to-end and understand not just *what* was built, but *why* each decision (RBAC layering, monorepo structure, FEFO batch dispensing, immutable encounter versioning) was made. When presenting this project, lead with the trade-offs, not just the feature list.
