"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DAY_NAMES,
  SERVICE_CATEGORIES,
  type HourInput,
  type ServiceInput,
  type StylistInput,
} from "@/lib/types";
import { submitOnboarding } from "./actions";

type DayRow = { enabled: boolean; open: string; close: string };

export default function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [days, setDays] = useState<DayRow[]>(
    DAY_NAMES.map((_, i) => ({
      enabled: i !== 0,
      open: "09:00",
      close: "21:00",
    }))
  );
  const [stylists, setStylists] = useState<StylistInput[]>([
    { name: "", is_expert: false },
  ]);
  const [expertPricing, setExpertPricing] = useState(false);
  const [services, setServices] = useState<ServiceInput[]>([
    {
      name: "",
      category: "haircut",
      price: 0,
      expert_price: null,
      duration_minutes: 30,
    },
  ]);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const supabase = createClient();
      const photoUrls: string[] = [];
      for (const file of files) {
        const path = `${userId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage
          .from("salon-photos")
          .upload(path, file);
        if (upErr) throw new Error(`Photo upload failed: ${upErr.message}`);
        const { data } = supabase.storage
          .from("salon-photos")
          .getPublicUrl(path);
        photoUrls.push(data.publicUrl);
      }

      const hours: HourInput[] = days
        .map((d, i) => ({ day_of_week: i, open_time: d.open, close_time: d.close, enabled: d.enabled }))
        .filter((d) => d.enabled)
        .map(({ day_of_week, open_time, close_time }) => ({ day_of_week, open_time, close_time }));

      const result = await submitOnboarding({
        name,
        description,
        address,
        maps_link: mapsLink,
        has_expert_pricing: expertPricing,
        photos: photoUrls,
        hours,
        stylists,
        services,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Basics */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Salon details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="label-dark">
            Salon name *
            <input className="input-dark" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="label-dark">
            Google Maps link
            <input className="input-dark" type="url" placeholder="https://maps.app.goo.gl/…" value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} />
          </label>
          <label className="label-dark sm:col-span-2">
            Address *
            <input className="input-dark" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </label>
          <label className="label-dark sm:col-span-2">
            Description
            <textarea className="input-dark min-h-20" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
      </section>

      {/* Hours */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Opening hours</h2>
        <p className="mt-1 text-sm text-smoke">These hours apply to all stylists.</p>
        <div className="mt-4 flex flex-col gap-2.5">
          {DAY_NAMES.map((day, i) => (
            <div key={day} className="flex flex-wrap items-center gap-3">
              <label className="flex w-32 min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#c9a24b]"
                  checked={days[i].enabled}
                  onChange={(e) =>
                    setDays((d) => d.map((row, j) => (j === i ? { ...row, enabled: e.target.checked } : row)))
                  }
                />
                {day}
              </label>
              {days[i].enabled ? (
                <div className="flex items-center gap-2">
                  <input type="time" className="input-dark w-auto font-mono" value={days[i].open}
                    onChange={(e) => setDays((d) => d.map((row, j) => (j === i ? { ...row, open: e.target.value } : row)))} />
                  <span className="text-sm text-smoke">to</span>
                  <input type="time" className="input-dark w-auto font-mono" value={days[i].close}
                    onChange={(e) => setDays((d) => d.map((row, j) => (j === i ? { ...row, close: e.target.value } : row)))} />
                </div>
              ) : (
                <span className="text-sm text-smoke/60">Closed</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Stylists */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Stylists</h2>
        <div className="mt-4 flex flex-col gap-3">
          {stylists.map((s, i) => (
            <div key={i} className="flex flex-wrap items-center gap-3">
              <input className="input-dark min-w-0 flex-1" placeholder="Stylist name"
                value={s.name}
                onChange={(e) => setStylists((arr) => arr.map((row, j) => (j === i ? { ...row, name: e.target.value } : row)))} />
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-[#c9a24b]" checked={s.is_expert}
                  onChange={(e) => setStylists((arr) => arr.map((row, j) => (j === i ? { ...row, is_expert: e.target.checked } : row)))} />
                Expert / founder
              </label>
              {stylists.length > 1 && (
                <button type="button" className="min-h-11 text-sm text-wine-soft hover:underline"
                  onClick={() => setStylists((arr) => arr.filter((_, j) => j !== i))}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" className="min-h-11 self-start text-sm font-medium text-brass underline"
            onClick={() => setStylists((arr) => [...arr, { name: "", is_expert: false }])}>
            + Add stylist
          </button>
        </div>
        <label className="mt-4 flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-[#c9a24b]" checked={expertPricing} onChange={(e) => setExpertPricing(e.target.checked)} />
          Charge different prices for expert stylists
        </label>
      </section>

      {/* Services */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Services & pricing</h2>
        <div className="mt-4 flex flex-col gap-4">
          {services.map((s, i) => (
            <div key={i} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
              <label className="label-dark">
                Service
                <input className="input-dark" placeholder="e.g. Haircut" value={s.name}
                  onChange={(e) => setServices((arr) => arr.map((row, j) => (j === i ? { ...row, name: e.target.value } : row)))} />
              </label>
              <label className="label-dark">
                Category
                <select className="input-dark capitalize" value={s.category}
                  onChange={(e) => setServices((arr) => arr.map((row, j) => (j === i ? { ...row, category: e.target.value } : row)))}>
                  {SERVICE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="label-dark">
                Price (₹)
                <input className="input-dark font-mono" type="number" min={0} value={s.price}
                  onChange={(e) => setServices((arr) => arr.map((row, j) => (j === i ? { ...row, price: Number(e.target.value) } : row)))} />
              </label>
              {expertPricing && (
                <label className="label-dark">
                  Expert (₹)
                  <input className="input-dark font-mono" type="number" min={0} value={s.expert_price ?? ""}
                    onChange={(e) => setServices((arr) => arr.map((row, j) => (j === i ? { ...row, expert_price: e.target.value === "" ? null : Number(e.target.value) } : row)))} />
                </label>
              )}
              <label className="label-dark">
                Minutes
                <input className="input-dark font-mono" type="number" min={5} step={5} value={s.duration_minutes}
                  onChange={(e) => setServices((arr) => arr.map((row, j) => (j === i ? { ...row, duration_minutes: Number(e.target.value) } : row)))} />
              </label>
              {services.length > 1 && (
                <button type="button" className="min-h-11 pb-2 text-sm text-wine-soft hover:underline"
                  onClick={() => setServices((arr) => arr.filter((_, j) => j !== i))}>
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" className="min-h-11 self-start text-sm font-medium text-brass underline"
            onClick={() => setServices((arr) => [...arr, { name: "", category: "other", price: 0, expert_price: null, duration_minutes: 30 }])}>
            + Add service
          </button>
        </div>
      </section>

      {/* Photos */}
      <section className="card p-5 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Photos</h2>
        <p className="mt-1 text-sm text-smoke">Up to 5 photos of your salon.</p>
        <input className="mt-4 block text-sm text-smoke file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brass file:px-4 file:py-2 file:font-medium file:text-ink"
          type="file" accept="image/*" multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 5))} />
        {files.length > 0 && (
          <p className="mt-2 text-sm text-smoke">{files.length} photo(s) selected</p>
        )}
      </section>

      {error && (
        <p className="rounded-xl border border-wine-soft/40 bg-wine/15 px-4 py-3 text-sm text-wine-soft">{error}</p>
      )}

      <button type="submit" disabled={submitting} className="btn-brass">
        {submitting ? "Submitting…" : "Submit for approval"}
      </button>
    </form>
  );
}
