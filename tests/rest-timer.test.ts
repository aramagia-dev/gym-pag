import { describe, expect, it } from "vitest";

import {
  adjustRestExpiry,
  formatRestCountdown,
  remainingRestSeconds,
  restMinutesToSeconds,
  restSecondsToMinutes,
} from "@/src/features/active-workout/rest-timer";

describe("rest timer helpers", () => {
  it("converts routine rest between minutes and persisted seconds", () => {
    expect(restMinutesToSeconds(1.5)).toBe(90);
    expect(restMinutesToSeconds(0)).toBe(0);
    expect(restMinutesToSeconds(-1)).toBeUndefined();
    expect(restSecondsToMinutes(120)).toBe(2);
    expect(restSecondsToMinutes(undefined)).toBeUndefined();
    expect(restSecondsToMinutes(Number.NaN)).toBeUndefined();
  });

  it("formats countdown values as mm:ss", () => {
    expect(formatRestCountdown(0)).toBe("0:00");
    expect(formatRestCountdown(90)).toBe("1:30");
    expect(formatRestCountdown(3600)).toBe("60:00");
    expect(formatRestCountdown(-1)).toBe("0:00");
  });

  it("calculates deterministic remaining time and clamps subtraction at zero", () => {
    expect(remainingRestSeconds(10_000, 1_250)).toBe(9);
    expect(remainingRestSeconds(1_000, 2_000)).toBe(0);
    expect(adjustRestExpiry(10_000, 1_250, 15)).toBe(25_250);
    expect(adjustRestExpiry(10_000, 1_250, -15)).toBeUndefined();
  });
});
