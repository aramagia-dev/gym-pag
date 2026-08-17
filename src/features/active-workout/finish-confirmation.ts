import type { WorkoutSet } from "@/src/domain/models/workout";

export function incompleteSetCount(sets: WorkoutSet[]): number {
  return sets.filter((set) => !set.isCompleted).length;
}

export function finishConfirmationMessage(incompleteSets: number): string {
  if (incompleteSets === 0) {
    return "Todas las series están completadas. ¿Desea finalizar la sesión?";
  }

  return `Quedan ${incompleteSets} series incompletas. ¿Desea finalizar la sesión de todos modos?`;
}

export function confirmFinish(
  sets: WorkoutSet[],
  confirm: (message: string) => boolean,
): boolean {
  return confirm(finishConfirmationMessage(incompleteSetCount(sets)));
}
