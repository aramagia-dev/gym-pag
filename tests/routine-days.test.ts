import { describe, expect, it } from "vitest";

import { formatRoutineDays } from "@/src/features/routines/routine-days";

describe("routine day formatting", () => {
  it("formats two selected days in Spanish", () => {
    expect(formatRoutineDays(["monday", "thursday"])).toBe("Lunes y Jueves");
  });

  it("formats more than two selected days with a final conjunction", () => {
    expect(formatRoutineDays(["monday", "wednesday", "friday"])).toBe("Lunes, Miércoles y Viernes");
  });
});
