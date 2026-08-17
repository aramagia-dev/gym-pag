import type { Exercise, ExerciseCategory, MuscleGroup } from "@/src/domain/models/workout";

export type ExerciseFilters = {
  search: string;
  muscleGroup: MuscleGroup | "all";
  category: ExerciseCategory | "all";
};

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export function filterExercises(exercises: Exercise[], filters: ExerciseFilters): Exercise[] {
  const search = normalize(filters.search.trim());

  return exercises.filter((exercise) => {
    const matchesSearch = search.length === 0
      || normalize(exercise.name).includes(search)
      || normalize(exercise.notes ?? "").includes(search);
    const matchesMuscleGroup = filters.muscleGroup === "all" || exercise.muscleGroup === filters.muscleGroup;
    const matchesCategory = filters.category === "all" || exercise.category === filters.category;

    return matchesSearch && matchesMuscleGroup && matchesCategory;
  });
}
