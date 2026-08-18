import { describe, expect, it } from "vitest";
import { initialDraftValues } from "@/src/features/active-workout/draft-defaults";
import type { WorkoutSet } from "@/src/domain/models/workout";

const set: WorkoutSet = {
  id: "set-1", sessionId: "session-1", exerciseId: "exercise-1", setNumber: 1,
  setType: "working", weight: 0, reps: 10, isCompleted: false,
};

describe("initialDraftValues", () => {
  it("uses the matching previous values for untouched routine defaults", () => {
    expect(initialDraftValues(set, { weight: 40, reps: 8 }, 10)).toEqual({ weight: 40, reps: 8, setType: "working", notes: undefined });
  });

  it("preserves current values when the user already entered them", () => {
    expect(initialDraftValues({ ...set, weight: 35, reps: 9 }, { weight: 40, reps: 8 }, 10)).toEqual({ weight: 35, reps: 9, setType: "working", notes: undefined });
  });
});
