# AppEase — Salon Booking Platform

Two-sided salon booking: salons onboard stylists/services/pricing, customers book real slots, updates sync in real time. Spec: `AppEase.md` (project doc).

## Decisions locked (v1)

- Salon hours apply to all stylists (no per-stylist hours)
- Pay-at-salon (no online payment)
- No ratings/reviews in v1
- Service categories: seeded defaults + salon can add custom

## Stack

Next.js (App Router, TS) + Tailwind v4 · Supabase (Postgres, Auth, Realtime, Storage) · Vercel

## Setup

1. `npm install`
2. Create a free Supabase project at supabase.com
3. Run `supabase/schema.sql` in Supabase SQL Editor
4. Supabase Dashboard → Authentication → Providers → Email → **disable "Confirm email"** (v1 uses instant signup)
5. Copy `.env.local.example` → `.env.local`, fill URL + anon key from Settings → API
6. `npm run dev`

## Admin account

Sign up normally, then in SQL Editor:
`update public.profiles set role = 'admin' where id = 'USER_UUID';`

## Milestone status

- [x] M1 — Auth & roles (customer/salon/admin signup, login, role-based routing)
- [x] M2 — Salon onboarding (profile, hours, stylists, services, expert pricing, photos)
- [x] M3 — Admin approval (pending queue, approve/reject with reason)
- [x] M4 — Customer discovery (browse/search/filter, salon detail page)
- [x] M5 — Booking engine (slot grid, triple-layer double-booking protection)
- [x] M6 — Real-time sync (bookings appear on salon dashboard without refresh)
- [x] M7 — Salon dashboard (customer contact, done/no-show/cancel)
- [x] M8 — Customer booking management (upcoming/past, cancel, reschedule)
- [x] M9 — Polish & deploy (error/404/loading pages; deploy: see below)

## SQL migrations (run in order, Supabase SQL Editor)

1. `supabase/schema.sql` — profiles + roles
2. `supabase/m2_salon_onboarding.sql` — salons, hours, stylists, services, storage
3. `supabase/m3_admin.sql` — admin profile access
4. `supabase/m5_bookings.sql` — bookings + no-double-booking constraint
5. `supabase/m6_realtime.sql` — realtime publication
6. `supabase/m7_hardening.sql` — **required before going live.** Locks booking
   status transitions at the DB level (not just app code), caps salon photos
   at 5 server-side, and restricts the `salon-photos` bucket to real image
   types under 5MB. See "Prod hardening" below for what this closes.

## Prod hardening (M7)

Before this migration, business rules like "a booking can only go
confirmed → completed/cancelled/no_show" were enforced only in the Next.js
server actions — anyone calling the Supabase REST/JS API directly (a salon
owner's browser devtools, a leaked anon key, a bug) could set a booking to
any status from any prior status, or upload unlimited/oversized files to
the photos bucket. `m7_hardening.sql` adds:

- A `before update` trigger on `bookings` that rejects any status
  transition other than `confirmed → {completed, cancelled, no_show}`,
  enforced regardless of which RLS policy matched the caller.
- A check constraint capping `salons.photos` at 5 entries.
- A 5MB / image-only file limit on the `salon-photos` storage bucket.

Also fixed in this pass (no migration needed, code-only):

- Salon search (`/customer`) previously built a raw PostgREST filter string
  from the search box — a comma or parenthesis in the query could inject
  extra filter clauses. Input is now escaped and length-capped.
- Rescheduling a booking used to cancel the original slot *before*
  confirming the new one — abandoning the flow lost the booking with
  nothing to fall back on. It now cancels the old booking only after the
  new one is successfully created.
- `npm run lint` had no ESLint config or dependency behind it at all (would
  fail/prompt on first run). Added `eslint.config.mjs` + `eslint-config-next`.
- `src/lib/slots.ts` (the core double-booking/availability math) had zero
  tests despite being pure and self-described as unit-testable. Added
  `npm test` (Vitest) covering closed days, partial-fit durations, overlap
  detection, and the "today" time cutoff.

## Keeping the free Supabase project awake

Supabase pauses free-tier projects after 7 days with no database activity.
`.github/workflows/keep-supabase-alive.yml` runs a trivial read against the
REST API every 3 days via GitHub Actions (server-side, independent of any
local machine) to keep it under that threshold. It needs two repo secrets —
GitHub repo → Settings → Secrets and variables → Actions → New repository
secret:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

(same values as `.env.local` / your Vercel env vars). You can also trigger
it manually any time from the repo's Actions tab → "Keep Supabase awake" →
Run workflow.

## Testing

`npm test` runs the Vitest suite (currently: `src/lib/slots.ts`, the pure
slot-availability logic every booking depends on). Run this — and
`npx tsc --noEmit` — before every deploy.

## Deploy (Vercel free tier)

1. Run all SQL migrations above **in order, including `m7_hardening.sql`**.
2. Supabase Dashboard → Authentication → Providers → Email → disable
   "Confirm email" (v1 uses instant signup).
3. Push this folder to a GitHub repo.
4. vercel.com → Add New Project → import the repo (Next.js auto-detected).
5. Environment variables: add `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as `.env.local`).
6. Locally, before deploying: `npm run lint && npx tsc --noEmit && npm test
   && npm run build` — confirm all four pass clean.
7. Deploy → public URL live.
8. Bootstrap the first admin: sign up normally through the app (any role),
   then in SQL Editor: `update public.profiles set role = 'admin' where id
   = 'USER_UUID';`. Nothing in the admin queue is reachable until this is
   done at least once.