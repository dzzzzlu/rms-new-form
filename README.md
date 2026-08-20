# Regis Marie College — Document Request System (Next.js + Supabase)

Full rebuild of the PHP/MySQL system as a Next.js + Supabase app: **left
sidebar** in a deep-blue theme, role-aware nav, and four portals working
end-to-end.

**Student:** dashboard, new request + GCash QR/number + payment proof upload
(with a class list field for Certificate of Enrollment requests), request
history/tracking, profile.
**Registrar:** dashboard, manage requests (status updates, blocked from
releasing Good Moral/Diploma until approved), verify payments, diploma
clearance, reports + CSV export.
**Guidance Department (new role):** dashboard, approve/reject Good Moral
Certificate requests before the registrar can release them.
**Admin:** dashboard, manage users (change role, archive/restore — accounts
are never deleted), import past records via CSV, analytics with search/filter
across status/document/requestor/course, reports + CSV export.

Email status updates go out automatically via Resend (see section 5 below).

## 1. Supabase setup

1. Create a project at https://supabase.com.
2. Go to **SQL Editor** → paste the contents of `supabase/schema.sql` → Run.
   This creates all tables, the `profiles` auto-provisioning trigger, Row Level
   Security policies, and a private `payment-proofs` storage bucket.
3. Go to **Project Settings → API** and copy the **Project URL** and **anon
   public key**.
3b. Go to **SQL Editor** again and run `supabase/migrations/002_features.sql`
   — **run the first line (`alter type user_role add value...`) by itself**,
   then run the rest of the file in a second query (Postgres won't let a
   brand-new enum value be used in the same transaction that created it).
   This adds the `guidance` role, Good Moral/Diploma approval columns, and
   the class-list field.
4. Create your first admin/registrar/guidance accounts by registering through the app
   (`/register` currently signs people up as `student`), then in the SQL
   editor run:
   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```
5. **Email verification** is on by default in Supabase: new sign-ups get a
   confirmation email and can't sign in until they click it (the app's
   `/register` page shows a "check your email" screen, and `/auth/confirm`
   handles the confirmation link). To customize it:
   - **Auth → Providers → Email**: toggle "Confirm email" on/off.
   - **Auth → URL Configuration**: add your site's URL (and
     `http://localhost:3000` for local dev) to the redirect allow-list, or
     the confirmation link will fail.
   - **Auth → Email Templates**: edit the "Confirm signup" template if you
     want Regis Marie branding in the email itself.
   - The login page has a "Resend verification email" link that appears if
     someone tries to sign in before confirming.

## 2. Local development

```bash
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev
```

Visit http://localhost:3000 — you'll be redirected to `/login`.

**Important:** Before running the app, you must run 3 SQL files in the Supabase SQL Editor in order:
1. `supabase/schema.sql` — creates all tables, triggers, RLS policies, and storage
2. `supabase/migrations/002_features.sql` — adds guidance role, approval columns, class list (run the ALTER TYPE line first, then the rest)
3. `supabase/migrations/003_security_hardening.sql` — hardens the registration trigger and updates `is_staff()` helper

## 3. Push to GitHub

```bash
git init
git add .
git commit -m "Phase 1: Next.js + Supabase scaffold, left sidebar, blue theme"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## 4. Deploy on Vercel

1. https://vercel.com → **Add New Project** → import the GitHub repo.
2. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy. Every push to `main` will auto-redeploy.

## Design notes

- Sidebar is fixed to the **left**, full height, gradient from `brand-950`
  (near-navy) down to `brand-700`, with role-specific nav items and an active
  state highlight.
- Color scale lives in `tailwind.config.ts` under `brand.50`–`brand.950` —
  edit those hex values to shift the whole app's shade of blue in one place.
- `app/(dashboard)/layout.tsx` is a server component that loads the signed-in
  user's profile (name + role) and feeds it to `DashboardShell`, which renders
  `Sidebar` + `Topbar` + page content. Every role's pages live under
  `app/(dashboard)/<role>/...` and automatically get the sidebar.

## 5. Email status updates (Resend + Supabase Edge Function)

Whenever a registrar changes a request's status, the student now gets an
email — this is coded in `supabase/functions/send-status-email/index.ts`, it
just needs to be deployed and connected. Steps:

1. **Create a Resend account** at resend.com (free tier: 3,000 emails/month).
   - Get your API key from **API Keys**.
   - Under **Domains**, verify a domain you own (e.g. `regismarie.edu.ph`) so
     you can send as `registrar@regismarie.edu.ph`. If you don't have a
     domain ready yet, you can start with Resend's shared test sender
     (`onboarding@resend.dev`) — fine for testing, not for real students.

2. **Install the Supabase CLI** (one-time, on your own machine):
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF   # find this in your Supabase project URL
   ```

3. **Deploy the function:**
   ```bash
   supabase functions deploy send-status-email
   ```

4. **Set secrets** (the function reads these at runtime):
   ```bash
   supabase secrets set RESEND_API_KEY=re_your_key_here
   supabase secrets set FROM_EMAIL="Regis Marie Registrar <registrar@regismarie.edu.ph>"
   ```

5. **Connect it with a Database Webhook** (no code — done in the Supabase
   dashboard):
   - Go to **Database → Webhooks → Create a new webhook**
   - Table: `requests`
   - Events: `Update`
   - Type: `Supabase Edge Functions`
   - Function: `send-status-email`
   - Save.

That's it — from then on, every time a registrar updates a request's status
in `/registrar/requests`, the student gets an email and a matching row in
their in-app notifications. The email wording per status is defined near the
top of `index.ts` if you want to reword any of them.

## 6. Unlimited user sign-ups (fixing Supabase's email rate limit)

Supabase's **free built-in email sender** (used for verification/reset
emails) is capped very low — around 2–4 emails per **hour** — which is fine
for testing but will block real registrations once more than a couple of
students sign up around the same time. That's a Supabase mailer limit, not a
limit on how many user accounts you can have (accounts themselves are
unlimited on the free tier).

Fix: connect the same Resend account from section 5 as **custom SMTP**, so
Supabase stops using its own limited mailer entirely:

1. In Resend, go to **SMTP** (or **API Keys** → note your API key, Resend's
   SMTP username is `resend`, password is your API key).
2. In Supabase: **Authentication → Settings → SMTP Settings** → enable
   "Enable Custom SMTP" and fill in:
   - Host: `smtp.resend.com`
   - Port: `465` (or `587`)
   - Username: `resend`
   - Password: your Resend API key
   - Sender email: the same `FROM_EMAIL` you set as a secret in section 5
3. Save. From then on, verification/reset emails go through Resend's much
   higher limit (3,000/month free) instead of Supabase's built-in one, so
   registrations won't get blocked as more students sign up.

## Not included yet

- Nothing planned right now — the status-email flow above was the last gap.
