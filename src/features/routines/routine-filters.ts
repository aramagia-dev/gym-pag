import type { DayOfWeek, RoutineTemplate } from "@/src/domain/models/workout";

export const allRoutineDays = "all" as const;
export type RoutineDayFilter = DayOfWeek | typeof allRoutineDays;

export interface RoutineFilters {
  search: string;
  day: RoutineDayFilter;
}

function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function filterAndSortRoutines(
  routines: RoutineTemplate[],
  filters: RoutineFilters,
): RoutineTemplate[] {
  const search = normalizeSearchText(filters.search);
  const filtered = routines.filter((routine) => {
    const matchesSearch = search.length === 0
      || normalizeSearchText(routine.name).includes(search)
      || normalizeSearchText(routine.notes ?? "").includes(search);
    const matchesDay = filters.day === allRoutineDays || routine.daysOfWeek.includes(filters.day);
    return matchesSearch && matchesDay;
  });

  return [...filtered].sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" }));
}
