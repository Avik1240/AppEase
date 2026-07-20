"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Not logged in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { supabase, error: "Not an admin." };
  return { supabase, error: null };
}

export async function approveSalon(
  salonId: string
): Promise<AdminActionResult> {
  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };

  const { error: updateError } = await supabase
    .from("salons")
    .update({ status: "approved", rejection_reason: "" })
    .eq("id", salonId);

  if (updateError) return { ok: false, error: updateError.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function rejectSalon(
  salonId: string,
  reason: string
): Promise<AdminActionResult> {
  const { supabase, error } = await requireAdmin();
  if (error) return { ok: false, error };
  if (!reason.trim())
    return { ok: false, error: "A rejection reason is required." };

  const { error: updateError } = await supabase
    .from("salons")
    .update({ status: "rejected", rejection_reason: reason.trim() })
    .eq("id", salonId);

  if (updateError) return { ok: false, error: updateError.message };
  revalidatePath("/admin");
  return { ok: true };
}
