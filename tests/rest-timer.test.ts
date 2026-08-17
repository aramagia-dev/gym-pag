import { describe, expect, it } from "vitest";

import { formatRestCountdown, restMinutesToSeconds, restSecondsToMinutes } from "@/src/features/active-workout/rest-timer";

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
});
