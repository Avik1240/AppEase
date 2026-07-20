"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  DAY_NAMES,
  type Salon,
  type SalonHour,
  type Service,
  type Stylist,
} from "@/lib/types";
import { approveSalon, rejectSalon } from "./actions";

type Props = {
  salon: Salon;
  hours: SalonHour[];
  stylists: Stylist[];
  services: Service[];
  ownerName: string;
  ownerPhone: string;
};

export default function SalonReviewCard({
  salon,
  hours,
  stylists,
  services,
  ownerName,
  ownerPhone,
}: Props) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleApprove() {
    setError("");
    startTransition(async () => {
      const r = await approveSalon(salon.id);
      if (!r.ok) setError(r.error);
    });
  }

  function handleReject() {
    setError("");
    startTransition(async () => {
      const r = await rejectSalon(salon.id, reason);
      if (!r.ok) setError(r.error);
      else setRejecting(false);
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-charcoal p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{salon.name}</h2>
          <p className="text-sm text-smoke">{salon.address}</p>
          <p className="mt-1 text-sm text-smoke">
            Owner: {ownerName} ·{" "}
            <span className="font-mono">{ownerPhone}</span>
          </p>
          {salon.maps_link && (
            <a
              href={salon.maps_link}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-brass underline"
            >
              View on Maps
            </a>
          )}
        </div>
        <span className="badge-brass">PENDING</span>
      </div>

      {salon.description && (
        <p className="mt-3 text-sm text-smoke">{salon.description}</p>
      )}

      {salon.photos.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {salon.photos.map((url) => (
            <Image
              key={url}
              src={url}
              alt="Salon photo"
              width={144}
              height={96}
              className="h-24 w-36 flex-shrink-0 rounded-lg object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
        <div>
          <h3 className="font-medium text-ivory">Hours</h3>
          <ul className="mt-1 text-smoke">
            {hours.map((h) => (
              <li key={h.id} className="font-mono">
                {DAY_NAMES[h.day_of_week].slice(0, 3)} {h.open_time.slice(0, 5)}–
                {h.close_time.slice(0, 5)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-ivory">
            Stylists {salon.has_expert_pricing && "(expert pricing on)"}
          </h3>
          <ul className="mt-1 text-smoke">
            {stylists.map((s) => (
              <li key={s.id}>
                {s.name}
                {s.is_expert && <span className="text-brass"> ★</span>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-ivory">Services</h3>
          <ul className="mt-1 text-smoke">
            {services.map((s) => (
              <li key={s.id}>
                {s.name} — <span className="font-mono">₹{s.price}</span>
                {salon.has_expert_pricing && s.expert_price != null && (
                  <span className="font-mono"> / ₹{s.expert_price} expert</span>
                )}{" "}
                <span className="font-mono">({s.duration_minutes}m)</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-wine-soft/40 bg-wine/15 px-3 py-2 text-sm text-wine-soft">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {!rejecting ? (
          <>
            <button
              onClick={handleApprove}
              disabled={pending}
              className="min-h-11 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
            >
              {pending ? "Working…" : "Approve"}
            </button>
            <button
              onClick={() => setRejecting(true)}
              disabled={pending}
              className="min-h-11 rounded-lg border border-wine-soft/50 px-4 py-2 text-sm font-medium text-wine-soft hover:bg-wine/20 disabled:opacity-40"
            >
              Reject
            </button>
          </>
        ) : (
          <div className="flex w-full flex-wrap items-center gap-2">
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for rejection (shown to salon)"
              className="input-dark min-w-0 flex-1"
            />
            <button
              onClick={handleReject}
              disabled={pending || !reason.trim()}
              className="min-h-11 rounded-lg bg-wine px-4 py-2 text-sm font-medium text-ivory hover:bg-wine-soft disabled:opacity-40"
            >
              Confirm reject
            </button>
            <button
              onClick={() => setRejecting(false)}
              disabled={pending}
              className="min-h-11 rounded-lg border border-white/10 px-4 py-2 text-sm text-smoke hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
