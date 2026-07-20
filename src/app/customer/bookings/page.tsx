import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getSessionIdentity } from "@/lib/supabase/session";
import LogoutButton from "@/components/LogoutButton";
import CustomerBookings, { type CustomerBookingRow } from "./CustomerBookings";

export default async function CustomerBookingsPage() {
  const supabase = await createClient();
  const identity = await getSessionIdentity();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, salon_id, service_id, stylist_id, booking_date, start_time, end_time, price, status, salons(name, address), services(name), stylists(name)"
    )
    .eq("customer_id", identity!.id)
    .order("booking_date", { ascending: false })
    .order("start_time", { ascending: false })
    .returns<CustomerBookingRow[]>();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            My bookings
          </h1>
          <Link
            href="/customer"
            className="text-sm text-smoke hover:text-ivory hover:underline"
          >
            ← Find a salon
          </Link>
        </div>
        <LogoutButton />
      </header>
      <div className="mt-8">
        <CustomerBookings bookings={bookings ?? []} />
      </div>
    </main>
  );
}
