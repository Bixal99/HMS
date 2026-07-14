# Appointment Management Redesign — Design Spec

**Date:** 2026-07-14  
**Status:** Approved (Sections 1–4 frozen)

## Goal

Extend the existing `Appointment` model into a full outpatient lifecycle (Pending → Confirmed → clinical care) with hard-held slots, a redesigned patient portal, a receptionist pending queue, and reliable role-based notifications—without rewriting Admin, Lab, Pharmacy, Billing, or staff shells.

## Architecture

**Approach:** Appointment State Expansion (single entity). No separate `AppointmentRequest` table.

### Status enum

`PENDING` → `CONFIRMED` → `CHECKED_IN` → `WAITING` → `IN_CONSULTATION` → `COMPLETED`  
Also: `CANCELLED`, `REJECTED`, `EXPIRED`, `NO_SHOW`

Migration: `SCHEDULED` → `CONFIRMED`; `IN_PROGRESS` → `IN_CONSULTATION`.

### Hard hold

Patient portal bookings create `PENDING` and reserve the slot via a **PostgreSQL partial unique index** on `(doctorId, scheduledAt)` where status is blocking (`PENDING`, `CONFIRMED`, `CHECKED_IN`, `WAITING`, `IN_CONSULTATION`).

Non-blocking statuses do not occupy the slot.

### Creation rules

| Created by | Initial status | Approval |
|------------|----------------|----------|
| Patient portal | `PENDING` | Receptionist |
| Reception / Phone / Walk-in | `CONFIRMED` | None |

### Priority

`LOW | NORMAL | URGENT | EMERGENCY` (Phase 1 uses NORMAL / URGENT primarily).

### Source & visit type

- `appointmentSource`: `PATIENT_PORTAL | RECEPTION | PHONE | WALK_IN`
- `visitType`: `NEW_PATIENT | FOLLOW_UP | ROUTINE`

### AppointmentEvent

Append-only log with fixed `eventType` enum (status changes and operational events).

### Expiry

Configurable `appointment.pendingHoldHours` (default 4). Background job marks overdue `PENDING` → `EXPIRED`.

### Roles

- **Patient:** create request, cancel (policy), request reschedule, view own
- **Receptionist:** confirm, reject, offer alternative, reschedule, assign/change doctor, cancel, no-show, check-in
- **Doctor:** start/complete consultation only; see confirmed appointments

## Patient portal

- Single **Book Appointment** entry (guided symptoms or direct)
- Calm Emergency Guidance full page (not red modal)
- Dashboard: next appointment, notifications preview, quick actions, health summary, recent activity
- My Appointments: Upcoming | Pending | Past | Cancelled
- Detail: metadata + timeline + actions
- Dedicated records routes under `/portal/*`
- Personal portal search (own data + actions)
- Success page after submit (no toast spam)

## Receptionist

- `/appointments/pending` with tabs Pending | Reschedule
- Groups: Urgent / Expiring Soon / Normal
- Offer Alternative preferred over immediate reject
- Structured reject reasons
- Dashboard pending widget

## Notifications

One event → one UX. Unread/Read. Deep links. Deduplicate socket + mutation toasts.

## Out of scope (Phase 1)

Admin/Lab/Pharmacy/Billing redesign, full doctor workspace rewrite, full-text clinical search, DRAFT/FOLLOW_UP statuses.
