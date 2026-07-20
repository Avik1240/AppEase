"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/types";

export type StatusResult = { ok: true } | { ok: false; error: string };

const ALLOWED: BookingStatus[] = ["completed", "cancelled", "no_show"];

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<StatusResult> {
  if (!ALLOWED.includes(status))
    return { ok: false, error: "Invalid status." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not logged in." };

  // RLS restricts this to the salon owner's own bookings
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", bookingId)
    .eq("status", "confirmed"); // only open bookings can transition

  if (error) return { ok: false, error: error.message };
  revalidatePath("/salon");
  return { ok: true };
}
