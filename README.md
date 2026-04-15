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

### Old SQLite data (`prisma/dev.db`) → PostgreSQL (local or Neon)

The app now uses **PostgreSQL only**. If you still have a legacy **`prisma/dev.db`** from before the switch, you can **copy that data** (notices, sermons, processes, users, etc.) into the database your `DATABASE_URL` points at:

1. In **`.env`**, keep **one** `DATABASE_URL` line (PostgreSQL). Remove or comment out any `file:./dev.db` line so tools don’t get confused.
2. Ensure that database has the schema: `npx prisma migrate deploy`
3. Run (this **deletes and replaces** all rows in those tables in the target Postgres with SQLite data — use a **dev** database or Neon branch if you must not touch production):

```bash
CONFIRM_IMPORT=1 npm run db:import-sqlite
```

Optional: `SQLITE_PATH=./prisma/other.db` if your file is not the default.

Login via `/login`:

- admin1@example.com / Admin@123
- admin2@example.com / Admin@123
- staff@example.com / Staff@123

## What’s Included

- Next.js (App Router) + Tailwind
- Prisma + **PostgreSQL**
- JWT auth (HttpOnly cookie), middleware-protected `/admin` routes
- Generic approvals API (`/api/approvals`) and Approvals queue UI
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

## Next Steps

- Add anniversary reminder cron worker
- Harden security for production (HTTPS, secrets, logging)
