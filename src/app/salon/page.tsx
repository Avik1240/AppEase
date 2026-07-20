import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getSessionIdentity } from "@/lib/supabase/session";
import LogoutButton from "@/components/LogoutButton";
import OnboardingForm from "./OnboardingForm";
import BookingsPanel, { type BookingRow } from "./BookingsPanel";
import {
  DAY_NAMES,
  type Salon,
  type SalonHour,
  type Service,
  type Stylist,
} from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  pending: "border-brass/40 bg-brass/10 text-brass",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  rejected: "border-wine-soft/50 bg-wine/15 text-wine-soft",
};

export default async function SalonHome() {
  const supabase = await createClient();
  const identity = await getSessionIdentity();
  const userId = identity!.id;

  const { data: salon } = await supabase
    .from("salons")
    .select("*")
    .eq("owner_id", userId)
    .maybeSingle<Salon>();

  if (!salon) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">
              Set up your salon
            </h1>
            <p className="mt-1 text-sm text-smoke">
              Fill this once — your salon goes live after admin approval.
            </p>
          </div>
          <LogoutButton />
        </header>
        <div className="mt-8">
          <OnboardingForm userId={userId} />
        </div>
      </main>
    );
  }

  const [{ data: hours }, { data: stylists }, { data: services }, { data: bookings }] =
    await Promise.all([
      supabase.from("salon_hours").select("*").eq("salon_id", salon.id).order("day_of_week").returns<SalonHour[]>(),
      supabase.from("stylists").select("*").eq("salon_id", salon.id).returns<Stylist[]>(),
      supabase.from("services").select("*").eq("salon_id", salon.id).returns<Service[]>(),
      supabase
        .from("bookings")
        .select("id, booking_date, start_time, end_time, price, status, services(name), stylists(name), profiles(full_name, phone)")
        .eq("salon_id", salon.id)
        .order("booking_date", { ascending: true })
        .order("start_time", { ascending: true })
        .returns<BookingRow[]>(),
    ]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            {salon.name}
          </h1>
          <p className="mt-1 text-sm text-smoke">
            Owner: {identity?.fullName} · {salon.address}
          </p>
        </div>
        <LogoutButton />
      </header>

      <div
        className={`mt-6 rounded-xl border px-4 py-3 text-sm font-medium ${STATUS_STYLES[salon.status]}`}
      >
        Status: {salon.status.toUpperCase()}
        {salon.status === "pending" && " — awaiting admin approval"}
        {salon.status === "rejected" &&
          salon.rejection_reason &&
          ` — ${salon.rejection_reason}`}
      </div>

      {salon.photos.length > 0 && (
        <section className="mt-6 flex gap-3 overflow-x-auto pb-2">
          {salon.photos.map((url) => (
            <Image
              key={url}
              src={url}
              alt="Salon photo"
              width={192}
              height={128}
              className="h-32 w-48 flex-shrink-0 rounded-xl object-cover"
            />
          ))}
        </section>
      )}

      <div className="mt-8">
        {salon.status === "approved" ? (
          <BookingsPanel salonId={salon.id} bookings={bookings ?? []} />
        ) : (
          <section className="card border-dashed p-8 text-center text-sm text-smoke">
            Bookings open once your salon is approved.
          </section>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Opening hours</h2>
          <ul className="mt-3 flex flex-col gap-1.5 text-sm">
            {DAY_NAMES.map((day, i) => {
              const h = hours?.find((x) => x.day_of_week === i);
              return (
                <li key={day} className="flex justify-between gap-2">
                  <span className="text-smoke">{day}</span>
                  <span className={`font-mono ${h ? "" : "text-smoke/50"}`}>
                    {h
                      ? `${h.open_time.slice(0, 5)}–${h.close_time.slice(0, 5)}`
                      : "Closed"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Stylists</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {stylists?.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span>{s.name}</span>
                {s.is_expert && <span className="badge-brass">Expert</span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-smoke">
            Expert pricing: {salon.has_expert_pricing ? "on" : "off"}
          </p>
        </section>

        <section className="card p-5 sm:p-6 md:col-span-2">
          <h2 className="font-display text-lg font-semibold">Services</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-smoke">
                  <th className="py-2 pr-3 font-medium">Service</th>
                  <th className="py-2 pr-3 font-medium">Category</th>
                  <th className="py-2 pr-3 font-medium">Price</th>
                  {salon.has_expert_pricing && (
                    <th className="py-2 pr-3 font-medium">Expert</th>
                  )}
                  <th className="py-2 font-medium">Duration</th>
                </tr>
              </thead>
              <tbody>
                {services?.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2.5 pr-3">{s.name}</td>
                    <td className="py-2.5 pr-3 capitalize text-smoke">{s.category}</td>
                    <td className="py-2.5 pr-3 font-mono text-brass">₹{s.price}</td>
                    {salon.has_expert_pricing && (
                      <td className="py-2.5 pr-3 font-mono text-brass-soft">
                        {s.expert_price != null ? `₹${s.expert_price}` : "—"}
                      </td>
                    )}
                    <td className="py-2.5 font-mono text-smoke">
                      {s.duration_minutes}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
