/**
 * Time Formatting Utilities
 *
 * Helper functions for formatting time values for UI display.
 * Used primarily for showing rate limit reset countdowns.
 *
 * @module lib/time
 * @see {@link ../../components/chat/ChatSidebar.tsx} for usage in UI
 */

/**
 * Formats a duration in seconds to a compact human-readable string.
 *
 * Output examples:
 * - 3665 seconds → "1h 1m"
 * - 125 seconds → "2m"
 * - 45 seconds → "45s"
 * - 0 seconds → "0s"
 *
 * Notes:
 * - Only shows up to 2 time units
 * - Seconds only shown if no hours/minutes
 * - Handles null/undefined gracefully
 *
 * @param seconds - Duration in seconds (can be null/undefined)
 * @returns Formatted string like "1h 30m", or null if input is null/undefined
 *
 * @example
 * ```ts
 * formatDurationShort(3665)  // "1h 1m"
 * formatDurationShort(125)   // "2m"
 * formatDurationShort(45)    // "45s"
 * formatDurationShort(null)  // null
 * ```
 */
export function formatDurationShort(
  seconds: number | null | undefined,
): string | null {
  // Handle null/undefined input
  if (seconds == null) {
    return null;
  }

  // Ensure non-negative integer
  const clamped = Math.max(0, Math.floor(seconds));

  // Break down into hours, minutes, seconds
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;

  // Build output parts
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  // Only show seconds if no larger units
  if (parts.length === 0) {
    parts.push(`${secs}s`);
  }

  // Limit to 2 parts for compact display
  return parts.slice(0, 2).join(" ");
}
