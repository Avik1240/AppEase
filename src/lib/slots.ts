// Pure slot computation — no I/O, unit-testable.
// All times are "HH:MM" strings; internally minutes since midnight.

export const SLOT_STEP_MINUTES = 30;

export type TimeRange = { start: string; end: string }; // [start, end)

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Compute available slot start times.
 *
 * @param openTime      salon opening "HH:MM" for the day (null = closed)
 * @param closeTime     salon closing "HH:MM"
 * @param durationMin   service duration in minutes
 * @param booked        existing active bookings for the stylist that day
 * @param notBefore     "HH:MM" — exclude slots starting before this
 *                      (pass current time when the date is today, else null)
 */
export function computeSlots(
  openTime: string | null,
  closeTime: string | null,
  durationMin: number,
  booked: TimeRange[],
  notBefore: string | null
): { start: string; end: string; available: boolean }[] {
  if (!openTime || !closeTime) return [];

  const open = toMinutes(openTime);
  const close = toMinutes(closeTime);
  const bookedMin = booked.map((b) => ({
    start: toMinutes(b.start),
    end: toMinutes(b.end),
  }));
  const floor = notBefore == null ? -1 : toMinutes(notBefore);

  const slots: { start: string; end: string; available: boolean }[] = [];

  for (let s = open; s + durationMin <= close; s += SLOT_STEP_MINUTES) {
    const e = s + durationMin;
    const clash = bookedMin.some((b) => rangesOverlap(s, e, b.start, b.end));
    const past = s <= floor;
    slots.push({
      start: toHHMM(s),
      end: toHHMM(e),
      available: !clash && !past,
    });
  }

  return slots;
}
