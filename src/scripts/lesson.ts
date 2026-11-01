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

// — checkpoint: tap a question to open its answer, then mark it —
const cp = page.querySelector<HTMLElement>('[data-checkpoint]');
const cpN = Number(cp?.dataset.checkpoint ?? 0);
const items = Array.from(cp?.querySelectorAll<HTMLElement>('.cp-item') ?? []);
const setOpen = (li: HTMLElement, open: boolean) => {
  li.classList.toggle('open', open);
  li.querySelector('.cp-q')!.setAttribute('aria-expanded', String(open));
};
for (const li of items) li.querySelector('.cp-q')!.addEventListener('click', () => setOpen(li, !li.classList.contains('open')));
cp?.querySelector('[data-reveal]')!.addEventListener('click', () => {
  const show = !cp.classList.contains('revealed');
  cp.classList.toggle('revealed', show);
  items.forEach((li) => setOpen(li, show));
});
cp?.querySelector('[data-reset]')!.addEventListener('click', () => {
  update((p) => {
    delete lessonRec(p, id).marks;
  });
  cp.classList.remove('revealed');
  items.forEach((li) => setOpen(li, false));
  items[0]?.querySelector<HTMLElement>('.cp-q')!.focus();
});
for (const btn of cp?.querySelectorAll<HTMLButtonElement>('[data-mark]') ?? []) {
  btn.addEventListener('click', () => {
    const i = Number(btn.dataset.mark);
    const v = btn.dataset.v === '1';
    let marked = false;
    update((p) => {
      const x = lessonRec(p, id);
      x.marks = x.marks ?? {};
      if (x.marks[i] === v) delete x.marks[i];
      else {
        x.marks[i] = v;
        marked = true;
      }
      touchDay(p);
    });
    // Move straight on to the next unmarked question.
    if (marked && !cp!.classList.contains('revealed')) {
      const mk = P.lessons[id]?.marks ?? {};
      const next = items.find((_, j) => j > i && mk[j] === undefined);
      if (next) {
        setOpen(next, true);
        next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  });
}

function render() {
  const x = P.lessons[id] ?? {};
  revBtn.setAttribute('aria-pressed', String(!!x.rev));
  if (cp) {
    const mk = x.marks ?? {};
    for (const btn of cp.querySelectorAll<HTMLButtonElement>('[data-mark]')) {
      btn.setAttribute('aria-pressed', String(mk[Number(btn.dataset.mark)] === (btn.dataset.v === '1')));
    }
    items.forEach((li, j) => (li.dataset.mark = mk[j] === undefined ? '' : mk[j] ? 'right' : 'wrong'));
    cp.querySelectorAll<HTMLElement>('.cp-meter span').forEach((d, j) => (d.dataset.mark = mk[j] === undefined ? '' : mk[j] ? 'right' : 'wrong'));
    const vals = Object.entries(mk).filter(([k]) => Number(k) < cpN).map(([, v]) => v);
    const right = vals.filter(Boolean).length;
    const label = cp.querySelector('[data-cp-score]')!;
    label.textContent = vals.length
      ? `${right} of ${cpN} right` + (vals.length < cpN ? ` · ${cpN - vals.length} to go` : '')
      : `${cpN} ${cpN === 1 ? 'question' : 'questions'} · not scored yet`;
    label.classList.toggle('low', vals.length === cpN && right / cpN < 0.6);
  }
}
render();
onChange(render);

// — colour key: tap a colour to spotlight it, or turn colours off —
const legend = page.querySelector<HTMLElement>('[data-legend]');
if (legend) {
  const colorsBtn = legend.querySelector<HTMLButtonElement>('[data-colors-toggle]')!;
  const syncColors = () => {
    const off = document.documentElement.dataset.colors === 'off';
    colorsBtn.setAttribute('aria-pressed', String(!off));
    colorsBtn.querySelector('span')!.textContent = off ? 'Colours off' : 'Colours on';
  };
  colorsBtn.addEventListener('click', () => {
    const off = document.documentElement.dataset.colors !== 'off';
    if (off) document.documentElement.dataset.colors = 'off';
    else delete document.documentElement.dataset.colors;
    try {
      localStorage.setItem('agh.colors', off ? 'off' : 'on');
    } catch {
      /* not saved */
    }
    syncColors();
  });
  syncColors();
  for (const chip of legend.querySelectorAll<HTMLButtonElement>('[data-spot]')) {
    chip.addEventListener('click', () => {
      const on = page.dataset.spotlight !== chip.dataset.spot;
      if (on) page.dataset.spotlight = chip.dataset.spot;
      else delete page.dataset.spotlight;
      for (const c of legend.querySelectorAll('[data-spot]')) c.setAttribute('aria-pressed', String(on && c === chip));
    });
  }
}

// — sentence diagrams: tap a word to see its إِعْرَاب —
for (const fig of page.querySelectorAll<HTMLElement>('.parse')) {
  const words = Array.from(fig.querySelectorAll<HTMLButtonElement>('.p-word'));
  const lines = Array.from(fig.querySelectorAll<HTMLElement>('.p-details li'));
  const all = fig.querySelector<HTMLButtonElement>('.p-all')!;
  const pick = (i: number | null) => {
    words.forEach((w, j) => w.setAttribute('aria-pressed', String(j === i)));
    lines.forEach((li, j) => li.classList.toggle('on', j === i));
    fig.classList.toggle('picked', i !== null);
  };
  words.forEach((w, i) =>
    w.addEventListener('click', () => {
      fig.classList.remove('all');
      all.setAttribute('aria-pressed', 'false');
      pick(w.getAttribute('aria-pressed') === 'true' ? null : i);
    }),
  );
  all.addEventListener('click', () => {
    const on = !fig.classList.contains('all');
    fig.classList.toggle('all', on);
    all.setAttribute('aria-pressed', String(on));
    all.textContent = on ? 'Hide all' : 'Show all';
    pick(null);
  });
}

// — tables: test yourself by covering columns, then tap a cell to check it —
for (const wrap of page.querySelectorAll<HTMLElement>('.prose .table-scroll')) {
  const table = wrap.querySelector('table')!;
  const rows = Array.from(table.tBodies[0]?.rows ?? []);
  const heads = Array.from(table.tHead?.rows[0]?.cells ?? []);
  if (rows.length < 2 || heads.length < 2) continue;
  const bar = document.createElement('div');
  bar.className = 'tbl-bar';
  bar.innerHTML =
    '<span class="tbl-hint" hidden>Tap a heading to cover or uncover its column, then tap a cell to check it.</span>' +
    '<button type="button" class="tbl-cover" aria-pressed="false"><i class="ph ph-eye-closed"></i><span>Test yourself</span></button>';
  wrap.before(bar);
  const btn = bar.querySelector('button')!;
  const hint = bar.querySelector<HTMLElement>('.tbl-hint')!;
  const covered = new Set<number>();
  const paint = () => {
    heads.forEach((th, c) => {
      th.classList.toggle('col-covered', covered.has(c));
      if (table.classList.contains('covered')) th.setAttribute('aria-pressed', String(covered.has(c)));
      else th.removeAttribute('aria-pressed');
    });
    for (const tr of rows) Array.from(tr.cells).forEach((td, c) => td.classList.toggle('cov', covered.has(c)));
  };
  btn.addEventListener('click', () => {
    const on = !table.classList.contains('covered');
    table.classList.toggle('covered', on);
    covered.clear();
    // Start with every column but the first covered.
    if (on) heads.forEach((_, c) => c > 0 && covered.add(c));
    table.querySelectorAll('td.shown').forEach((td) => td.classList.remove('shown'));
    heads.forEach((th) => (on ? th.setAttribute('role', 'button') : th.removeAttribute('role')));
    heads.forEach((th) => (on ? (th.tabIndex = 0) : th.removeAttribute('tabindex')));
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('span')!.textContent = on ? 'Done' : 'Test yourself';
    hint.hidden = !on;
    paint();
  });
  const toggleCol = (c: number) => {
    if (!table.classList.contains('covered')) return;
    if (covered.has(c)) covered.delete(c);
    else covered.add(c);
    rows.forEach((tr) => tr.cells[c]?.classList.remove('shown'));
    paint();
  };
  heads.forEach((th, c) => {
    th.addEventListener('click', () => toggleCol(c));
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCol(c);
      }
    });
  });
  table.addEventListener('click', (e) => {
    const td = (e.target as HTMLElement).closest('td');
    if (td?.classList.contains('cov')) td.classList.toggle('shown');
  });
}

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
