import { rng, type Rng } from './seed';

export type Pt = { x: number; y: number };

/** A single pen stroke: SVG path data plus its approximate length (for draw-on). */
export type Stroke = { d: string; length: number; width?: number; opacity?: number };

const f = (n: number) => Math.round(n * 10) / 10;

function polyLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
}

/** Catmull-Rom through the points, as cubic beziers. */
function smooth(pts: Pt[]): string {
  if (pts.length < 2) return '';
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(p2.x)} ${f(p2.y)}`;
  }
  return d;
}

function stroke(pts: Pt[], extra?: Partial<Stroke>): Stroke {
  return { d: smooth(pts), length: polyLength(pts) * 1.04 + 2, ...extra };
}

/** A line that drifts slightly, the way a hand does over a short distance. */
function wobblyLine(a: Pt, b: Pt, r: Rng, wobble: number, bow = 0): Pt[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(3, Math.round(len / 28));
  const nx = -(b.y - a.y) / (len || 1);
  const ny = (b.x - a.x) / (len || 1);
  const phase = r.range(0, Math.PI * 2);
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sway = Math.sin(t * Math.PI) * bow + Math.sin(t * 5.3 + phase) * wobble * 0.6 + r.range(-0.4, 0.4) * wobble;
    pts.push({ x: a.x + (b.x - a.x) * t + nx * sway, y: a.y + (b.y - a.y) * t + ny * sway });
  }
  return pts;
}

export function underline(width: number, height: number, seed: string, double = false): Stroke[] {
  const r = rng(`ul:${seed}`);
  const y = height - 3;
  const rise = r.range(-1.6, 0.6);
  const a = { x: r.range(0, 4), y: y + r.range(-0.6, 0.6) };
  const b = { x: width - r.range(0, 6), y: y + rise };
  const out = [stroke(wobblyLine(a, b, r, 0.9, r.range(-1.2, 1.2)))];
  if (double) {
    const a2 = { x: width * r.range(0.08, 0.2), y: y + 3.5 };
    const b2 = { x: width * r.range(0.8, 0.95), y: y + 3 + rise };
    out.push(stroke(wobblyLine(a2, b2, r, 0.8, r.range(-1, 1)), { width: 0.8, opacity: 0.8 }));
  }
  return out;
}

/** An ellipse drawn in one motion, overshooting where it started. */
export function circle(width: number, height: number, seed: string): Stroke[] {
  const r = rng(`circ:${seed}`);
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2 - 2;
  const ry = height / 2 - 2;
  const start = r.range(-2.4, -1.6);
  const sweep = Math.PI * 2 + r.range(0.25, 0.55);
  const tiltA = r.range(-0.06, 0.06);
  const pts: Pt[] = [];
  const n = 36;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ang = start + sweep * t;
    // Radius drifts outward as the pen comes around, so the ends don't meet.
    const grow = 1 + t * r.range(0.03, 0.08) + Math.sin(ang * 2 + r.next()) * 0.025;
    const x = Math.cos(ang) * rx * grow;
    const y = Math.sin(ang) * ry * grow;
    pts.push({ x: cx + x * Math.cos(tiltA) - y * Math.sin(tiltA), y: cy + x * Math.sin(tiltA) + y * Math.cos(tiltA) });
  }
  return [stroke(pts)];
}

export function arrow(from: Pt, to: Pt, seed: string, curve = 0.18): Stroke[] {
  const r = rng(`arr:${seed}`);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bend = len * curve * (r.chance(0.5) ? 1 : 1);
  const pts: Pt[] = [];
  const steps = Math.max(6, Math.round(len / 18));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sway = Math.sin(t * Math.PI) * bend + r.range(-0.5, 0.5);
    pts.push({ x: from.x + dx * t + nx * sway, y: from.y + dy * t + ny * sway });
  }
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 3] ?? pts[0];
  const ang = Math.atan2(end.y - prev.y, end.x - prev.x);
  const head = Math.min(11, len * 0.25);
  const wing = (side: number) => {
    const a = ang + Math.PI + side * r.range(0.42, 0.55);
    return [
      { x: end.x + Math.cos(a) * head, y: end.y + Math.sin(a) * head },
      { x: end.x + r.range(-0.4, 0.4), y: end.y + r.range(-0.4, 0.4) },
    ];
  };
  return [stroke(pts), stroke(wing(1)), stroke(wing(-1))];
}

export function bracket(height: number, seed: string, side: 'left' | 'right' = 'left'): Stroke[] {
  const r = rng(`br:${seed}`);
  const w = 7;
  const s = side === 'left' ? 1 : -1;
  const x0 = side === 'left' ? w : 0;
  const pts: Pt[] = [
    { x: x0 + s * r.range(0, 1), y: 1 },
    { x: x0 - s * w * 0.7, y: height * 0.06 },
    { x: x0 - s * w * 0.75, y: height * 0.45 },
    { x: x0 - s * w, y: height * 0.5 },
    { x: x0 - s * w * 0.72, y: height * 0.55 },
    { x: x0 - s * w * 0.68, y: height * 0.94 },
    { x: x0 + s * r.range(0, 1.5), y: height - 1 },
  ];
  return [stroke(pts)];
}

export function check(size: number, seed: string): Stroke[] {
  const r = rng(`chk:${seed}`);
  return [
    stroke([
      { x: size * 0.08, y: size * r.range(0.5, 0.58) },
      { x: size * 0.36, y: size * 0.84 },
      { x: size * r.range(0.86, 0.96), y: size * r.range(0.06, 0.16) },
    ]),
  ];
}

export function crossOut(width: number, height: number, seed: string): Stroke[] {
  const r = rng(`x:${seed}`);
  const y = height * r.range(0.48, 0.58);
  return [stroke(wobblyLine({ x: -2, y: y + r.range(-1, 1) }, { x: width + 2, y: y + r.range(-2, 1) }, r, 0.7, r.range(-1.5, 1.5)))];
}

/** Five-point star in one pen stroke. Not a sparkle. */
export function star(size: number, seed: string): Stroke[] {
  const r = rng(`star:${seed}`);
  const c = size / 2;
  const R = size / 2 - 1;
  const pts: Pt[] = [];
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + i * ((Math.PI * 4) / 5) + r.range(-0.05, 0.05);
    pts.push({ x: c + Math.cos(a) * R * r.range(0.92, 1.04), y: c + Math.sin(a) * R * r.range(0.92, 1.04) });
  }
  return [{ d: `M${pts.map((p) => `${f(p.x)} ${f(p.y)}`).join(' L')}`, length: polyLength(pts) + 2 }];
}

export function question(size: number, seed: string): Stroke[] {
  const r = rng(`q:${seed}`);
  const s = size;
  return [
    stroke([
      { x: s * 0.24, y: s * 0.3 },
      { x: s * 0.36, y: s * 0.1 },
      { x: s * 0.6, y: s * 0.06 },
      { x: s * 0.76, y: s * 0.24 },
      { x: s * 0.62, y: s * 0.44 },
      { x: s * r.range(0.48, 0.54), y: s * 0.56 },
      { x: s * 0.5, y: s * 0.7 },
    ]),
    stroke([
      { x: s * 0.49, y: s * 0.86 },
      { x: s * 0.51, y: s * 0.9 },
    ], { width: 2.4 }),
  ];
}

export function divider(width: number, seed: string): Stroke[] {
  const r = rng(`div:${seed}`);
  const y = 6;
  return [stroke(wobblyLine({ x: r.range(0, 8), y }, { x: width - r.range(0, 12), y: y + r.range(-1.5, 1.5) }, r, 1.1, r.range(-1.5, 1.5)))];
}

/** Irregular rectangle outline — for a sheet's edge, a tab, a stamp. */
export function roughRect(width: number, height: number, seed: string, jitter: number, step = 26): string {
  const r = rng(`rect:${seed}`);
  const pts: Pt[] = [];
  const edge = (a: Pt, b: Pt) => {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.max(2, Math.round(len / step));
    const nx = -(b.y - a.y) / (len || 1);
    const ny = (b.x - a.x) / (len || 1);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const j = i === 0 ? 0 : r.range(-jitter, jitter);
      pts.push({ x: a.x + (b.x - a.x) * t + nx * j, y: a.y + (b.y - a.y) * t + ny * j });
    }
  };
  const k = Math.min(jitter, 1);
  edge({ x: k, y: 0 }, { x: width - k, y: 0 });
  edge({ x: width, y: k }, { x: width, y: height - k });
  edge({ x: width - k, y: height }, { x: k, y: height });
  edge({ x: 0, y: height - k }, { x: 0, y: k });
  return `M${pts.map((p) => `${f(p.x)} ${f(p.y)}`).join(' L')} Z`;
}
