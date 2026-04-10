# Church Portal – MVP Starter

Minimal, fast, elder-friendly portal with RBAC, dual-approval, audit logs, and key modules scaffolded.

**Deployment, end-user guidance, and ongoing operations:** see [HOSTING_AND_OPERATIONS.md](./HOSTING_AND_OPERATIONS.md).

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
- Sermons list + star ratings (`/api/sermons/rate`)
- Hall booking (public request + basic availability)
- Extensible data models for PeopleEvents, Medical, Processes

## Email Configuration

Email notifications are enabled for booking requests. To configure:

1. Create a `.env` file in the root directory with the following:
   ```
   DATABASE_URL="file:./prisma/dev.db"
   JWT_SECRET="your-secret-key-here"
   
   # Email Configuration (SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=prashan.bastiansz@gmail.com
   SMTP_PASS=your-app-password-here
   FROM_EMAIL=prashan.bastiansz@gmail.com
   FROM_NAME=Church Portal
   
   # Base URL for email links
   NEXT_PUBLIC_BASE_URL=http://localhost:3001
   BASE_URL=http://localhost:3001
   ```

2. For Gmail, you'll need to:
   - Enable 2-Step Verification on your Google account
   - Generate an App Password: https://myaccount.google.com/apppasswords
   - Use the App Password (not your regular password) in `SMTP_PASS`

3. Update `NEXT_PUBLIC_BASE_URL` and `BASE_URL` to your production domain when deploying.

## Next Steps
- Add WYSIWYG editor and image upload for Processes
- Add anniversary reminder cron worker
- Harden security for production (HTTPS, secrets, logging)
