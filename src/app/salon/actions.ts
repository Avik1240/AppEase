"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingPayload } from "@/lib/types";

export type SubmitResult = { ok: true } | { ok: false; error: string };

function validate(p: OnboardingPayload): string | null {
  if (!p.name.trim()) return "Salon name is required.";
  if (!p.address.trim()) return "Address is required.";
  if (p.hours.length === 0) return "Set opening hours for at least one day.";
  if (p.stylists.length === 0) return "Add at least one stylist.";
  if (p.services.length === 0) return "Add at least one service.";
  for (const h of p.hours) {
    if (h.open_time >= h.close_time)
      return "Closing time must be after opening time.";
  }
  for (const s of p.stylists) {
    if (!s.name.trim()) return "Every stylist needs a name.";
  }
  for (const s of p.services) {
    if (!s.name.trim()) return "Every service needs a name.";
    if (s.price < 0) return "Price cannot be negative.";
    if (p.has_expert_pricing && (s.expert_price == null || s.expert_price < 0))
      return "Expert price required for every service when expert pricing is on.";
  }
  if (p.has_expert_pricing && !p.stylists.some((s) => s.is_expert))
    return "Expert pricing is on but no stylist is marked as expert.";
  return null;
}

export async function submitOnboarding(
  payload: OnboardingPayload
): Promise<SubmitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not logged in." };

  const validationError = validate(payload);
  if (validationError) return { ok: false, error: validationError };

  const { data: existing } = await supabase
    .from("salons")
    .select("id")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (existing) return { ok: false, error: "You already have a salon." };

  const { data: salon, error: salonError } = await supabase
    .from("salons")
    .insert({
      owner_id: user.id,
      name: payload.name.trim(),
      description: payload.description.trim(),
      address: payload.address.trim(),
      maps_link: payload.maps_link.trim(),
      has_expert_pricing: payload.has_expert_pricing,
      photos: payload.photos,
      status: "pending",
    })
    .select("id")
    .single();

  if (salonError || !salon)
    return { ok: false, error: salonError?.message ?? "Failed to create salon." };

  const salonId = salon.id;

  const { error: hoursError } = await supabase.from("salon_hours").insert(
    payload.hours.map((h) => ({
      salon_id: salonId,
      day_of_week: h.day_of_week,
      open_time: h.open_time,
      close_time: h.close_time,
    }))
  );
  if (hoursError) return { ok: false, error: hoursError.message };

  const { error: stylistError } = await supabase.from("stylists").insert(
    payload.stylists.map((s) => ({
      salon_id: salonId,
      name: s.name.trim(),
      is_expert: s.is_expert,
    }))
  );
  if (stylistError) return { ok: false, error: stylistError.message };

  const { error: serviceError } = await supabase.from("services").insert(
    payload.services.map((s) => ({
      salon_id: salonId,
      name: s.name.trim(),
      category: s.category,
      price: s.price,
      expert_price: payload.has_expert_pricing ? s.expert_price : null,
      duration_minutes: s.duration_minutes,
    }))
  );
  if (serviceError) return { ok: false, error: serviceError.message };

  revalidatePath("/salon");
  return { ok: true };
}
