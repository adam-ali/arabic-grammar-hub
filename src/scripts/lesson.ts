import { P, L, update, lessonRec, touchDay, onChange, ago } from './store';

const page = document.querySelector<HTMLElement>('[data-lesson]')!;
const id = page.dataset.lesson!;
const book = L[id].b;

// Record the visit, keeping the previous time for the "Last visited" label.
const prevSeen = P.lessons[id]?.seen;
update((p) => {
  lessonRec(p, id).seen = Date.now();
  p.last[book] = id;
  p.lastBook = book;
  touchDay(p);
});
const seenLabel = page.querySelector('[data-seen-label]')!;
seenLabel.textContent = prevSeen ? `Last visited ${ago(prevSeen)}` : 'First visit';

// — revised —
const revBtn = page.querySelector<HTMLButtonElement>('[data-revised]')!;
revBtn.addEventListener('click', () =>
  update((p) => {
    const x = lessonRec(p, id);
    x.rev = !x.rev;
    touchDay(p);
  }),
);

// — drills —
for (const btn of page.querySelectorAll<HTMLButtonElement>('[data-drill]')) {
  btn.addEventListener('click', () =>
    update((p) => {
      const x = lessonRec(p, id);
      const k = btn.dataset.drill!;
      const d = x.drills ?? [];
      x.drills = d.includes(k) ? d.filter((z) => z !== k) : [...d, k];
    }),
  );
}

// — checkpoint —
const cp = page.querySelector<HTMLElement>('[data-checkpoint]');
const cpN = Number(cp?.dataset.checkpoint ?? 0);
cp?.querySelector('[data-reveal]')!.addEventListener('click', () => cp.classList.toggle('revealed'));
for (const btn of cp?.querySelectorAll<HTMLButtonElement>('[data-mark]') ?? []) {
  btn.addEventListener('click', () =>
    update((p) => {
      const x = lessonRec(p, id);
      const i = Number(btn.dataset.mark);
      const v = btn.dataset.v === '1';
      x.marks = x.marks ?? {};
      if (x.marks[i] === v) delete x.marks[i];
      else x.marks[i] = v;
      touchDay(p);
    }),
  );
}

function render() {
  const x = P.lessons[id] ?? {};
  revBtn.setAttribute('aria-pressed', String(!!x.rev));
  for (const btn of page.querySelectorAll<HTMLButtonElement>('[data-drill]')) {
    const on = (x.drills ?? []).includes(btn.dataset.drill!);
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('i')!.className = on ? 'ph-fill ph-check-square' : 'ph ph-square';
  }
  if (cp) {
    const mk = x.marks ?? {};
    for (const btn of cp.querySelectorAll<HTMLButtonElement>('[data-mark]')) {
      btn.setAttribute('aria-pressed', String(mk[Number(btn.dataset.mark)] === (btn.dataset.v === '1')));
    }
    const vals = Object.entries(mk).filter(([k]) => Number(k) < cpN).map(([, v]) => v);
    const right = vals.filter(Boolean).length;
    const label = cp.querySelector('[data-cp-score]')!;
    label.textContent = vals.length
      ? `${right} of ${cpN} right` + (vals.length < cpN ? ` · ${cpN - vals.length} to mark` : '')
      : `${cpN} ${cpN === 1 ? 'answer' : 'answers'} · not scored yet`;
    label.classList.toggle('low', vals.length === cpN && right / cpN < 0.6);
  }
}
render();
onChange(render);

// — sidebar —
for (const btn of document.querySelectorAll('[data-sidebar-toggle]')) {
  btn.addEventListener('click', () => {
    const root = document.documentElement;
    const hide = root.dataset.sidebar !== 'hidden';
    if (hide) root.dataset.sidebar = 'hidden';
    else delete root.dataset.sidebar;
    try {
      localStorage.setItem('agh.sidebar', hide ? 'hidden' : 'shown');
    } catch {
      /* not saved */
    }
  });
}

// — jump sheet —
const sheet = document.getElementById('jump') as HTMLDialogElement;
document.querySelector('[data-open-sheet]')!.addEventListener('click', () => {
  sheet.showModal();
  sheet.querySelector('[data-panel]:not([hidden]) [aria-current="page"]')?.scrollIntoView({ block: 'center' });
});
sheet.querySelector('[data-close-sheet]')!.addEventListener('click', () => sheet.close());
// A click on the backdrop lands on the dialog element itself.
sheet.addEventListener('click', (e) => {
  if (e.target === sheet) sheet.close();
});
for (const tab of sheet.querySelectorAll<HTMLButtonElement>('[data-tab]')) {
  tab.addEventListener('click', () => {
    for (const t of sheet.querySelectorAll('[data-tab]')) t.setAttribute('aria-selected', String(t === tab));
    for (const p of sheet.querySelectorAll<HTMLElement>('[data-panel]')) p.hidden = p.dataset.panel !== tab.dataset.tab;
  });
}

// — arrows and swipe —
const go = (sel: string) => {
  const a = document.querySelector<HTMLAnchorElement>(sel);
  if (a && !a.classList.contains('off')) location.href = a.href;
};
window.addEventListener('keydown', (e) => {
  const t = e.target as HTMLElement | null;
  if (sheet.open || e.metaKey || e.ctrlKey || e.altKey) return;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
  if (e.key === 'ArrowRight') go('[data-next]');
  else if (e.key === 'ArrowLeft') go('[data-prev]');
});
let tx: number | null = null;
let ty = 0;
const main = document.getElementById('main')!;
main.addEventListener('touchstart', (e) => {
  tx = e.touches[0].clientX;
  ty = e.touches[0].clientY;
}, { passive: true });
main.addEventListener('touchend', (e) => {
  if (tx == null) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - tx;
  const dy = t.clientY - ty;
  tx = null;
  // Ignore swipes that start inside a scrolling table.
  if ((e.target as HTMLElement).closest('.table-scroll')) return;
  if (Math.abs(dx) > 70 && Math.abs(dy) < 50) go(dx < 0 ? '[data-next]' : '[data-prev]');
});
