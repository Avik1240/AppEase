-- AppEase M1 schema: profiles + roles
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query).

-- 1. Role enum
create type public.user_role as enum ('customer', 'salon', 'admin');

-- 2. Profiles table (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

-- 3. Auto-create profile on signup.
--    Role comes from signup metadata but 'admin' can NEVER be self-assigned.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data ->> 'role', 'customer');
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    case
      when requested_role in ('customer', 'salon')
        then requested_role::public.user_role
      else 'customer'::public.user_role
    end,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Row Level Security
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile (not role)"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (
    select p.role from public.profiles p where p.id = auth.uid()
  ));

-- 5. Creating the admin (internal use — run manually):
--    a) Sign up normally in the app (as customer), then:
--    update public.profiles set role = 'admin' where id = 'THE_USER_UUID';
