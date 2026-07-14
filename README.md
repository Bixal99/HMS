# MediCore

Hospital management for real clinical workflows — patient portal, appointments, medical records, pharmacy, lab & imaging, wards, billing, and role-based ops dashboards — in one local monorepo, built entirely on a free/open-source stack.


| Layer    | Stack                                                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Web**  | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · TanStack Query · GSAP + Anime.js · Chart.js · Socket.IO client |
| **API**  | Node.js · Express · Prisma 7 · Socket.IO · PostgreSQL                                                                               |
| **Auth** | Auth.js v5 (database sessions) + CASL abilities, shared via `packages/shared-auth`                                                  |


**Core flow:** Patient self-registers (or Reception registers a walk-in) → guided intake or direct booking → doctor's live queue → consultation & clinical documentation → pharmacy/lab fulfillment → billing — with real-time updates pushed to every screen that needs them, no polling.

---

## Features


| Area               | What you get                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Patient Portal** | Dashboard, symptom-guided or direct appointment booking, appointment timeline, read-only access to records/invoices/lab results                                     |
| **Reception**      | Patient registration (self-service or walk-in, no forced portal login for walk-ins), booking, check-in, live appointment queue                                      |
| **Clinical**       | Consultations with versioned SOAP notes, vitals, diagnoses, prescriptions, lab & imaging ordering                                                                   |
| **Pharmacy & Lab** | FEFO batch dispensing, shared kanban fulfillment board (pharmacy + lab/imaging), automatic critical-result alerting to the ordering doctor                          |
| **Wards**          | Real-time bed occupancy board, admission/transfer/discharge with a guided, checklist-driven discharge flow                                                          |
| **Billing**        | Invoices auto-aggregated from consultations, dispenses, lab charges, and bed-days; payments; insurance claim tracking                                               |
| **Admin & Ops**    | Staff onboarding (role-conditional forms), departments & specialties, inventory & equipment, reporting dashboards, fully automatic audit logging, hospital settings |
| **Realtime**       | Socket.IO-driven live updates — doctor queue, ward occupancy, critical lab alerts — reflected instantly across connected sessions                                   |


---

## Prerequisites

- Node.js ≥ 20 and npm ≥ 10
- PostgreSQL running locally (default port 5432), managed via **pgAdmin 4**
- A [Resend](https://resend.com/) API key (free tier) if you want outgoing email — staff invite emails and the contact form — to actually send

## First-Time Setup

MediCore ships with **no demo data**. The only account created automatically is a single bootstrap Admin, sourced from your own environment variables — every other account (doctors, nurses, receptionists, pharmacists, lab techs, billing officers, patients) is created through the app itself, by the role that's actually supposed to create it.

```bash
npm install

cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Fill in DATABASE_URL, AUTH_SECRET, INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD,
# RESEND_API_KEY, WEB_ORIGIN — keep DATABASE_URL identical in both files

npm run db:migrate
npm run db:seed      # creates exactly one bootstrap Admin + default settings — nothing else

npm run dev

```

Log in as the bootstrap Admin using the credentials from your `.env`. You'll be forced to set a new password immediately. From there, use the app itself to populate everything else with real data:

1. **Settings → Departments & Specialties** — define your hospital's actual structure
2. **Staff Management** — onboard doctors, nurses, receptionists, pharmacists, lab technicians, and billing officers (each gets an emailed invite to set their own password)
3. **Pharmacy → Medicine Catalog**, **Lab → Test Catalog**, **Wards → Beds**, **Inventory** — populate as needed
4. Patients register themselves through the public portal, or Reception registers walk-ins directly


| App | URL                   |
| --- | --------------------- |
| Web | http://localhost:3000 |
| API | http://localhost:4000 |


Environment templates live in `apps/api/.env.example` and `apps/web/.env.example`. Copy them to `.env` (gitignored) and fill in your own values — never commit real secrets, and never let the app boot with a hardcoded fallback for `INITIAL_ADMIN_EMAIL`/`INITIAL_ADMIN_PASSWORD`.

---

## Environment Variables


| Variable                                         | Where                  | Purpose                                                 |
| ------------------------------------------------ | ---------------------- | ------------------------------------------------------- |
| `DATABASE_URL`                                   | `apps/api`, `apps/web` | Local PostgreSQL connection string — must match in both |
| `AUTH_SECRET`                                    | `apps/web`             | Auth.js session encryption key                          |
| `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` | `apps/api`             | Bootstrap Admin credentials — required, no fallback     |
| `RESEND_API_KEY`                                 | `apps/api`             | Outgoing email (staff invites, contact form)            |
| `WEB_ORIGIN`                                     | `apps/api`             | CORS + Socket.IO allowed origin                         |


---

## Scripts


| Command              | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `npm run dev`        | Start web + API together (Turborepo)                         |
| `npm run build`      | Production build, all workspaces                             |
| `npm run lint`       | Lint all workspaces                                          |
| `npm run db:migrate` | Apply Prisma migrations                                      |
| `npm run db:seed`    | Bootstrap Admin + default settings only — no demo data       |
| `npm run db:studio`  | Open Prisma Studio                                           |
| `npm run test`       | Unit + integration tests                                     |
| `npm run test:e2e`   | Playwright end-to-end tests (requires `npm run dev` running) |


---

## Workspace

```
medicore/
├── apps/
│   ├── web/                 # Next.js — patient portal, staff dashboards, public marketing site
│   └── api/                 # Express + Prisma + Socket.IO
├── packages/
│   ├── shared-types/        # Shared TypeScript DTOs
│   ├── shared-validators/   # Zod schemas used by both web and api
│   └── shared-auth/         # Session validation + CASL abilities
├── e2e/                     # Playwright tests
├── .github/workflows/       # CI
├── turbo.json
└── package.json

```

---

## Development Process

MediCore was built as a sequence of scoped, self-contained tasks — foundation and theming, then auth/RBAC, then each clinical and operational module in dependency order, finishing with a production-readiness pass (real-data-only registration, animation/performance audit, bug sweep) rather than one large build. The full module-by-module architecture, database schema rationale, and UX decisions behind each screen are documented separately in `ARCHITECTURE.md`.

## License

Private / unpublished — for local MediCore development.