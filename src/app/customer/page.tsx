import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getSessionIdentity } from "@/lib/supabase/session";
import LogoutButton from "@/components/LogoutButton";
import Spotlight from "@/components/Spotlight";
import { SERVICE_CATEGORIES, type Salon, type Service } from "@/lib/types";

type Props = {
  searchParams: Promise<{ q?: string; category?: string }>;
};

// PostgREST's `.or()` filter string treats `,` `(` `)` as syntax, not literal
// characters. Wrapping the value in double quotes makes it a literal string —
// but the value itself can then never contain an unescaped `"` or `\`, so
// those must be backslash-escaped first. Without this, a search like
// "a,b" would silently be parsed as two separate filter conditions instead
// of a literal search string, and could be used to inject extra clauses.
function escapePostgrestLiteral(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export default async function CustomerHome({ searchParams }: Props) {
  const { q = "", category = "" } = await searchParams;
  const supabase = await createClient();
  const identity = await getSessionIdentity();

  let query = supabase
    .from("salons")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const searchTerm = q.trim().slice(0, 100);
  if (searchTerm) {
    const safe = escapePostgrestLiteral(searchTerm);
    query = query.or(`name.ilike."%${safe}%",address.ilike."%${safe}%"`);
  }

  let { data: salons } = await query.returns<Salon[]>();
  salons = salons ?? [];

  const salonIds = salons.map((s) => s.id);
  let services: Service[] = [];
  if (salonIds.length > 0) {
    const { data } = await supabase
      .from("services")
      .select("*")
      .in("salon_id", salonIds)
      .returns<Service[]>();
    services = data ?? [];
  }

  if (category) {
    const allowed = new Set(
      services.filter((s) => s.category === category).map((s) => s.salon_id)
    );
    salons = salons.filter((s) => allowed.has(s.id));
  }

  const priceRange = (salonId: string) => {
    const prices = services
      .filter((s) => s.salon_id === salonId)
      .map((s) => Number(s.price));
    if (prices.length === 0) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return min === max ? `₹${min}` : `₹${min}–₹${max}`;
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Spotlight />
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-8 sm:py-10">
        <header className="reveal flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold sm:text-3xl">
              Find a salon
            </h1>
            <p className="mt-1 text-sm text-smoke">Hi, {identity?.fullName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/customer/bookings" className="btn-ghost text-sm">
              My bookings
            </Link>
            <LogoutButton />
          </div>
        </header>

        <form
          className="reveal reveal-1 mt-6 flex flex-wrap gap-2"
          action="/customer"
          method="get"
        >
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name or area…"
            className="input-dark min-w-0 flex-1 sm:max-w-xs"
          />
          <select
            name="category"
            defaultValue={category}
            className="input-dark w-auto capitalize"
          >
            <option value="">All categories</option>
            {SERVICE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-brass px-5 text-sm">
            Search
          </button>
          {(q || category) && (
            <Link
              href="/customer"
              className="self-center px-2 text-sm text-smoke underline hover:text-ivory"
            >
              Clear
            </Link>
          )}
        </form>

        <div className="reveal reveal-2 mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {salons.map((salon) => (
            <Link
              key={salon.id}
              href={`/customer/salon/${salon.id}`}
              className="card lift group overflow-hidden"
            >
              {salon.photos[0] ? (
                <div className="relative h-40 w-full overflow-hidden">
                  <Image
                    src={salon.photos[0]}
                    alt={salon.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="placeholder-photo flex h-40 w-full items-end p-4">
                  <span className="font-display text-2xl text-ivory/30">
                    {salon.name.slice(0, 1)}
                  </span>
                </div>
              )}
              <div className="p-4">
                <h2 className="font-display text-lg font-semibold group-hover:text-brass">
                  {salon.name}
                </h2>
                <p className="mt-1 text-sm text-smoke">{salon.address}</p>
                {priceRange(salon.id) && (
                  <p className="mt-2 font-mono text-sm text-brass">
                    {priceRange(salon.id)}
                  </p>
                )}
              </div>
            </Link>
          ))}
          {salons.length === 0 && (
            <div className="card col-span-full border-dashed p-10 text-center text-sm text-smoke">
              No salons found{q || category ? " for your search" : " yet — check back soon"}.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
