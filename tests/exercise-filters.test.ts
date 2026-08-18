import { describe, expect, it } from "vitest";

import type { Exercise } from "@/src/domain/models/workout";
import { filterExercises } from "@/src/features/exercise-catalog/exercise-filters";

const exercises: Exercise[] = [
  { id: "1", name: "Press inclinado", muscleGroup: "chest", category: "push", mode: "weighted", notes: "Controlar el descenso" },
  { id: "2", name: "Curl de bíceps", muscleGroup: "biceps", category: "isolation", mode: "weighted", notes: "Sin balanceo" },
  { id: "3", name: "Remo con barra", muscleGroup: "back", category: "pull", mode: "weighted", notes: "Espalda neutra" },
];

const noFilters = { search: "", muscleGroup: "all" as const, category: "all" as const };

describe("filterExercises", () => {
  it("returns all exercises when no filter is active", () => {
    expect(filterExercises(exercises, noFilters)).toEqual(exercises);
  });

  it("searches exercise names case-insensitively", () => {
    expect(filterExercises(exercises, { ...noFilters, search: "PRESS" }).map(({ id }) => id)).toEqual(["1"]);
  });

  it("matches accented names and notes without accents", () => {
    expect(filterExercises(exercises, { ...noFilters, search: "biceps" }).map(({ id }) => id)).toEqual(["2"]);
    expect(filterExercises(exercises, { ...noFilters, search: "descenso" }).map(({ id }) => id)).toEqual(["1"]);
  });

  it("filters by muscle group", () => {
    expect(filterExercises(exercises, { ...noFilters, muscleGroup: "back" }).map(({ id }) => id)).toEqual(["3"]);
  });

  it("filters by category", () => {
    expect(filterExercises(exercises, { ...noFilters, category: "pull" }).map(({ id }) => id)).toEqual(["3"]);
  });

  it("combines search and both select filters", () => {
    expect(filterExercises(exercises, { search: "remo", muscleGroup: "back", category: "pull" }).map(({ id }) => id)).toEqual(["3"]);
    expect(filterExercises(exercises, { search: "remo", muscleGroup: "chest", category: "pull" })).toEqual([]);
  });
});
