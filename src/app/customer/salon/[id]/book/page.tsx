import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Salon, SalonHour, Service, Stylist } from "@/lib/types";
import BookingClient from "./BookingClient";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ service?: string; stylist?: string }>;
};

export default async function BookPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { service: preService, stylist: preStylist } = await searchParams;
  const supabase = await createClient();

  const { data: salon } = await supabase
    .from("salons")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .maybeSingle<Salon>();

  if (!salon) notFound();

  const [{ data: hours }, { data: stylists }, { data: services }] =
    await Promise.all([
      supabase.from("salon_hours").select("*").eq("salon_id", id).order("day_of_week").returns<SalonHour[]>(),
      supabase.from("stylists").select("*").eq("salon_id", id).order("created_at").returns<Stylist[]>(),
      supabase.from("services").select("*").eq("salon_id", id).order("created_at").returns<Service[]>(),
    ]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link
        href={`/customer/salon/${id}`}
        className="text-sm text-smoke hover:text-ivory hover:underline"
      >
        ← Back to {salon.name}
      </Link>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
        Book a slot
      </h1>
      <div className="mt-6">
        <BookingClient
          salon={salon}
          services={services ?? []}
          stylists={stylists ?? []}
          hours={hours ?? []}
          preService={preService}
          preStylist={preStylist}
        />
      </div>
    </main>
  );
}
