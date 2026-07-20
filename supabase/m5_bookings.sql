-- AppEase M5: booking engine
-- Run AFTER m3_admin.sql, in Supabase SQL Editor.

-- 1. Needed for the exclusion constraint (uuid equality inside gist)
create extension if not exists btree_gist;

-- 2. Booking status. Pay-at-salon v1: bookings are auto-confirmed on creation.
create type public.booking_status as enum
  ('confirmed', 'completed', 'cancelled', 'no_show');

-- 3. Bookings (price snapshotted at booking time)
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  stylist_id uuid not null references public.stylists (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  price numeric(10,2) not null,
  status public.booking_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- 4. HARD guarantee: no two active bookings can overlap for the same stylist.
--    Database-level — immune to race conditions between two customers.
alter table public.bookings add constraint no_double_booking
  exclude using gist (
    stylist_id with =,
    tsrange(
      (booking_date + start_time)::timestamp,
      (booking_date + end_time)::timestamp
    ) with &&
  )
  where (status = 'confirmed');

create index bookings_salon_date_idx on public.bookings (salon_id, booking_date);
create index bookings_stylist_date_idx on public.bookings (stylist_id, booking_date);
create index bookings_customer_idx on public.bookings (customer_id);

-- 5. RLS
alter table public.bookings enable row level security;

-- Customer creates own bookings, only as 'confirmed', only at approved salons
create policy "Customer books at approved salons"
  on public.bookings for insert
  with check (
    customer_id = auth.uid()
    and status = 'confirmed'
    and exists (
      select 1 from public.salons s
      where s.id = salon_id and s.status = 'approved'
    )
  );

-- Customer reads own bookings
create policy "Customer reads own bookings"
  on public.bookings for select
  using (customer_id = auth.uid());

-- Anyone authenticated can read booked ranges of approved salons
-- (needed to render the availability grid; contact info lives in profiles,
--  which stays protected)
create policy "Read booking slots of approved salons"
  on public.bookings for select
  using (exists (
    select 1 from public.salons s
    where s.id = salon_id and s.status = 'approved'
  ));

-- Salon owner reads bookings of own salon
create policy "Salon owner reads own salon bookings"
  on public.bookings for select
  using (public.is_salon_owner(salon_id));

-- Salon owner updates status of own salon's bookings (M7)
create policy "Salon owner updates own salon bookings"
  on public.bookings for update
  using (public.is_salon_owner(salon_id))
  with check (public.is_salon_owner(salon_id));

-- Customer may only cancel own bookings (M8): any update must end 'cancelled'
create policy "Customer cancels own booking"
  on public.bookings for update
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid() and status = 'cancelled');

-- 6. Salon owner can see contact info of customers who booked with them (M7)
create policy "Salon owner reads booker profiles"
  on public.profiles for select
  using (exists (
    select 1
    from public.bookings b
    join public.salons s on s.id = b.salon_id
    where b.customer_id = profiles.id and s.owner_id = auth.uid()
  ));
