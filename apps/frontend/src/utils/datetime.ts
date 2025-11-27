export function formatRelativeTime(timestamp?: string | number) {
  if (!timestamp) return '—';

  let date: Date;
  if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    // Check if it's a numeric string (Unix timestamp)
    if (/^\d+$/.test(timestamp)) {
      const numericTimestamp = parseInt(timestamp, 10);
      // If it's a 10-digit number, it's likely seconds; if 13-digit, it's milliseconds
      const timeMs = numericTimestamp < 10000000000 ? numericTimestamp * 1000 : numericTimestamp;
      date = new Date(timeMs);
    } else {
      // ISO date string or other date format
      date = new Date(timestamp);
    }
  } else {
    return '—';
  }

  if (Number.isNaN(date.getTime())) return '—';

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}
