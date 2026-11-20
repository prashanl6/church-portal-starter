# Church Portal – MVP Starter

Minimal, fast, elder-friendly portal with RBAC, dual-approval, audit logs, and key modules scaffolded.

**Deployment, end-user guidance, and ongoing operations:** see [HOSTING_AND_OPERATIONS.md](./HOSTING_AND_OPERATIONS.md).

## Quick Start

You need a **PostgreSQL** database (local install, Docker, or a hosted free tier).

```bash
npm install
cp .env.example .env
# Edit .env: set DATABASE_URL, JWT_SECRET, and optional SMTP / BASE_URL

npx prisma migrate dev
npx prisma db seed
npm run dev
```

Example local DB with Docker:

```bash
docker run --name church-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=church_portal -p 5432:5432 -d postgres:16
# Then in .env:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/church_portal?schema=public"
```

### Upgrading from an older SQLite checkout

The app now uses **PostgreSQL only**; old SQLite migration folders were replaced by one baseline migration. Point `DATABASE_URL` at a new (or existing empty) Postgres database, run `npx prisma migrate deploy` (or `migrate dev`), then `npx prisma db seed`. There is **no** automatic copy of data from SQLite.

Login via `/login` (after `npx prisma db seed`):

- **Admins:** admin1@example.com … admin4@example.com — password `Admin@123`
- **Staff:** staff@example.com, staff2@example.com, staff3@example.com — password `Staff@123`

To add only the **extra** admin3, admin4, staff2, staff3 accounts without re-running the full seed (which resets demo notices): `npm run seed:extra-users`

## What’s Included

- Next.js (App Router) + Tailwind
- Prisma + **PostgreSQL**
- JWT auth (HttpOnly cookie), middleware-protected `/admin` routes
- **Maker–checker approvals** (`src/lib/approval.ts`): one admin submits a change and a *different* admin approves it before it goes live. Staff can view but never approve. Covers assets, notices, sermons, process documents, the birthday/anniversary register, the hall hire rate, church bank details and hall bookings. Every request, approval and rejection is in the audit log.
- Uploaded files (payment slips, process attachments) are stored **in PostgreSQL** and served through `/api/files/[id]` with permission checks, so they survive redeploys on Vercel and are never public by URL.
- Logins lock for 15 minutes after 5 wrong passwords. `JWT_SECRET` is **required** in production.
- Audit log helper
- Assets (Admin CRUD draft + submit for approval)
- Notices (submit → dual-approve → publish flow; public list on `/notices`)
- Sermons list + star ratings (`/api/sermons/rate`)
- Hall booking (public request + basic availability)
- Extensible data models for PeopleEvents, Medical, Processes

## Email Configuration

Email notifications are enabled for booking requests. To configure:

1. Create a `.env` file in the root directory with the following:

   ```
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/church_portal?schema=public"
   JWT_SECRET="your-secret-key-here"

   # Email Configuration (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password-here
   FROM_EMAIL=your-email@gmail.com
   FROM_NAME=Church Portal

   # Base URL for email links
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   BASE_URL=http://localhost:3000
   ```

2. For Gmail, you'll need to:
   - Enable 2-Step Verification on your Google account
   - Generate an App Password: https://myaccount.google.com/apppasswords
   - Use the App Password (not your regular password) in `SMTP_PASS`

3. Update `NEXT_PUBLIC_BASE_URL` and `BASE_URL` to your production domain when deploying.

## Checking the approval rules

With the app running against a seeded database:

```bash
BASE_URL=http://localhost:3000 node tests/dual-control.api.mjs
```

It runs about 55 checks (maker cannot approve own change, staff cannot approve, bookings cannot clash, paid bookings cannot be cancelled, files are not public, and so on). Run it on a test database, not production: it creates test records and locks `staff3@example.com` for 15 minutes.

## Next Steps

- Add anniversary reminder cron worker
- Harden security for production (HTTPS, secrets, logging)
