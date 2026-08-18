export function restMinutesToSeconds(minutes: number): number | undefined {
  if (!Number.isFinite(minutes) || minutes < 0) return undefined;
  return Math.round(minutes * 60);
}

export function restSecondsToMinutes(seconds: number | undefined): number | undefined {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return undefined;
  return seconds / 60;
}

export function formatRestCountdown(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function remainingRestSeconds(expiresAt: number, now: number): number {
  return Math.ceil(Math.max(0, expiresAt - now) / 1000);
}

export function adjustRestExpiry(
  expiresAt: number,
  now: number,
  adjustmentSeconds: number,
): number | undefined {
  const adjustedSeconds = Math.max(
    0,
    remainingRestSeconds(expiresAt, now) + adjustmentSeconds,
  );
  return adjustedSeconds > 0 ? now + adjustedSeconds * 1000 : undefined;
}
