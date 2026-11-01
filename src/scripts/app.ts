// Runs on every page: theme, keyboard shortcuts, and filling in progress
// wherever the markup asks for it with data-* hooks.
import {
  P, BK, L, onChange, status, score, finalRatio, bookStats, contId, curEntry, firstWeek, ago,
  lessonLabel, STATUS_ICON, STATUS_LABEL,
} from './store';

const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T & Element>(sel)) as T[];

// — theme —
for (const btn of $$('[data-theme-toggle]')) {
  btn.addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try {
      localStorage.setItem('agh.theme', t);
    } catch {
      /* not saved */
    }
  });
}

// — "/" opens search —
window.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const a = document.querySelector<HTMLAnchorElement>('[data-search-link]');
    if (a) {
      e.preventDefault();
      location.href = a.href;
    }
  }
});

// — toast —
let tt: number | undefined;
export function flash(msg: string) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(tt);
  tt = window.setTimeout(() => (el.hidden = true), 2200);
}

export function hydrate(root: ParentNode = document) {
  for (const el of $$('[data-st]', root)) {
    const st = status(el.dataset.st!);
    el.className = `st ${STATUS_ICON[st]}`;
    el.dataset.status = st;
  }
  for (const el of $$('[data-pill]', root)) {
    const st = status(el.dataset.pill!);
    el.textContent = STATUS_LABEL[st];
    el.dataset.status = st;
  }
  for (const el of $$('[data-score]', root)) {
    const s = score(el.dataset.score!);
    el.hidden = !s;
    if (s) {
      el.querySelector('span')!.textContent = `Checkpoint ${s[0]}/${s[1]}`;
      const r = finalRatio(el.dataset.score!);
      el.classList.toggle('low', r !== null && r < 0.6);
    }
  }
  for (const el of $$('[data-seen]', root)) {
    const ts = P.lessons[el.dataset.seen!]?.seen;
    el.textContent = ts ? 'Visited ' + ago(ts) : '';
  }
  for (const el of $$('[data-here]', root)) {
    const id = el.dataset.here!;
    el.hidden = P.last[L[id].b] !== id;
  }
  for (const el of $$('[data-book-bar]', root)) {
    (el.firstElementChild as HTMLElement).style.width = bookStats(el.dataset.bookBar!).pct + '%';
  }
  for (const el of $$('[data-book-pct]', root)) {
    const s = bookStats(el.dataset.bookPct!);
    el.textContent = el.dataset.format === 'long' ? `${s.pct}% · ${s.rv} of ${s.n} revised` : `${s.pct}%`;
  }
  for (const el of $$('[data-sec-count]', root)) {
    const ids = el.dataset.secCount!.split(',');
    el.textContent = `${ids.filter((id) => status(id) === 'revised').length} of ${ids.length} revised`;
  }
  for (const el of $$<HTMLAnchorElement>('[data-continue]', root)) {
    const id = contId(el.dataset.continue!);
    el.href = L[id].url;
    const lab = el.querySelector('[data-continue-label]');
    if (lab) lab.textContent = lessonLabel(id);
  }
  for (const el of $$('[data-week-tag]', root)) {
    const b = BK[el.dataset.weekTag!];
    el.querySelector('span')!.textContent = `Week ${firstWeek(b.schedule[curEntry(b.id)].weeks)} of ${b.weeks}`;
  }
  for (const el of $$<HTMLAnchorElement>('[data-nav-book]', root)) {
    const b = P.lastBook && BK[P.lastBook];
    if (b) {
      el.href = b.url;
      el.textContent = b.title;
    }
  }
}

hydrate();
onChange(() => hydrate());
