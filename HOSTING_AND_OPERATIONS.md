# Church Portal — Hosting, user guide, and ongoing operations

This document covers how to deploy the site, how people use it day to day, and what to maintain after go-live.

---

## 1. What this application is

The **Church Portal** is a Next.js (App Router) web app with:

- **Public pages**: home, weekly notices, sermons (with star ratings), process documents, hall booking requests.
- **Staff area** (`/admin` and `/api/admin/*`): protected by login; roles are **`admin`** and **`staff`** (both can use the admin UI and APIs). **`guest`** users are not allowed into `/admin`.
- **Dual approval**: many changes go through an **Approvals** queue; two approvers sign off before content goes live (pattern varies slightly by resource).
- **SQLite + Prisma** by default (`DATABASE_URL` pointing at a file).

---

## 2. Hosting the website

### 2.1 Prerequisites

- **Node.js** (LTS, e.g. 20.x) and **npm**.
- A **secrets-safe** way to set environment variables (hosting dashboard or secret manager).
- For production, a **persistent database** strategy (see §2.4).

### 2.2 Local development

```bash
npm install
cp .env.example .env
# Edit .env: JWT_SECRET, DATABASE_URL, SMTP_*, BASE_URL, etc.

npx prisma migrate dev
npx prisma db seed   # optional: demo users (see README.md)
npm run dev
```

Default app URL is often `http://localhost:3000` unless you use another port; align `NEXT_PUBLIC_BASE_URL` and `BASE_URL` with whatever you use so links in emails work.

### 2.3 Production build

The `build` script runs migrations, generates the Prisma client, a small legacy data helper, then `next build`:

```bash
npm run build
npm run start
```

Ensure **`DATABASE_URL`** is valid on the build host **before** `npm run build`, because `prisma migrate deploy` runs during build.

### 2.4 Database in production (important)

The project is configured for **SQLite** (`file:...`). That is fine for a **single server with a persistent disk** (VPS, dedicated Node host, Docker volume).

**Serverless platforms** (e.g. Vercel) use **ephemeral filesystems**: a SQLite file is not durable across deploys and can break under concurrent writes. For production on such platforms you should:

- Switch Prisma to **PostgreSQL**, **MySQL**, or **Turso/libSQL**, update `schema.prisma` `datasource`, set a hosted `DATABASE_URL`, and run migrations against that database; **or**
- Run the app on a **VM/container** with a persistent volume for the SQLite file.

Plan backups and restore tests for whatever database you choose.

### 2.5 Deploying on Vercel (if you use it)

1. Connect the Git repository and set the **root** to the app root (where `package.json` lives).
2. Add **all** variables from `.env.example` in the Vercel project **Settings → Environment Variables** (Production and Preview as needed).
3. Set **`CRON_SECRET`** in production. Vercel Cron (see `vercel.json`) calls `/api/cron/booking-auto-cancel` **once per day at 00:00 UTC**; the route expects `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is set.
4. Confirm **`NEXT_PUBLIC_BASE_URL`** and **`BASE_URL`** are your real public `https://` domain.
5. Resolve **SQLite vs hosted DB** per §2.4 before relying on production data.

### 2.6 File uploads

Attachments (e.g. process documents, payment slips) are stored under **`public/uploads/`** on disk. On a single VM, keep that directory on persistent storage and **include it in backups**. On serverless hosts, plan **blob storage** (S3, etc.) if you outgrow local disk.

### 2.7 Email (SMTP)

Booking and other notifications need a working SMTP configuration:

- Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `FROM_NAME`.
- For Gmail, use an **App Password** (with 2FA enabled), not your normal login password.
- Wrong `BASE_URL` / `NEXT_PUBLIC_BASE_URL` produces broken links in emails.

---

## 3. Environment variables reference

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Prisma connection string (SQLite file or other provider). |
| `JWT_SECRET` | Signs auth cookies; use a long random string in production. |
| `SMTP_*`, `FROM_EMAIL`, `FROM_NAME` | Outbound email. |
| `NEXT_PUBLIC_BASE_URL` | Public site URL (browser-visible, e.g. links). |
| `BASE_URL` | Server-side base URL for emails and internal URLs. |
| `CRON_SECRET` | Protects the booking auto-cancel cron (`Bearer` token). **Required in production** for that job to run. |
| `BOOKING_TIMEZONE` | IANA zone for hall booking times (e.g. `Asia/Colombo`); used for payment-deadline logic. |

Copy `.env.example` and fill in real values; never commit `.env`.

---

## 4. User guide — public visitors (no login)

### 4.1 Navigation

From the header: **Home**, **Notices**, **Sermons**, **Processes**, **Book Hall**, and **Staff Login**.

### 4.2 Notices

- Open **Notices** to read published weekly notices.
- Content is managed in the admin area and published after approvals.

### 4.3 Sermons

- Open **Sermons** to see published sermons and external links.
- Visitors can **rate** a sermon with stars (one rating per sermon per browser is enforced via a stored client id).

### 4.4 Process documents

