import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Parallax from "@/components/Parallax";
import {
  DAY_NAMES,
  type Salon,
  type SalonHour,
  type Service,
  type Stylist,
} from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export default async function SalonDetailPage({ params }: Props) {
  const { id } = await params;
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
    <main className="min-h-screen">
      {/* Cover with subtle parallax drift behind the info card */}
      <div className="relative h-56 overflow-hidden sm:h-72">
        <Parallax speed={0.5} className="absolute inset-0 -bottom-16">
          {salon.photos[0] ? (
            <Image
              src={salon.photos[0]}
              alt={salon.name}
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-70"
            />
          ) : (
            <div className="placeholder-photo h-[120%] w-full" />
          )}
        </Parallax>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto -mt-20 w-full max-w-4xl px-4 pb-16">
        <Link
          href="/customer"
          className="text-sm text-smoke hover:text-ivory hover:underline"
        >
          ← Back to salons
        </Link>

        <div className="card reveal mt-3 p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-3xl font-semibold sm:text-4xl">
                {salon.name}
              </h1>
              <p className="mt-2 text-smoke">{salon.address}</p>
              {salon.maps_link && (
                <a
                  href={salon.maps_link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-brass underline hover:text-brass-soft"
                >
                  Open in Google Maps
                </a>
              )}
            </div>
            <Link
              href={`/customer/salon/${salon.id}/book`}
              className="btn-brass w-full sm:w-auto"
            >
              Book slot
            </Link>
          </div>
          {salon.description && (
            <p className="mt-4 text-sm text-smoke sm:text-base">
              {salon.description}
            </p>
          )}
        </div>

        {salon.photos.length > 1 && (
          <section className="reveal reveal-1 mt-6 flex gap-3 overflow-x-auto pb-2">
            {salon.photos.slice(1).map((url) => (
              <Image
                key={url}
                src={url}
                alt={salon.name}
                width={240}
                height={160}
                className="h-40 w-60 flex-shrink-0 rounded-2xl object-cover"
              />
            ))}
          </section>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <section className="card reveal reveal-1 p-5 sm:p-6 md:col-span-2">
            <h2 className="font-display text-xl font-semibold">
              Services & pricing
            </h2>
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
                    <th className="py-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {(services ?? []).map((s) => (
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

          <div className="flex flex-col gap-6">
            <section className="card reveal reveal-2 p-5 sm:p-6">
              <h2 className="font-display text-xl font-semibold">Stylists</h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {(stylists ?? []).map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2">
                    <span>{s.name}</span>
                    {salon.has_expert_pricing && s.is_expert && (
                      <span className="badge-brass">Expert</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>

            <section className="card reveal reveal-3 p-5 sm:p-6">
              <h2 className="font-display text-xl font-semibold">Hours</h2>
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
          </div>
        </div>
      </div>
    </main>
  );
}
