export function nid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`;
}

export function slug(text: string): string {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return s || nid('b');
}

export function todayHeading(d = new Date(), voice: 'long' | 'short' = 'long'): string {
  return voice === 'short'
    ? d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function shortDate(d = new Date(), voice: 'long' | 'short' = 'short'): string {
  return voice === 'long'
    ? d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function weekOf(d = new Date()): string {
  return `Week of ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

export function relativeSaved(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const mins = Math.round((now - t) / 60000);
  if (mins < 2) return 'just now';
  if (mins < 80) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 30) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 11) return `${days} days ago`;
  return shortDate(new Date(t));
}
