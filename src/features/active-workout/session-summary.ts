export function calculateElapsedSeconds(
  startTime: string,
  endTime: string | number = Date.now(),
): number {
  const start = Date.parse(startTime);
  const end = typeof endTime === "number" ? endTime : Date.parse(endTime);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

export function formatElapsedDuration(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return [hours, minutes, remainingSeconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  return [minutes, remainingSeconds].map((value) => String(value).padStart(2, "0")).join(":");
}
