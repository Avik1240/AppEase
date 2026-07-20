"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ROLE_HOME: Record<string, string> = {
  customer: "/customer",
  salon: "/salon",
  admin: "/admin",
};

export type AuthState = { error: string } | null;

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) return { error: error.message };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  redirect(ROLE_HOME[profile?.role ?? "customer"]);
}

export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const supabase = await createClient();

  const role = String(formData.get("role") ?? "customer");
  // Admin accounts are never self-serve — created manually in Supabase.
  if (role !== "customer" && role !== "salon") {
    return { error: "Invalid role." };
  }

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!fullName) return { error: "Name is required." };
  if (!phone) return { error: "Phone number is required." };

  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    options: {
      data: { role, full_name: fullName, phone },
    },
  });

  if (error) return { error: error.message };

  redirect(ROLE_HOME[role]);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
