# MediCore

Hospital Management System monorepo — Next.js 16 (web) + Express/Prisma 7 (api) + local PostgreSQL.

## Quick start

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit DATABASE_URL + AUTH_SECRET, then:
npm run db:migrate
npm run db:seed
npm run dev
```

- Web: http://localhost:3000
- API: http://localhost:4000
- Health: `GET http://localhost:4000/health`
- Auth probe: `GET http://localhost:4000/health/me` (requires Auth.js session cookie)

Root scripts:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start web + api via Turborepo |
| `npm run build` | Build all workspaces |
| `npm run lint` | Lint all workspaces |
| `npm run db:migrate` | Run Prisma migrations (`apps/api`) |
| `npm run db:seed` | Seed 8 demo users |
| `npm run db:studio` | Open Prisma Studio |

## Authentication (Task 02)

Self-hosted **Auth.js v5** with **database sessions** (Prisma `Session` table). Email/password login uses Next.js Server Actions that create a `Session` row and set the `authjs.session-token` cookie — not the Credentials provider (incompatible with database sessions in Auth.js v5). Logout deletes the `Session` row.

- Patients self-register at `/register`
- Staff/admin accounts are seed-only (not public registration)
- Login rate limit: 5 failed attempts / 15 minutes per IP+email (in-memory, Next.js side)
- Express resolves the same cookie via `@shared/auth` `validateSessionToken`

### Demo credentials

Password for all seeded users: `Demo@1234`

| Role | Email | Post-login route |
|------|-------|------------------|
| ADMIN | admin@medicore.local | `/dashboard/admin` |
| DOCTOR | doctor@medicore.local | `/dashboard/doctor` |
| NURSE | nurse@medicore.local | `/dashboard/nurse` |
| RECEPTIONIST | receptionist@medicore.local | `/dashboard/receptionist` |
| PHARMACIST | pharmacist@medicore.local | `/dashboard/pharmacy` |
| LAB_TECHNICIAN | lab@medicore.local | `/dashboard/lab` |
| BILLING_OFFICER | billing@medicore.local | `/dashboard/billing` |
| PATIENT | patient@medicore.local | `/portal` |

## Patient management (Task 03)

- Staff: `/patients` list (debounced search), `/patients/new` 4-step registration, `/patients/[id]` profile
- API: `/api/patients` CRUD + allergies + document upload (local disk under `apps/api/uploads/`)
- MRN format: `MRN-YYYY-#####` (sequential per year)
- Soft-delete only (`deletedAt`); Admin-only delete
- Timeline appointments/encounters/invoices are placeholders until later tasks

## Staff & UI polish (Task 04)

- App shell with GSAP nav pill, breadcrumbs, avatar menu, and mobile `vaul` drawer
- Motion utilities: `apps/web/lib/motion.ts` + `apps/web/lib/microInteractions.ts`
- Staff directory `/staff`, weekly availability `/staff/availability`, leave inbox `/staff/leave` (Admin)
- Shared `<EmptyState />` for zero-result lists

## Local Database Setup (PostgreSQL + pgAdmin 4)

**Primary path for this project:** native PostgreSQL on your machine, administered through **pgAdmin 4**. Do not use hosted/serverless Postgres (Neon/Supabase/etc.) for local development.

### Prerequisites

- PostgreSQL installed locally (default port `5432`)
- pgAdmin 4 installed and connected to your local server

### 1. Create the database

1. Open **pgAdmin 4** and connect to your local PostgreSQL server.
2. In the left browser tree: expand **Servers** → your server → right-click **Databases**.
3. Choose **Create** → **Database…**.
4. On the **General** tab, set **Database** to `medicore_dev`.
5. Click **Save**.

### 2. Create the login role

1. Under your server, right-click **Login/Group Roles**.
2. Choose **Create** → **Login/Group Role…**.
3. **General** tab: set **Name** to `medicore_user`.
4. **Definition** tab: set a **Password** (you will put this in `.env`).
5. **Privileges** tab: enable **Can login?** and grant rights needed for development (at minimum login; then grant DB privileges as below).
6. Click **Save**.

### 3. Grant privileges on `medicore_dev`

1. Right-click database `medicore_dev` → **Properties** → **Security** (or use the Query Tool).
2. Grant `medicore_user` full privileges on `medicore_dev` (CONNECT, CREATE, TEMPORARY as needed).
3. Optionally run [`scripts/setup-medicore-db.sql`](scripts/setup-medicore-db.sql) in the Query Tool as a superuser to create/align role + DB in one pass (adjust the password in the script to match yours).

### 4. Configure connection strings

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

```env
DATABASE_URL="postgresql://medicore_user:<password>@localhost:5432/medicore_dev?schema=public"
PORT=4000
WEB_ORIGIN="http://localhost:3000"
AUTH_SECRET="<long-random-string>"
AUTH_URL="http://localhost:3000"
```

### 5. Migrate, seed, and verify in pgAdmin

```bash
npm run db:migrate
npm run db:seed
```

In pgAdmin 4: **medicore_dev** → **Schemas** → **public** → **Tables**. You should see foundation tables plus:

- `Account`
- `Session`
- `VerificationToken`

Open Prisma Studio:

```bash
npm run db:studio
```

## Optional: Docker Compose Postgres

If you cannot install native PostgreSQL, an optional Compose file is provided. This is an **alternative**, not the primary workflow.

```bash
docker compose up -d
```

Compose publishes Postgres on host port **5433** (so it does not collide with a native instance on `5432`). Point `apps/api/.env` and `apps/web/.env` at:

```env
DATABASE_URL="postgresql://medicore_user:medicore_dev_password@localhost:5433/medicore_dev?schema=public"
```

Credentials match `POSTGRES_*` in [`docker-compose.yml`](docker-compose.yml).

## Workspace layout

```
medicore/
├── apps/
│   ├── web/          # Next.js 16 + Auth.js + blue theme
│   └── api/          # Express + Prisma 7
├── packages/
│   ├── shared-types/
│   ├── shared-validators/
│   └── shared-auth/  # CASL stubs + session validation
├── docker-compose.yml
├── turbo.json
└── package.json
```

## Design system

Blue theme tokens live in [`apps/web/app/globals.css`](apps/web/app/globals.css). Components must use Tailwind semantic classes (`bg-primary`, `text-muted-foreground`, etc.) — no hardcoded hex or `bg-blue-*` utilities.
