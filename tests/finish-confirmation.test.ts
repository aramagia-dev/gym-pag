import { describe, expect, it, vi } from "vitest";
import type { WorkoutSet } from "@/src/domain/models/workout";
import { confirmFinish, finishConfirmationMessage, incompleteSetCount } from "@/src/features/active-workout/finish-confirmation";

const set = (id: string, isCompleted: boolean): WorkoutSet => ({
  id,
  sessionId: "session-1",
  exerciseId: "exercise-1",
  setNumber: Number(id),
  setType: "working",
  weight: 20,
  reps: 10,
  isCompleted,
});

describe("finish confirmation", () => {
  it("uses a positive message when no sets are incomplete", () => {
    const confirm = vi.fn(() => true);

    expect(incompleteSetCount([set("1", true), set("2", true)])).toBe(0);
    expect(finishConfirmationMessage(0)).toBe("Todas las series están completadas. ¿Desea finalizar la sesión?");
    expect(confirmFinish([set("1", true), set("2", true)], confirm)).toBe(true);
    expect(confirm).toHaveBeenCalledWith("Todas las series están completadas. ¿Desea finalizar la sesión?");
  });

  it("states the number of incomplete sets", () => {
    const confirm = vi.fn(() => true);

    expect(incompleteSetCount([set("1", true), set("2", false), set("3", false)])).toBe(2);
    expect(confirmFinish([set("1", true), set("2", false), set("3", false)], confirm)).toBe(true);
    expect(confirm).toHaveBeenCalledWith("Quedan 2 series incompletas. ¿Desea finalizar la sesión de todos modos?");
  });

  it("returns false on cancellation so the finish operation is not called", () => {
    const confirm = vi.fn(() => false);
    const finishService = vi.fn();

    const confirmed = confirmFinish([set("1", false)], confirm);
    if (confirmed) finishService();

    expect(confirmed).toBe(false);
    expect(finishService).not.toHaveBeenCalled();
  });
});
