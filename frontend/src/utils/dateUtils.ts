/**
 * Indian Standard Time (IST) Date and Time Utilities
 * Guaranteed formatting for Asia/Kolkata (UTC+5:30) with explicit IST indication
 * and account progression time / study time spent calculators.
 */

export const TIMEZONE_IST = 'Asia/Kolkata';

/**
 * Safely parse any date input to a valid Date object.
 */
function parseDateSafely(input: string | Date | number | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Formats date and time in Indian Standard Time (e.g. "27 Oct 2026, 12:19 PM IST")
 */
export function formatISTDateTime(input: string | Date | number | null | undefined): string {
  const d = parseDateSafely(input);
  if (!d) return '—';

  try {
    const formatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: TIMEZONE_IST,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);

    return `${formatted} IST`;
  } catch (e) {
    return `${d.toLocaleDateString()} IST`;
  }
}

/**
 * Formats date in Indian Standard Time (e.g. "27 Oct 2026 IST")
 */
export function formatISTDate(input: string | Date | number | null | undefined): string {
  const d = parseDateSafely(input);
  if (!d) return '—';

  try {
    const formatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: TIMEZONE_IST,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);

    return `${formatted} IST`;
  } catch (e) {
    return `${d.toLocaleDateString()} IST`;
  }
}

/**
 * Formats time in Indian Standard Time (e.g. "12:19 PM IST")
 */
export function formatISTTime(input: string | Date | number | null | undefined): string {
  const d = parseDateSafely(input);
  if (!d) return '—';

  try {
    const formatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: TIMEZONE_IST,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);

    return `${formatted} IST`;
  } catch (e) {
    return `${d.toLocaleTimeString()} IST`;
  }
}

/**
 * Calculates human-friendly relative time with explicit IST reference for older activities.
 */
export function formatISTTimeAgo(input: string | Date | number | null | undefined): string {
  const d = parseDateSafely(input);
  if (!d) return 'Recently';

  try {
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago (IST)`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return `Yesterday at ${formatISTTime(d)}`;
    if (diffDays < 7) return `${diffDays}d ago (${formatISTDate(d)})`;

    return formatISTDateTime(d);
  } catch {
    return 'Recently';
  }
}

/**
 * Formats study duration in hours and minutes for individual student account tracking.
 */
export function formatStudyTime(minutes: number): {
  hours: number;
  mins: number;
  formatted: string;
  label: string;
} {
  const totalMins = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  let formatted = '';
  if (hours === 0) {
    formatted = `${mins} min${mins === 1 ? '' : 's'}`;
  } else if (mins === 0) {
    formatted = `${hours} hr${hours === 1 ? '' : 's'}`;
  } else {
    formatted = `${hours}h ${mins}m`;
  }

  return {
    hours,
    mins,
    formatted,
    label: `${formatted} (IST logged)`,
  };
}
