import { describe, expect, it } from "vitest";
import { computeSlots, rangesOverlap, toHHMM, toMinutes } from "./slots";

describe("toMinutes / toHHMM", () => {
  it("round-trips HH:MM", () => {
    expect(toMinutes("09:30")).toBe(570);
    expect(toHHMM(570)).toBe("09:30");
    expect(toMinutes("00:00")).toBe(0);
    expect(toHHMM(0)).toBe("00:00");
  });
});

describe("rangesOverlap", () => {
  it("detects overlap", () => {
    expect(rangesOverlap(0, 60, 30, 90)).toBe(true); // partial overlap
    expect(rangesOverlap(0, 60, 60, 120)).toBe(false); // back-to-back, half-open
    expect(rangesOverlap(0, 60, 10, 20)).toBe(true); // fully contained
    expect(rangesOverlap(60, 120, 0, 60)).toBe(false); // back-to-back reversed
  });
});

describe("computeSlots", () => {
  it("returns nothing when the salon is closed that day", () => {
    expect(computeSlots(null, null, 30, [], null)).toEqual([]);
  });

  it("generates 30-minute-stepped slots across the open window", () => {
    const slots = computeSlots("09:00", "10:00", 30, [], null);
    expect(slots.map((s) => s.start)).toEqual(["09:00", "09:30"]);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it("excludes a slot that doesn't fully fit before closing", () => {
    // 45-minute service, 60-minute window, 30-min step -> only one slot fits
    const slots = computeSlots("09:00", "10:00", 45, [], null);
    expect(slots.map((s) => s.start)).toEqual(["09:00"]);
  });

  it("marks a slot unavailable when it overlaps an existing booking", () => {
    const slots = computeSlots(
      "09:00",
      "11:00",
      30,
      [{ start: "09:30", end: "10:00" }],
      null
    );
    const byStart = Object.fromEntries(slots.map((s) => [s.start, s.available]));
    expect(byStart["09:00"]).toBe(true);
    expect(byStart["09:30"]).toBe(false);
    expect(byStart["10:00"]).toBe(true);
  });

  it("marks a slot unavailable if a longer service would overlap a booking mid-way", () => {
    // 60-min service starting 09:00 would run 09:00-10:00, clashing with
    // a 09:30-10:00 booking even though 09:00 itself isn't booked.
    const slots = computeSlots(
      "09:00",
      "11:00",
      60,
      [{ start: "09:30", end: "10:00" }],
      null
    );
    const nine = slots.find((s) => s.start === "09:00");
    expect(nine?.available).toBe(false);
  });

  it("excludes slots at or before the notBefore cutoff (today)", () => {
    const slots = computeSlots("09:00", "12:00", 30, [], "10:00");
    const byStart = Object.fromEntries(slots.map((s) => [s.start, s.available]));
    expect(byStart["09:00"]).toBe(false);
    expect(byStart["10:00"]).toBe(false); // <= floor, excluded
    expect(byStart["10:30"]).toBe(true);
  });

  it("does not exclude anything when notBefore is null (future date)", () => {
    const slots = computeSlots("09:00", "10:00", 30, [], null);
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it("never returns a slot that overlaps itself with an adjacent booking (back-to-back is fine)", () => {
    // Booking ends exactly when a slot would start -> not a clash.
    const slots = computeSlots(
      "09:00",
      "11:00",
      30,
      [{ start: "09:00", end: "09:30" }],
      null
    );
    const nineThirty = slots.find((s) => s.start === "09:30");
    expect(nineThirty?.available).toBe(true);
  });

  it("handles multiple overlapping bookings correctly", () => {
    const slots = computeSlots(
      "09:00",
      "12:00",
      30,
      [
        { start: "09:00", end: "09:30" },
        { start: "10:00", end: "11:00" },
      ],
      null
    );
    const byStart = Object.fromEntries(slots.map((s) => [s.start, s.available]));
    expect(byStart["09:00"]).toBe(false);
    expect(byStart["09:30"]).toBe(true);
    expect(byStart["10:00"]).toBe(false);
    expect(byStart["10:30"]).toBe(false); // 10:30-11:00 overlaps 10:00-11:00 booking
    expect(byStart["11:00"]).toBe(true);
  });
});
