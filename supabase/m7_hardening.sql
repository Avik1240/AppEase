-- AppEase M7: prod hardening
-- Run AFTER m6_realtime.sql, in Supabase SQL Editor.
--
-- Fixes gaps where business rules were enforced only in application code,
-- not at the database layer:
--   1. Booking status transitions (a salon owner or customer hitting the
--      Supabase API directly, bypassing the Next.js server actions, could
--      previously set a booking to ANY status from ANY prior status).
--   2. Salon photo count (client capped uploads at 5, nothing stopped more
--      server-side).
--   3. Storage bucket accepted arbitrary file types/sizes for salon photos.

-- 1. Hard guarantee on booking status transitions, independent of which
--    RLS policy matched the request (owner vs customer). A trigger sees
--    the actual OLD/NEW row regardless of caller, so this holds even if
--    multiple permissive RLS policies combine in unexpected ways.
create or replace function public.enforce_booking_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new; -- no-op transition, always fine
  end if;

  if old.status = 'confirmed'
     and new.status in ('completed', 'cancelled', 'no_show') then
    return new;
  end if;

  raise exception 'Invalid booking status transition: % -> %', old.status, new.status
    using errcode = '22023'; -- invalid_parameter_value
end;
$$;

drop trigger if exists booking_status_transition_guard on public.bookings;
create trigger booking_status_transition_guard
  before update on public.bookings
  for each row
  when (old.status is distinct from new.status)
  execute function public.enforce_booking_status_transition();

-- 2. Cap salon photos at 5 in the DB, not just the onboarding form.
alter table public.salons
  add constraint salon_photos_max_five
  check (photos is null or array_length(photos, 1) <= 5);

-- 3. Restrict the salon-photos bucket to real images, 5MB max per file.
update storage.buckets
set file_size_limit = 5242880, -- 5 MB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'salon-photos';
