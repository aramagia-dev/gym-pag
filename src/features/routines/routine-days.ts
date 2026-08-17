import type { DayOfWeek } from "@/src/domain/models/workout";

export const routineDays: Array<{ value: DayOfWeek; label: string }> = [
  { value: "monday", label: "Lunes" },
  { value: "tuesday", label: "Martes" },
  { value: "wednesday", label: "Miércoles" },
  { value: "thursday", label: "Jueves" },
  { value: "friday", label: "Viernes" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

export function formatRoutineDays(days: DayOfWeek[]): string {
  const labels = days.map((day) => routineDays.find((item) => item.value === day)?.label ?? day);
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
}
