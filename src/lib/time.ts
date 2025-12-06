export function formatDurationShort(seconds: number | null | undefined): string | null {
  if (seconds == null) {
    return null;
  }
  const clamped = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (parts.length === 0) {
    parts.push(`${secs}s`);
  }
  return parts.slice(0, 2).join(" ");
}
