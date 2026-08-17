import { describe, expect, it } from "vitest";

import { draftSaveStatusClassName, draftSaveStatusLabel } from "@/src/features/active-workout/draft-save-status";

describe("draft save status", () => {
  it("uses explicit Spanish labels for each persistence state", () => {
    expect(draftSaveStatusLabel("saved")).toBe("Guardado");
    expect(draftSaveStatusLabel("unsaved")).toBe("Sin guardar");
    expect(draftSaveStatusLabel("saving")).toBe("Guardando...");
    expect(draftSaveStatusLabel("error")).toBe("Sin guardar");
  });

  it("keeps error visually distinct from an ordinary unsaved draft", () => {
    expect(draftSaveStatusClassName("error")).toContain("rose");
    expect(draftSaveStatusClassName("unsaved")).toContain("slate");
  });
});
