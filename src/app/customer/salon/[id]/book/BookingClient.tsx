"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeSlots, type TimeRange } from "@/lib/slots";
import {
  DAY_NAMES,
  type Salon,
  type SalonHour,
  type Service,
  type Stylist,
} from "@/lib/types";
import { createBooking, getBookedRanges } from "./actions";

type Props = {
  salon: Salon;
  services: Service[];
  stylists: Stylist[];
  hours: SalonHour[];
  preService?: string;
  preStylist?: string;
  rescheduleId?: string;
};

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function BookingClient({
  salon,
  services,
  stylists,
  hours,
  preService,
  preStylist,
  rescheduleId,
}: Props) {
  const router = useRouter();
  const [serviceId, setServiceId] = useState(
    services.some((s) => s.id === preService) ? preService! : (services[0]?.id ?? "")
  );
  const [stylistId, setStylistId] = useState(
    stylists.some((s) => s.id === preStylist) ? preStylist! : (stylists[0]?.id ?? "")
  );
  const [date, setDate] = useState(fmtDate(new Date()));
  const [booked, setBooked] = useState<TimeRange[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const service = services.find((s) => s.id === serviceId);
  const stylist = stylists.find((s) => s.id === stylistId);

  const dates = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }, []);

  const dayHour = useMemo(() => {
    const dow = new Date(`${date}T00:00:00`).getDay();
    return hours.find((h) => h.day_of_week === dow) ?? null;
  }, [date, hours]);

  const loadBooked = useCallback(async () => {
    setBooked(null);
    setSelectedSlot(null);
    const r = await getBookedRanges(stylistId, date);
    if (r.ok) setBooked(r.ranges);
    else setError(r.error);
  }, [stylistId, date]);

  useEffect(() => {
    if (stylistId && date) void loadBooked();
  }, [stylistId, date, loadBooked]);

  const slots = useMemo(() => {
    if (!service || booked == null) return [];
    const isToday = date === fmtDate(new Date());
    const now = new Date();
    const notBefore = isToday
      ? `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
      : null;
    return computeSlots(
      dayHour ? dayHour.open_time.slice(0, 5) : null,
      dayHour ? dayHour.close_time.slice(0, 5) : null,
      service.duration_minutes,
      booked,
      notBefore
    );
  }, [service, booked, dayHour, date]);

  const priceFor = (svc: Service) =>
    salon.has_expert_pricing && stylist?.is_expert && svc.expert_price != null
      ? svc.expert_price
      : svc.price;

  async function handleConfirm() {
    if (!selectedSlot) return;
    setError("");
    setSubmitting(true);
    const r = await createBooking({
      salonId: salon.id,
      stylistId,
      serviceId,
      date,
      start: selectedSlot,
      rescheduleBookingId: rescheduleId,
    });
    setSubmitting(false);
    if (!r.ok) {
      setError(r.error);
      void loadBooked();
      return;
    }
    setSuccess(true);
  }

  /* The confirmation moment: the amber spotlight settles on the ticket */
  if (success) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-brass/30 bg-charcoal p-8 text-center sm:p-12">
        <div
          aria-hidden
          className="glow-settle pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 45%, rgba(201,162,75,0.22), transparent 70%)",
          }}
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brass">
            Confirmed
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
            Your slot is booked
          </h2>
          <div className="mx-auto mt-6 inline-block rounded-xl border border-dashed border-brass/40 bg-ink px-6 py-4 font-mono text-sm">
            <div className="text-smoke">{service?.name} · {stylist?.name}</div>
            <div className="mt-1 text-lg text-brass">
              {date} · {selectedSlot}
            </div>
            <div className="mt-1 text-smoke">₹{service ? priceFor(service) : ""} — pay at the salon</div>
          </div>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => router.push("/customer/bookings")} className="btn-brass">
              View my bookings
            </button>
            <button onClick={() => router.push("/customer")} className="btn-ghost">
              Back to salons
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-28 sm:pb-0">
      {/* 1. Service */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">1. Choose a service</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id)}
              className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm transition duration-200 ${
                serviceId === s.id
                  ? "border-brass bg-brass/10 text-ivory"
                  : "border-white/10 hover:border-brass/50"
              }`}
            >
              <span className="min-w-0">
                {s.name}
                <span className="font-mono text-smoke"> · {s.duration_minutes}m</span>
              </span>
              <span className="font-mono font-medium text-brass">₹{priceFor(s)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Stylist */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">2. Choose a stylist</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {stylists.map((s) => (
            <button
              key={s.id}
              onClick={() => setStylistId(s.id)}
              className={`min-h-11 rounded-xl border px-4 py-2.5 text-sm transition duration-200 ${
                stylistId === s.id
                  ? "border-brass bg-brass/10 text-ivory"
                  : "border-white/10 hover:border-brass/50"
              }`}
            >
              {s.name}
              {salon.has_expert_pricing && s.is_expert && (
                <span className="ml-1.5 text-brass">★</span>
              )}
            </button>
          ))}
        </div>
        {salon.has_expert_pricing && stylist?.is_expert && (
          <p className="mt-2 text-xs text-smoke">
            ★ Expert stylist — expert pricing applies.
          </p>
        )}
      </section>

      {/* 3. Date */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">3. Pick a date</h2>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
          {dates.map((d) => {
            const v = fmtDate(d);
            const dow = d.getDay();
            const closed = !hours.some((h) => h.day_of_week === dow);
            return (
              <button
                key={v}
                disabled={closed}
                onClick={() => setDate(v)}
                className={`flex min-h-11 min-w-16 flex-col items-center justify-center rounded-xl border px-3 py-2 transition duration-200 ${
                  date === v
                    ? "border-brass bg-brass/10 text-ivory"
                    : closed
                      ? "cursor-not-allowed border-white/5 text-smoke/40"
                      : "border-white/10 hover:border-brass/50"
                }`}
              >
                <span className="text-[11px] uppercase tracking-wide text-smoke">
                  {DAY_NAMES[dow].slice(0, 3)}
                </span>
                <span className="font-mono font-medium">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Slots — ticket stubs, monospace, precise motion only */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">4. Pick a slot</h2>
        {booked == null ? (
          <p className="mt-3 text-sm text-smoke">Loading slots…</p>
        ) : slots.length === 0 ? (
          <p className="mt-3 text-sm text-smoke">
            {dayHour
              ? "No slots fit this service on that day."
              : "Salon is closed that day."}
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {slots.map((s) => (
              <button
                key={s.start}
                disabled={!s.available}
                onClick={() => setSelectedSlot(s.start)}
                className={`min-h-11 rounded-lg border px-2 py-2.5 font-mono text-sm transition duration-150 ${
                  selectedSlot === s.start
                    ? "border-brass bg-brass text-ink shadow-[0_0_16px_rgba(201,162,75,0.4)]"
                    : s.available
                      ? "border-white/10 text-ivory hover:border-brass/60 hover:text-brass"
                      : "cursor-not-allowed border-white/5 text-smoke/40 line-through"
                }`}
              >
                {s.start}
              </button>
            ))}
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-xl border border-wine-soft/40 bg-wine/15 px-4 py-3 text-sm text-wine-soft">
          {error}
        </p>
      )}

      {/* Bottom-anchored primary action on mobile; inline on desktop */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink/95 p-4 backdrop-blur sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          onClick={handleConfirm}
          disabled={!selectedSlot || submitting}
          className="btn-brass w-full"
        >
          {submitting
            ? "Booking…"
            : selectedSlot && service
              ? `Confirm ${selectedSlot} — ₹${priceFor(service)}`
              : "Select a slot"}
        </button>
      </div>
    </div>
  );
}
