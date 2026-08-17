import { describe, expect, it } from "vitest";

import { calculateElapsedSeconds, formatElapsedDuration } from "@/src/features/active-workout/session-summary";

describe("session summary helpers", () => {
  it("calculates elapsed seconds from ISO timestamps without calendar math", () => {
    expect(calculateElapsedSeconds("2026-08-16T23:59:30.000Z", "2026-08-17T00:00:45.000Z")).toBe(75);
    expect(calculateElapsedSeconds("2026-08-17T00:01:00.000Z", "2026-08-17T00:00:00.000Z")).toBe(0);
  });

  it("safely clamps invalid timestamps and formats compact durations", () => {
    expect(calculateElapsedSeconds("not-a-date", Date.now())).toBe(0);
    expect(calculateElapsedSeconds("2026-08-17T00:00:00.000Z", "not-a-date")).toBe(0);
    expect(formatElapsedDuration(Number.NaN)).toBe("00:00");
    expect(formatElapsedDuration(-1)).toBe("00:00");
    expect(formatElapsedDuration(75)).toBe("01:15");
    expect(formatElapsedDuration(3661)).toBe("01:01:01");
  });
});
