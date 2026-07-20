"use server";

import { createClient } from "@/lib/supabase/server";
import { computeSlots, type TimeRange } from "@/lib/slots";
import type { SalonHour, Service, Stylist } from "@/lib/types";

export type BookedRangesResult =
  | { ok: true; ranges: TimeRange[] }
  | { ok: false; error: string };

export async function getBookedRanges(
  stylistId: string,
  date: string
): Promise<BookedRangesResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("stylist_id", stylistId)
    .eq("booking_date", date)
    .eq("status", "confirmed");

  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    ranges: (data ?? []).map((b) => ({
      start: String(b.start_time).slice(0, 5),
      end: String(b.end_time).slice(0, 5),
    })),
  };
}

export type CreateBookingResult = { ok: true } | { ok: false; error: string };

export async function createBooking(input: {
  salonId: string;
  stylistId: string;
  serviceId: string;
  date: string; // "YYYY-MM-DD"
  start: string; // "HH:MM"
  rescheduleBookingId?: string; // old booking to cancel once the new one lands
}): Promise<CreateBookingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not logged in." };

  // Load everything server-side — never trust client-provided prices/durations
  const [{ data: service }, { data: stylist }, { data: salon }] =
    await Promise.all([
      supabase.from("services").select("*").eq("id", input.serviceId).eq("salon_id", input.salonId).maybeSingle<Service>(),
      supabase.from("stylists").select("*").eq("id", input.stylistId).eq("salon_id", input.salonId).maybeSingle<Stylist>(),
      supabase.from("salons").select("id, status, has_expert_pricing").eq("id", input.salonId).maybeSingle<{ id: string; status: string; has_expert_pricing: boolean }>(),
    ]);

  if (!salon || salon.status !== "approved")
    return { ok: false, error: "Salon not found." };
  if (!service) return { ok: false, error: "Service not found." };
  if (!stylist) return { ok: false, error: "Stylist not found." };

  // Validate date is today..+14 days
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const chosen = new Date(`${input.date}T00:00:00`);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 14);
  if (isNaN(chosen.getTime()) || chosen < today || chosen > maxDate)
    return { ok: false, error: "Invalid date." };

  // Salon hours for that weekday
  const dow = chosen.getDay();
  const { data: hour } = await supabase
    .from("salon_hours")
    .select("*")
    .eq("salon_id", input.salonId)
    .eq("day_of_week", dow)
    .maybeSingle<SalonHour>();
  if (!hour) return { ok: false, error: "Salon is closed that day." };

  // Recompute availability server-side
  const rangesResult = await getBookedRanges(input.stylistId, input.date);
  if (!rangesResult.ok) return { ok: false, error: rangesResult.error };

  const isToday = chosen.getTime() === today.getTime();
  const now = new Date();
  const notBefore = isToday
    ? `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    : null;

  const slots = computeSlots(
    hour.open_time.slice(0, 5),
    hour.close_time.slice(0, 5),
    service.duration_minutes,
    rangesResult.ranges,
    notBefore
  );
  const slot = slots.find((s) => s.start === input.start);
  if (!slot || !slot.available)
    return { ok: false, error: "That slot is no longer available." };

  // Price snapshot: expert price only if salon tier is on AND stylist is expert
  const price =
    salon.has_expert_pricing && stylist.is_expert && service.expert_price != null
      ? service.expert_price
      : service.price;

  const { error } = await supabase.from("bookings").insert({
    salon_id: input.salonId,
    stylist_id: input.stylistId,
    service_id: input.serviceId,
    customer_id: user.id,
    booking_date: input.date,
    start_time: slot.start,
    end_time: slot.end,
    price,
    status: "confirmed",
  });

  if (error) {
    // 23P01 = exclusion constraint violation → someone booked it first
    if (error.code === "23P01")
      return { ok: false, error: "That slot was just booked by someone else." };
    return { ok: false, error: error.message };
  }

  // Reschedule: only cancel the old booking now that the new one is safely
  // in. Best-effort — if this fails (e.g. it was already cancelled, or
  // belongs to someone else), the new booking still stands; we don't want
  // a customer to lose a confirmed slot over a cleanup step.
  if (input.rescheduleBookingId) {
    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", input.rescheduleBookingId)
      .eq("customer_id", user.id)
      .eq("status", "confirmed");
  }

  return { ok: true };
}
