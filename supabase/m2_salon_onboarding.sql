-- AppEase M2: salon onboarding schema
-- Run AFTER schema.sql, in Supabase SQL Editor.

-- 1. Salon status enum
create type public.salon_status as enum ('pending', 'approved', 'rejected');

-- 2. Salons
create table public.salons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text not null default '',
  address text not null,
  maps_link text not null default '',
  has_expert_pricing boolean not null default false,
  status public.salon_status not null default 'pending',
  rejection_reason text not null default '',
  photos text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (owner_id)
);

-- 3. Weekly hours (one row per open day; missing day = closed)
create table public.salon_hours (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sunday
  open_time time not null,
  close_time time not null,
  check (close_time > open_time),
  unique (salon_id, day_of_week)
);

-- 4. Stylists
create table public.stylists (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  name text not null,
  is_expert boolean not null default false,
  created_at timestamptz not null default now()
);

-- 5. Services (price in whole rupees; expert_price only if salon toggle on)
create table public.services (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons (id) on delete cascade,
  name text not null,
  category text not null default 'other',
  price numeric(10,2) not null check (price >= 0),
  expert_price numeric(10,2) check (expert_price >= 0),
  duration_minutes int not null default 30 check (duration_minutes between 5 and 480),
  created_at timestamptz not null default now()
);

-- 6. Helper: is the current user the owner of a salon?
create or replace function public.is_salon_owner(p_salon_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.salons s
    where s.id = p_salon_id and s.owner_id = auth.uid()
  );
$$;

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- 7. RLS
alter table public.salons enable row level security;
alter table public.salon_hours enable row level security;
alter table public.stylists enable row level security;
alter table public.services enable row level security;

-- Salons: owner can insert own, always as 'pending'
create policy "Owner inserts own salon as pending"
  on public.salons for insert
  with check (owner_id = auth.uid() and status = 'pending');

-- Owner reads own; anyone authenticated reads approved
create policy "Read own or approved salons"
  on public.salons for select
  using (owner_id = auth.uid() or status = 'approved' or public.is_admin());

-- Owner updates own but result must be 'pending' (cannot self-approve)
create policy "Owner updates own salon back to pending"
  on public.salons for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid() and status = 'pending');

-- Admin can update any salon (approve/reject) — M3
create policy "Admin updates any salon"
  on public.salons for update
  using (public.is_admin())
  with check (public.is_admin());

-- Child tables: owner full control; read if parent salon approved/own/admin
create policy "Owner manages hours" on public.salon_hours for all
  using (public.is_salon_owner(salon_id))
  with check (public.is_salon_owner(salon_id));
create policy "Read hours of visible salons" on public.salon_hours for select
  using (exists (
    select 1 from public.salons s where s.id = salon_id
      and (s.status = 'approved' or s.owner_id = auth.uid() or public.is_admin())
  ));

create policy "Owner manages stylists" on public.stylists for all
  using (public.is_salon_owner(salon_id))
  with check (public.is_salon_owner(salon_id));
create policy "Read stylists of visible salons" on public.stylists for select
  using (exists (
    select 1 from public.salons s where s.id = salon_id
      and (s.status = 'approved' or s.owner_id = auth.uid() or public.is_admin())
  ));

create policy "Owner manages services" on public.services for all
  using (public.is_salon_owner(salon_id))
  with check (public.is_salon_owner(salon_id));
create policy "Read services of visible salons" on public.services for select
  using (exists (
    select 1 from public.salons s where s.id = salon_id
      and (s.status = 'approved' or s.owner_id = auth.uid() or public.is_admin())
  ));

-- 8. Storage bucket for salon photos (public read)
insert into storage.buckets (id, name, public)
values ('salon-photos', 'salon-photos', true)
on conflict (id) do nothing;

create policy "Public read salon photos"
  on storage.objects for select
  using (bucket_id = 'salon-photos');

create policy "Owner uploads to own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'salon-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owner deletes own photos"
  on storage.objects for delete
  using (
    bucket_id = 'salon-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
