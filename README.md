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

## Deploy (Vercel free tier)

1. Push this folder to a GitHub repo
2. vercel.com → Add New Project → import the repo (Next.js auto-detected)
3. Environment variables: add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (same values as `.env.local`)
4. Deploy → public URL live