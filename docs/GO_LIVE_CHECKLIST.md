# Go-live checklist

Written after a full check of the live site. Tick each item before you announce the website.
**Do the first six in order.** Everything else can follow.

## A. Must do before launch

| # | What | Who | How |
|---|------|-----|-----|
| 1 | **Approve the church bank account** | The administrator who did *not* propose it | Admin → Approvals. Check the account number, name and branch against the bank passbook first. Until this is approved, an approved booking tells the person "contact the church office for the bank details". |
| 2 | **Clear the sample data** | You | The site holds made-up people, notices, sermons, bookings, assets and medical items. Birthdays from the made-up people show on the public notice. In Vercel → Settings → Environment Variables add `CLEAR_SAMPLE_DATA` = `delete-all-sample-data` (Production), redeploy, wait for it to finish, then **delete the variable**. It keeps accounts, the hall rate, bank details, all guides and the welcome notice. Do this *before* entering real information; it cannot be undone. |
| 3 | **Set up email** (see section B) | You | Without it, nobody gets their booking reference, approval, bank details or rejection by email. They only see them if they come back to their booking page. |
| 4 | **Set `CRON_SECRET`** and decide how often the cancel job runs (section C) | You | Today anyone who knows the address can trigger the job. |
| 5 | **Add a third administrator** | You | Every change needs two administrators. If one is away or locked out, nothing can be approved. There is no "forgot password": a locked-out administrator is switched off and re-added by the others. Admin → Accounts → Add an account (role: Administrator). |
| 6 | **Enter the real information** | The office | Real notices, sermon links (the sample sermons all point to `https://www.facebook.com/`), people and their dates, assets, medical equipment, and read the ten guides to check they match how the church works. |

## B. Email: what to set up and where it goes

The website sends five emails, all **to the address the visitor typed on the booking form**:

1. Request received (contains the booking reference and a link)
2. Approved (amount, bank details, link to upload the slip)
3. Rejected (with the reason you wrote)
4. Payment confirmed
5. Cancelled because it was not paid in time

It also sends **one to the church office** when a new request arrives, if you set `CHURCH_OFFICE_EMAIL`. Without it, the only sign of a new request is the number next to "Admin" in the menu.

Add these in Vercel → Settings → Environment Variables (Production), then redeploy:

| Name | Value |
|------|-------|
| `SMTP_USER` | The church mailbox that sends the mail, e.g. a Gmail or Google Workspace address |
| `SMTP_PASS` | For Gmail: an **App Password** (Google Account → Security → 2-Step Verification → App passwords). Not the normal password. |
| `FROM_EMAIL` | The address shown as the sender (usually the same as `SMTP_USER`) |
| `FROM_NAME` | `Mount Lavinia Methodist Church` |
| `CHURCH_OFFICE_EMAIL` | The inbox that should be told about new booking requests |
| `SMTP_HOST`, `SMTP_PORT` | Only if not Gmail. Defaults are `smtp.gmail.com` and `587`. |

After setting them: make a test booking with your own email, approve it, and check each email arrives (and not in spam). Emails say "do not reply", so replies are not handled.

## C. The automatic cancel job

- It cancels an approved booking that has not been paid by one hour before it starts.
- Vercel's free plan can only run it **once a day (05:30 Sri Lanka time)**, so a booking can sit unpaid past its deadline for up to a day. Choices: upgrade the Vercel plan (hourly is possible), or call the address every hour from a free scheduler (GitHub Actions) with the secret.
- Set `CRON_SECRET` (any long random value). Vercel then sends it automatically.

## D. Recommended

- Set `JWT_SECRET` to a long random value (login cookies are otherwise derived from the database address; changing the database password would sign everyone out).
- Delete `BOOTSTRAP_ADMIN_SECRET` (first-time setup is already closed).
- Choose the final web address. If you add your own domain in Vercel, set `NEXT_PUBLIC_BASE_URL` to it, otherwise links in emails use the Vercel address.
- Neon (the database): check the plan's backup window and consider upgrading. On the free plan the database goes to sleep when unused, so the first visit after a quiet spell can take a few seconds.
- You can delete the old unused Neon project ("MLMC Website").
- Add a staff account (Admin → Accounts) and have that person log in to confirm they can view everything but change nothing.
- If the church keeps members' birthdays and phone numbers, decide who may see them and tell members.

## E. Known limits (not bugs)

- Medical items cannot be edited or deleted once added (check spelling). Loans can.
- A person cannot be deleted from the register, only marked as passed away. (The clear-sample-data step above is the one way to start clean.)
- There is no "forgot password". See item 5.
- Staff can view everything but change nothing; only administrators approve.
- The booking form limits one email address to 8 requests an hour, and the whole site to 200 an hour, to stop spam.
- Sermon links are Facebook links you paste in; "Rating" counts how many different devices pressed Watch.

## F. What has been tested

- **Every function, as visitor, staff and two administrators:** 103 test cases, 412 checks, all passing on a local copy (`npm test`, list in `docs/TEST_CASES.md`).
- **On the live site:** read-only checks anyone can repeat with `npm run test:live` (71 checks); every form submitted with real clicks as an administrator; a booking made as a visitor and rejected in Approvals; a payment slip uploaded, seen by the administrator, hidden from visitors, then rejected; every button checked for being covered or off-screen at phone, tablet and desktop widths.
- **Not tested on the live site:** emails (no email account yet), the staff login (no staff account yet), confirming a payment as "paid" (a paid booking can never be cancelled, so it was tested locally only), the automatic cancel job, and creating an account (it needs a password typed into the form).
