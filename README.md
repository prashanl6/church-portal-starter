# Church Portal – MVP Starter

Minimal, fast, elder-friendly portal with RBAC, dual-approval, audit logs, and key modules scaffolded.

## Quick Start
```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Login via `/login`:
- admin1@example.com / Admin@123
- admin2@example.com / Admin@123
- staff@example.com / Staff@123

## What’s Included
- Next.js (App Router) + Tailwind
- Prisma + SQLite
- JWT auth (HttpOnly cookie), middleware-protected `/admin` routes
- Generic approvals API (`/api/approvals`) and Approvals queue UI
- Audit log helper
- Assets (Admin CRUD draft + submit for approval)
- Notices (submit → dual-approve → publish flow; public list on `/notices`)
- Sermons list + `/api/sermons/view` (rating=views)
- Hall booking (public request + basic availability)
- Extensible data models for PeopleEvents, Medical, Processes

## Next Steps
- Implement email notifications and file uploads (S3)
- Add WYSIWYG editor and image upload for Processes
- Enforce dual-approval apply hooks (e.g., change status to `published` on second approval)
- Add anniversary reminder cron worker
- Harden security for production (HTTPS, secrets, logging)
