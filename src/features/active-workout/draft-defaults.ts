import type { WorkoutSet } from "@/src/domain/models/workout";

export type DraftValues = Pick<WorkoutSet, "weight" | "reps" | "setType" | "notes">;

export function initialDraftValues(
  current: WorkoutSet,
  previous?: Pick<WorkoutSet, "weight" | "reps">,
  routineTargetReps?: number,
): DraftValues {
  const untouched = current.weight === 0 && (
    current.reps === 0 || current.reps === routineTargetReps
  );
  return previous && untouched
    ? { weight: previous.weight, reps: previous.reps, setType: current.setType, notes: current.notes }
    : { weight: current.weight, reps: current.reps, setType: current.setType, notes: current.notes };
}
