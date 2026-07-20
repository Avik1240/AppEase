"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { BookingStatus } from "@/lib/types";
import { updateBookingStatus } from "./bookings-actions";

export type BookingRow = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  price: number;
  status: BookingStatus;
  services: { name: string } | null;
  stylists: { name: string } | null;
  profiles: { full_name: string; phone: string } | null;
};

const STATUS_BADGE: Record<BookingStatus, string> = {
  confirmed: "badge-brass",
  completed: "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400",
  cancelled: "badge-smoke",
  no_show: "badge-wine",
};

function StatusActions({
  id,
  pending,
  onSet,
}: {
  id: string;
  pending: boolean;
  onSet: (id: string, status: BookingStatus) => void;
}) {
  return (
    <div className="flex flex-nowrap items-center gap-1.5">
      <button
        disabled={pending}
        onClick={() => onSet(id, "completed")}
        title="Mark completed"
        className="min-h-9 whitespace-nowrap rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/10 disabled:opacity-40"
      >
        Done
      </button>
      <button
        disabled={pending}
        onClick={() => onSet(id, "no_show")}
        title="Mark no-show"
        className="min-h-9 whitespace-nowrap rounded-lg border border-wine-soft/50 px-3 py-1.5 text-xs font-medium text-wine-soft transition hover:bg-wine/20 disabled:opacity-40"
      >
        No-show
      </button>
      <button
        disabled={pending}
        onClick={() => onSet(id, "cancelled")}
        title="Cancel booking"
        className="min-h-9 whitespace-nowrap rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-smoke transition hover:bg-white/5 disabled:opacity-40"
      >
        Cancel
      </button>
    </div>
  );
}

export default function BookingsPanel({
  salonId,
  bookings,
}: {
  salonId: string;
  bookings: BookingRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`salon-bookings-${salonId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `salon_id=eq.${salonId}`,
        },
        () => {
          setFlash(true);
          router.refresh();
          setTimeout(() => setFlash(false), 2000);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [salonId, router]);

  function setStatus(id: string, status: BookingStatus) {
    setError("");
    startTransition(async () => {
      const r = await updateBookingStatus(id, status);
      if (!r.ok) setError(r.error);
    });
  }

  const upcoming = bookings.filter((b) => b.status === "confirmed");
  const past = bookings.filter((b) => b.status !== "confirmed");
  const ordered = [...upcoming, ...past];

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold">Bookings</h2>
        {flash && <span className="badge-brass">Updated live</span>}
      </div>

      {error && (
        <p className="mt-3 rounded-xl border border-wine-soft/40 bg-wine/15 px-3 py-2 text-sm text-wine-soft">
          {error}
        </p>
      )}

      {bookings.length === 0 ? (
        <p className="mt-4 text-sm text-smoke">
          No bookings yet. New bookings appear here instantly.
        </p>
      ) : (
        <>
          {/* Desktop table — grouped columns, no awkward wraps */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-smoke">
                  <th className="border-b border-white/10 py-2.5 pr-4 font-medium">When</th>
                  <th className="border-b border-white/10 py-2.5 pr-4 font-medium">Customer</th>
                  <th className="border-b border-white/10 py-2.5 pr-4 font-medium">Service</th>
                  <th className="border-b border-white/10 py-2.5 pr-4 text-right font-medium">Price</th>
                  <th className="border-b border-white/10 py-2.5 pr-4 font-medium">Status</th>
                  <th className="border-b border-white/10 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ordered.map((b) => (
                  <tr
                    key={b.id}
                    className="group transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="whitespace-nowrap border-b border-white/5 py-3 pr-4 font-mono group-last:border-0">
                      <div className="text-ivory">{b.booking_date}</div>
                      <div className="mt-0.5 text-xs text-smoke">
                        {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                      </div>
                    </td>
                    <td className="border-b border-white/5 py-3 pr-4 group-last:border-0">
                      <div>{b.profiles?.full_name ?? "—"}</div>
                      {b.profiles?.phone && (
                        <a
                          href={`tel:${b.profiles.phone}`}
                          className="mt-0.5 block whitespace-nowrap font-mono text-xs text-brass hover:underline"
                        >
                          {b.profiles.phone}
                        </a>
                      )}
                    </td>
                    <td className="border-b border-white/5 py-3 pr-4 group-last:border-0">
                      <div>{b.services?.name ?? "—"}</div>
                      <div className="mt-0.5 text-xs text-smoke">
                        {b.stylists?.name ?? "—"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap border-b border-white/5 py-3 pr-4 text-right font-mono text-brass group-last:border-0">
                      ₹{b.price}
                    </td>
                    <td className="border-b border-white/5 py-3 pr-4 group-last:border-0">
                      <span className={`${STATUS_BADGE[b.status]} whitespace-nowrap`}>
                        {b.status.replace("_", "-")}
                      </span>
                    </td>
                    <td className="border-b border-white/5 py-3 group-last:border-0">
                      {b.status === "confirmed" ? (
                        <StatusActions id={b.id} pending={pending} onSet={setStatus} />
                      ) : (
                        <span className="text-xs text-smoke/50">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards — nothing critical truncated */}
          <div className="mt-4 flex flex-col gap-3 md:hidden">
            {ordered.map((b) => (
              <div key={b.id} className="rounded-xl border border-white/5 bg-ink p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-mono text-sm">
                    {b.booking_date} · {b.start_time.slice(0, 5)}–{b.end_time.slice(0, 5)}
                  </div>
                  <span className={STATUS_BADGE[b.status]}>
                    {b.status.replace("_", "-")}
                  </span>
                </div>
                <p className="mt-2 text-sm">
                  {b.services?.name} · {b.stylists?.name}
                </p>
                <p className="mt-1 text-sm text-smoke">
                  {b.profiles?.full_name}
                  {b.profiles?.phone && (
                    <>
                      {" · "}
                      <a href={`tel:${b.profiles.phone}`} className="font-mono text-brass underline">
                        {b.profiles.phone}
                      </a>
                    </>
                  )}
                </p>
                <p className="mt-1 font-mono text-sm text-brass">₹{b.price}</p>
                {b.status === "confirmed" && (
                  <div className="mt-3">
                    <StatusActions id={b.id} pending={pending} onSet={setStatus} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
