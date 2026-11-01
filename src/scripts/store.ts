// Progress saved in this browser, plus the page data the build embeds.
import type { ClientData } from '../lib/content';

export type Data = ClientData;
export type BookId = Data['books'][number]['id'];
export type LessonInfo = Data['lessons'][string];

export const DATA: Data = JSON.parse(document.getElementById('agh-data')!.textContent!);
export const BOOKS = DATA.books;
export const BK = Object.fromEntries(BOOKS.map((b) => [b.id, b])) as Record<string, Data['books'][number]>;
export const L = DATA.lessons;

export interface LessonProgress {
  rev?: boolean;
  seen?: number;
  /** Checkpoint answer index → marked right (true) or wrong (false). */
  marks?: Record<number, boolean>;
  drills?: string[];
}
export interface Progress {
  v: 1;
  lessons: Record<string, LessonProgress>;
  /** ISO dates (YYYY-MM-DD) with any study activity. */
  days: string[];
  /** Schedule entry indexes ticked off, per book. */
  sched: Record<string, number[]>;
  last: Record<string, string>;
  lastBook?: string;
}

const KEY = 'agh.progress.v1';
const DAY = 864e5;
export const dkey = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const empty = (): Progress => ({ v: 1, lessons: {}, days: [], sched: {}, last: {} });

/** The old hub page kept ticks under "revised" as {n26: true, s2_6: true, s5: true}. */
function migrate(p: Progress) {
  try {
    const old = JSON.parse(localStorage.getItem('revised') || 'null') as Record<string, boolean> | null;
    if (!old) return;
    const map: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(old)) {
      if (!v) continue;
      const m = k.match(/^(n|s2|s)(\d+)$/);
      if (!m) continue;
      const book = m[1] === 'n' ? 'nahw' : m[1] === 's2' ? 'sarf2' : 'sarf3';
      const ids = book === 'sarf2' && m[2] === '6' ? ['sarf2-6a', 'sarf2-6b'] : [`${book}-${m[2]}`];
      (map[book] ??= []).push(...ids);
    }
    for (const ids of Object.values(map)) for (const id of ids) if (L[id]) p.lessons[id] = { ...p.lessons[id], rev: true };
  } catch {
    /* ignore a broken old record */
  }
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.lessons) return { ...empty(), ...p };
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  const p = empty();
  migrate(p);
  return p;
}

export let P: Progress = load();

const listeners = new Set<() => void>();
export const onChange = (fn: () => void) => listeners.add(fn);

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(P));
  } catch {
    /* private mode: progress lasts for this page only */
  }
  listeners.forEach((fn) => fn());
}

export function update(fn: (p: Progress) => void) {
  fn(P);
  save();
}
export function replace(p: Progress) {
  P = { ...empty(), ...p };
  save();
}
export const touchDay = (p: Progress) => {
  const d = dkey(Date.now());
  if (!p.days.includes(d)) p.days.push(d);
};
export const lessonRec = (p: Progress, id: string) => (p.lessons[id] ??= {});

// Window events from other tabs keep pages in step.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    P = load();
    listeners.forEach((fn) => fn());
  }
});

export type Status = 'revised' | 'reading' | 'not';
export const lp = (id: string): LessonProgress => P.lessons[id] ?? {};
export const status = (id: string): Status => {
  const x = lp(id);
  return x.rev ? 'revised' : x.seen ? 'reading' : 'not';
};
export const STATUS_LABEL: Record<Status, string> = { revised: 'Revised', reading: 'Reading', not: 'Not started' };
export const STATUS_ICON: Record<Status, string> = { revised: 'ph-fill ph-check-circle', reading: 'ph ph-circle-half', not: 'ph ph-circle' };

/** [right, total, marked] from checkpoint marks, or null when nothing is marked. */
export function score(id: string): [number, number, number] | null {
  const n = L[id]?.cp ?? 0;
  const marks = lp(id).marks;
  if (!n || !marks) return null;
  const vals = Object.entries(marks).filter(([k]) => Number(k) < n).map(([, v]) => v);
  if (!vals.length) return null;
  return [vals.filter(Boolean).length, n, vals.length];
}
/** Score ratio once every answer is marked. */
export const finalRatio = (id: string) => {
  const s = score(id);
  return s && s[2] === s[1] ? s[0] / s[1] : null;
};

export function bookStats(bid: string) {
  const b = BK[bid];
  const rv = b.lessonIds.filter((id) => status(id) === 'revised').length;
  return { rv, n: b.lessonIds.length, pct: Math.round((rv / b.lessonIds.length) * 100) };
}

/** Where "Continue" goes: the last page opened, or the next one if that's revised. */
export function contId(bid: string) {
  const b = BK[bid];
  let id = P.last[bid] || b.lessonIds[0];
  if (status(id) === 'revised') {
    const i = b.seq.indexOf(id);
    id = b.seq[i + 1] || id;
  }
  return id;
}

/** Index of the first schedule entry not yet ticked off. */
export function curEntry(bid: string) {
  const done = P.sched[bid] ?? [];
  const n = BK[bid].schedule.length;
  for (let i = 0; i < n; i++) if (!done.includes(i)) return i;
  return n - 1;
}
export const firstWeek = (weeks: string) => weeks.split('–')[0];

export function streak() {
  let n = 0;
  let t = Date.now();
  if (!P.days.includes(dkey(t))) t -= DAY;
  while (P.days.includes(dkey(t))) {
    n++;
    t -= DAY;
  }
  return n;
}

export function ago(ts: number) {
  const m = (Date.now() - ts) / 6e4;
  if (m < 2) return 'just now';
  if (m < 60) return Math.round(m) + ' min ago';
  const h = m / 60;
  if (h < 24) return Math.round(h) + ' h ago';
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : d + ' days ago';
}

export const lessonLabel = (id: string) => {
  const l = L[id];
  return l.m ? l.en : `Lesson ${l.n}`;
};
export const kindOf = (id: string) => BK[L[id].b].kind;
