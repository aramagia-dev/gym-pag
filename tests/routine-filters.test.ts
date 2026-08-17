import { describe, expect, it } from "vitest";

import type { RoutineTemplate } from "@/src/domain/models/workout";
import { allRoutineDays, filterAndSortRoutines } from "@/src/features/routines/routine-filters";

const routines: RoutineTemplate[] = [
  { id: "1", name: "Piernas", notes: "Fuerza y movilidad", daysOfWeek: ["monday"], exercises: [] },
  { id: "2", name: "Álbum de fuerza", notes: "Sesión de tren superior", daysOfWeek: ["wednesday"], exercises: [] },
  { id: "3", name: "Empuje", notes: "Técnica de hombros", daysOfWeek: ["monday", "friday"], exercises: [] },
];

const noFilters = { search: "", day: allRoutineDays } as const;

describe("routine filtering", () => {
  it("returns all routines without filters and leaves source order unchanged", () => {
    const source = [routines[0], routines[1]];
    expect(filterAndSortRoutines(source, noFilters).map((routine) => routine.id)).toEqual(["2", "1"]);
    expect(source.map((routine) => routine.id)).toEqual(["1", "2"]);
  });

  it("searches names without accents", () => {
    expect(filterAndSortRoutines(routines, { ...noFilters, search: "album" }).map((routine) => routine.id)).toEqual(["2"]);
  });

  it("searches notes", () => {
    expect(filterAndSortRoutines(routines, { ...noFilters, search: "movilidad" }).map((routine) => routine.id)).toEqual(["1"]);
  });

  it("filters by day", () => {
    expect(filterAndSortRoutines(routines, { ...noFilters, day: "friday" }).map((routine) => routine.id)).toEqual(["3"]);
  });

  it("combines search and day filters", () => {
    expect(filterAndSortRoutines(routines, { search: "tecnica", day: "monday" }).map((routine) => routine.id)).toEqual(["3"]);
    expect(filterAndSortRoutines(routines, { search: "fuerza", day: "friday" })).toEqual([]);
  });

  it("sorts alphabetically by name", () => {
    expect(filterAndSortRoutines(routines, noFilters).map((routine) => routine.name)).toEqual(["Álbum de fuerza", "Empuje", "Piernas"]);
  });
});
