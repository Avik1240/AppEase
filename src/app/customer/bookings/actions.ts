"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CancelResult = { ok: true } | { ok: false; error: string };

export async function cancelBooking(bookingId: string): Promise<CancelResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not logged in." };

  // RLS: customers may only flip their own bookings to 'cancelled'
  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId)
    .eq("customer_id", user.id)
    .eq("status", "confirmed");

  if (error) return { ok: false, error: error.message };
  revalidatePath("/customer/bookings");
  return { ok: true };
}
