"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BookingStatus } from "@/lib/types";
import { cancelBooking } from "./actions";

export type CustomerBookingRow = {
  id: string;
  salon_id: string;
  service_id: string;
  stylist_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  price: number;
  status: BookingStatus;
  salons: { name: string; address: string } | null;
  services: { name: string } | null;
  stylists: { name: string } | null;
};

const STATUS_BADGE: Record<BookingStatus, string> = {
  confirmed: "badge-brass",
  completed:
    "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400",
  cancelled: "badge-smoke",
  no_show: "badge-wine",
};

function Card({
  b,
  onCancel,
  onReschedule,
  pending,
}: {
  b: CustomerBookingRow;
  onCancel?: (id: string) => void;
  onReschedule?: (b: CustomerBookingRow) => void;
  pending: boolean;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold">
            {b.salons?.name ?? "Salon"}
          </h3>
          <p className="text-sm text-smoke">
            {b.services?.name} with {b.stylists?.name}
          </p>
          <p className="mt-1.5 font-mono text-sm">
            {b.booking_date} · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)} ·{" "}
            <span className="text-brass">₹{b.price}</span>
          </p>
        </div>
        <span className={STATUS_BADGE[b.status]}>{b.status.replace("_", "-")}</span>
      </div>
      {(onCancel || onReschedule) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {onReschedule && (
            <button
              disabled={pending}
              onClick={() => onReschedule(b)}
              className="btn-ghost px-4 py-2 text-sm"
            >
              Reschedule
            </button>
          )}
          {onCancel && (
            <button
              disabled={pending}
              onClick={() => onCancel(b.id)}
              className="btn-wine px-4 py-2 text-sm"
            >
              Cancel booking
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CustomerBookings({
  bookings,
}: {
  bookings: CustomerBookingRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter(
    (b) => b.status === "confirmed" && b.booking_date >= today
  );
  const past = bookings.filter(
    (b) => !(b.status === "confirmed" && b.booking_date >= today)
  );

  function handleCancel(id: string) {
    if (!confirm("Cancel this booking?")) return;
    setError("");
    startTransition(async () => {
      const r = await cancelBooking(id);
      if (!r.ok) setError(r.error);
    });
  }

  function handleReschedule(b: CustomerBookingRow) {
    // Do NOT cancel the existing booking here. If the customer picks a new
    // slot and confirms, the booking server action cancels this one only
    // after the new booking is successfully created — so abandoning the
    // reschedule flow (closing the tab, going back) leaves the original
    // booking intact instead of silently losing the slot.
    router.push(
      `/customer/salon/${b.salon_id}/book?service=${b.service_id}&stylist=${b.stylist_id}&reschedule=${b.id}`
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <p className="rounded-xl border border-wine-soft/40 bg-wine/15 px-4 py-3 text-sm text-wine-soft">
          {error}
        </p>
      )}

      <section className="reveal">
        <h2 className="font-display text-xl font-semibold">Upcoming</h2>
        <div className="mt-3 flex flex-col gap-3">
          {upcoming.map((b) => (
            <Card
              key={b.id}
              b={b}
              pending={pending}
              onCancel={handleCancel}
              onReschedule={handleReschedule}
            />
          ))}
          {upcoming.length === 0 && (
            <div className="card border-dashed p-8 text-center text-sm text-smoke">
              No upcoming bookings.{" "}
              <Link href="/customer" className="text-brass underline">
                Find a salon
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="reveal reveal-1">
        <h2 className="font-display text-xl font-semibold">Past & cancelled</h2>
        <div className="mt-3 flex flex-col gap-3">
          {past.map((b) => (
            <Card key={b.id} b={b} pending={pending} />
          ))}
          {past.length === 0 && (
            <p className="text-sm text-smoke">Nothing here yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
