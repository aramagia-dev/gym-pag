import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/features/routines/routine-navigation.tsx", "utf8");

describe("routine navigation styles", () => {
  it("only applies bold styling to Rutinas when it is active", () => {
    expect(source).toContain('active === "routines" ? "bg-cyan-400 font-semibold text-slate-950"');
    expect(source).not.toContain('px-3 py-2.5 font-semibold ${active === "routines"');
  });
});
