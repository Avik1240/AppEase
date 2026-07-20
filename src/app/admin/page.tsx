import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/components/LogoutButton";
import SalonReviewCard from "./SalonReviewCard";
import type { Salon, SalonHour, Service, Stylist } from "@/lib/types";

type SalonWithOwner = Salon & {
  profiles: { full_name: string; phone: string } | null;
};

export default async function AdminHome() {
  const supabase = await createClient();

  const [{ data: pendingSalons }, { count: approvedCount }, { count: rejectedCount }] =
    await Promise.all([
      supabase
        .from("salons")
        .select("*, profiles(full_name, phone)")
        .eq("status", "pending")
        .order("created_at")
        .returns<SalonWithOwner[]>(),
      supabase
        .from("salons")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("salons")
        .select("id", { count: "exact", head: true })
        .eq("status", "rejected"),
    ]);

  const salonIds = (pendingSalons ?? []).map((s) => s.id);

  const [{ data: hours }, { data: stylists }, { data: services }] =
    salonIds.length > 0
      ? await Promise.all([
          supabase.from("salon_hours").select("*").in("salon_id", salonIds).order("day_of_week").returns<SalonHour[]>(),
          supabase.from("stylists").select("*").in("salon_id", salonIds).returns<Stylist[]>(),
          supabase.from("services").select("*").in("salon_id", salonIds).returns<Service[]>(),
        ])
      : [{ data: [] as SalonHour[] }, { data: [] as Stylist[] }, { data: [] as Service[] }];

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Salon approvals</h1>
          <p className="mt-1 text-sm text-smoke">
            {pendingSalons?.length ?? 0} pending · {approvedCount ?? 0} approved ·{" "}
            {rejectedCount ?? 0} rejected
          </p>
        </div>
        <LogoutButton />
      </header>

      <div className="mt-8 flex flex-col gap-6">
        {(pendingSalons ?? []).map((salon) => (
          <SalonReviewCard
            key={salon.id}
            salon={salon}
            hours={(hours ?? []).filter((h) => h.salon_id === salon.id)}
            stylists={(stylists ?? []).filter((s) => s.salon_id === salon.id)}
            services={(services ?? []).filter((s) => s.salon_id === salon.id)}
            ownerName={salon.profiles?.full_name ?? "Unknown"}
            ownerPhone={salon.profiles?.phone ?? "—"}
          />
        ))}
        {(pendingSalons ?? []).length === 0 && (
          <div className="rounded-xl border border-dashed border-white/10 p-12 text-center text-smoke">
            No salons waiting for approval.
          </div>
        )}
      </div>
    </main>
  );
}
