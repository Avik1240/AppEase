-- AppEase M3: admin needs to read salon owners' profiles (name/phone)
-- Run AFTER m2_salon_onboarding.sql, in Supabase SQL Editor.

create policy "Admin reads all profiles"
  on public.profiles for select
  using (public.is_admin());