- **Without logging in**, only **published** processes tagged **Public** appear.
- **After Staff Login**, the same page also lists **published** processes tagged **Steward** (internal-facing).
- Open a document to read the HTML content and download attached **Excel / Word** files when present.

### 4.5 Book hall

- Use **Book Hall** to submit a booking request (date, time, contact details, purpose).
- Follow any on-screen instructions for **payment** and uploading a **payment slip** if your workflow requires it.
- Keep the **booking reference** you receive; you may need it to open your booking status page.

### 4.6 Staff login (for everyone who uses `/admin`)

- Click **Staff Login** (`/login`) and sign in with credentials issued by your church (admins create users in the database or via your onboarding process).
- **Admins** see an **Admin** link in the header; **staff** can still access `/admin` directly if they have the **staff** role.

---

## 5. User guide — admins and staff (`/admin`)

Both **admin** and **staff** can use the admin UI unless you add stricter rules later. Typical areas:

| Area | Typical use |
|------|-------------|
| **Dashboard** (`/admin`) | Entry point to modules. |
| **Approvals** | Review submitted changes; dual-approve or reject. |
| **Notices** | Create/edit notices; submit for approval. |
| **Sermons** | Manage sermon records. |
| **Processes** | Create/edit process documents, set **Tag**: **Public** (everyone) or **Steward** (logged-in only on `/processes`), attach files; submit changes for approval where applicable. |
| **Bookings** | Review hall bookings, payment status, etc. |
| **People** | Manage **individuals** (birthdays, contact) and **anniversaries**. |
| **Church bank account** | Propose bank details for booking payments (approval workflow). |
| **Assets**, **Medical**, **Audit** | As named in the app. |

**Process tags (mandatory when creating/updating processes):**

- **Public** — listed for everyone, including without login.
- **Steward** — listed only for users who are logged in.

Admins editing from the public **Processes** page (when logged in as admin) should keep the tag accurate when submitting updates for approval.

---

## 6. Automation: booking auto-cancel cron

- **Route**: `GET /api/cron/booking-auto-cancel`
- **Schedule**: Defined in `vercel.json` (once daily at **00:00 UTC**) when using Vercel Cron.
- **Security**: With `CRON_SECRET` set, requests must include header `Authorization: Bearer <CRON_SECRET>`.
- **Behaviour**: Cancels bookings that remain unpaid by the configured deadline relative to hall start time (see code in `src/lib/bookingAutoCancel.ts` and `BOOKING_TIMEZONE`).

If you do not use Vercel, run the same URL on a schedule from **cron**, **GitHub Actions**, or another worker, with the Bearer token.

---

## 7. Maintenance and upkeep (after deployment)

### 7.1 Migrations

- New database changes ship as SQL under `prisma/migrations/`.
- **Production**: `npm run build` already runs `prisma migrate deploy`. For manual runs: `npx prisma migrate deploy`.
- Always **back up** the database before major upgrades.

### 7.2 Secrets and rotation

- Rotate **`JWT_SECRET`** only with a plan: existing sessions invalidate immediately.
- Rotate **`CRON_SECRET`** in the host env and in any external scheduler.
- Rotate SMTP passwords on the same schedule as your church IT policy.

### 7.3 Dependencies

- Periodically run `npm audit` and upgrade Next.js / Prisma for security patches.
- Re-run **`npm run build`** in staging after upgrades before production.

### 7.4 Backups

- **Database**: automated backups + test restores.
- **`public/uploads/`**: include in backup if you rely on on-disk files.
- Store backups **off-site** and encrypt if they contain personal data.

### 7.5 Logs and monitoring

- Watch hosting logs for **5xx** errors and failed cron runs.
- Monitor disk usage if SQLite and uploads stay on one volume.

### 7.6 Legal and privacy

- Booking and people modules may hold **personal data**. Align retention, consent, and access with your church’s policies and local law.

### 7.7 Optional scripts

- **`npm run seed`**: development/demo data (do not run blindly in production).
- **`scripts/migrate-legacy-people-event.js`**: invoked during `npm run build`; only relevant if you have legacy data (see script comments).

---

## 8. Quick troubleshooting

| Symptom | Things to check |
|---------|------------------|
| Cannot log into `/admin` | Cookie blocked? HTTPS mismatch? `JWT_SECRET` changed? User role must be `admin` or `staff`. |
| Emails not sending | SMTP vars, provider blocking “less secure” apps, `FROM_EMAIL` alignment with provider. |
| Cron always401/500 | `CRON_SECRET` set in production but scheduler missing `Authorization: Bearer ...`. |
| Processes missing for public | Status must be **published** and tag **Public** for anonymous users. |
| Build fails on migrate | `DATABASE_URL` unreachable from build environment; run migrations in CI with DB access. |

---

## 9. Related files in the repo

- **`README.md`** — quick start and demo logins for local dev.
- **`.env.example`** — template environment variables.
- **`vercel.json`** — cron schedule for booking auto-cancel.
- **`prisma/schema.prisma`** — data model reference.

For implementation details, prefer reading the source under `src/app` and `src/lib` next to the feature you are changing.
