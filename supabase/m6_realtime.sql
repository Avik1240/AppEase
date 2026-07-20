-- AppEase M6: real-time booking sync
-- Run AFTER m5_bookings.sql, in Supabase SQL Editor.

-- Add bookings to the realtime publication (RLS still applies to subscribers)
alter publication supabase_realtime add table public.bookings;
