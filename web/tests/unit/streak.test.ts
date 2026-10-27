import { describe, it, expect } from "vitest";
import { calculateStreak, formatLocalDate } from "@/features/stats/streak";

describe("T13 - Streak Engine (Pure Calculation & Timezone Boundaries)", () => {
  const refNow = new Date("2026-10-27T10:00:00Z");

  it("returns 0 when there are no timestamps", () => {
    expect(calculateStreak([], "UTC", refNow)).toBe(0);
  });

  it("calculates streak = 1 when only today has an event", () => {
    const events = ["2026-10-27T08:00:00Z"];
    expect(calculateStreak(events, "UTC", refNow)).toBe(1);
  });

  it("calculates streak = 1 when only yesterday has an event and today is not yet done", () => {
    const events = ["2026-10-26T20:00:00Z"];
    expect(calculateStreak(events, "UTC", refNow)).toBe(1);
  });

  it("calculates consecutive days streak correctly", () => {
    const events = [
      "2026-10-27T01:00:00Z", // today
      "2026-10-26T15:00:00Z", // yesterday
      "2026-10-25T12:00:00Z", // 2 days ago
      "2026-10-24T09:00:00Z", // 3 days ago
    ];
    expect(calculateStreak(events, "UTC", refNow)).toBe(4);
  });

  it("does not overcount multiple events in the same calendar day", () => {
    const events = [
      "2026-10-27T01:00:00Z",
      "2026-10-27T04:00:00Z",
      "2026-10-27T09:00:00Z",
      "2026-10-26T12:00:00Z",
      "2026-10-26T18:00:00Z",
    ];
    expect(calculateStreak(events, "UTC", refNow)).toBe(2);
  });

  it("breaks streak when a day is missing", () => {
    const events = [
      "2026-10-27T01:00:00Z", // today
      "2026-10-26T15:00:00Z", // yesterday
      // 2026-10-25 missing!
      "2026-10-24T09:00:00Z", // 3 days ago
      "2026-10-23T09:00:00Z",
    ];
    expect(calculateStreak(events, "UTC", refNow)).toBe(2);
  });

  it("returns 0 if the last event was 2 or more days ago", () => {
    const events = [
      "2026-10-25T12:00:00Z", // 2 days ago
      "2026-10-24T09:00:00Z",
      "2026-10-23T09:00:00Z",
    ];
    expect(calculateStreak(events, "UTC", refNow)).toBe(0);
  });

  it("correctly handles timezone shifting (e.g. UTC vs Asia/Ho_Chi_Minh +07:00)", () => {
    // 2026-10-26 23:30:00 UTC is:
    // in UTC: 2026-10-26
    // in Asia/Ho_Chi_Minh: 2026-10-27 06:30:00 (+7 hours) -> 2026-10-27!
    const eveningUtc = "2026-10-26T23:30:00Z";

    expect(formatLocalDate(eveningUtc, "UTC")).toBe("2026-10-26");
    expect(formatLocalDate(eveningUtc, "Asia/Ho_Chi_Minh")).toBe("2026-10-27");

    // Reference now: 2026-10-27 01:00:00 UTC (which is 2026-10-27 08:00:00 in Vietnam)
    const morningNow = new Date("2026-10-27T01:00:00Z");

    // In Vietnam:
    // both eveningUtc (06:30 AM) and morningNow (08:00 AM) are on 2026-10-27
    expect(calculateStreak([eveningUtc], "Asia/Ho_Chi_Minh", morningNow)).toBe(1);

    // In UTC:
    // morningNow is 2026-10-27, eveningUtc is 2026-10-26 (yesterday)
    // Streak is maintained as 1
    expect(calculateStreak([eveningUtc], "UTC", morningNow)).toBe(1);
  });
});
