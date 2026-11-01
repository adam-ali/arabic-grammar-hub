import {
  P, BOOKS, BK, L, onChange, update, replace, status, bookStats, contId, curEntry, firstWeek, streak, ago,
  finalRatio, score, dkey, kindOf, touchDay, type Progress,
} from './store';
import { flash } from './app';
import { arHtml, esc } from '../lib/arabic';

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const d = (k: string) => $(`[data-d="${k}"]`);

const params = new URLSearchParams(location.search);
let schedBook = params.get('book') && BK[params.get('book')!]?.schedule.length ? params.get('book')! : P.last.sarf3 ? 'sarf3' : 'sarf2';

function render() {
  const all = BOOKS.flatMap((b) => b.lessonIds);
  const rv = all.filter((id) => status(id) === 'revised').length;
  d('revised').textContent = String(rv);
  d('revisedOf').textContent = `of ${all.length} lessons`;
  for (const b of BOOKS) $(`[data-stack="${b.id}"]`).style.width = (bookStats(b.id).rv / all.length) * 100 + '%';

  d('streak').textContent = String(streak());
  d('days').innerHTML = Array.from({ length: 14 }, (_, i) => {
    const k = dkey(Date.now() - (13 - i) * 864e5);
    return `<span title="${k}"${P.days.includes(k) ? ' class="on"' : ''}></span>`;
  }).join('');

  const wb = P.last.sarf3 ? 'sarf3' : 'sarf2';
  const we = BK[wb].schedule[curEntry(wb)];
  d('weekTitle').textContent = `${BK[wb].short} · week ${firstWeek(we.weeks)}`;
  d('weekSub').innerHTML = arHtml(we.lessonId ? `Lesson ${L[we.lessonId].n} · ${L[we.lessonId].en}` : we.label);

  // next lesson
  const nid = contId(P.lastBook && BK[P.lastBook] ? P.lastBook : 'nahw');
  const nl = L[nid];
  const seen = P.lessons[nid]?.seen;
  const next = d('next');
  next.className = `card dash-card k-${kindOf(nid)}`;
  next.innerHTML = `
    <div class="card-kicker" style="color:var(--book-ink)">Next lesson · ${esc(BK[nl.b].short)}</div>
    <div class="next-line">
      ${nl.m ? '' : `<span class="n">Lesson ${esc(nl.n)}</span>`}
      <span class="en">${arHtml(nl.en)}</span>
      <span class="arf" lang="ar" dir="rtl">${esc(nl.ar)}</span>
    </div>
    <div class="muted" style="font-size:12.5px">${esc([nl.pages, seen ? 'last visited ' + ago(seen) : 'not started'].filter(Boolean).join(' · '))}</div>
    <div><a class="btn btn-primary" style="height:42px" href="${nl.url}"><i class="ph ph-play"></i>Continue reading</a></div>`;

  // weak lessons: every checkpoint answer marked and under 60% right
  const weak = Object.keys(L)
    .map((id) => ({ id, r: finalRatio(id) }))
    .filter((w): w is { id: string; r: number } => w.r !== null && w.r < 0.6)
    .sort((a, b) => a.r - b.r);
  const q = d('queue') as HTMLAnchorElement;
  q.hidden = !weak.length;
  if (weak.length) {
    q.href = L[weak[0].id].url;
    q.querySelector('span')!.textContent = `Revise these (${weak.length})`;
  }
  d('weak').innerHTML = weak.length
    ? weak
        .map((w) => {
          const z = L[w.id];
          const s = score(w.id)!;
          return `<a class="weak-row row-rule k-${kindOf(w.id)}" href="${z.url}">
            <span class="sq"></span>
            <span class="l"><small>${esc(BK[z.b].short)} · ${z.m ? esc(z.en) : 'L' + esc(z.n)}</small><span>${arHtml(z.en)}</span></span>
            <span class="r"><span class="mini-bar"><span style="width:${Math.round(w.r * 100)}%"></span></span><span>${s[0]}/${s[1]}</span></span>
          </a>`;
        })
        .join('')
    : '<div class="empty-note">Nothing here yet. Lessons show up when you score under 60% on a checkpoint.</div>';

  // schedule
  const sb = BK[schedBook];
  $('#schedule').className = `k-${sb.kind}`;
  const cur = curEntry(schedBook);
  const done = P.sched[schedBook] ?? [];
  $('[data-sched-title]').textContent = `${sb.title} · week ${firstWeek(sb.schedule[cur].weeks)} of ${sb.weeks}`;
  for (const t of document.querySelectorAll<HTMLElement>('[data-sched-tab]')) t.setAttribute('aria-selected', String(t.dataset.schedTab === schedBook));
  for (const p of document.querySelectorAll<HTMLElement>('[data-sched-panel]')) p.hidden = p.dataset.schedPanel !== schedBook;
  const panel = $(`[data-sched-panel="${schedBook}"]`);
  for (const w of panel.querySelectorAll<HTMLButtonElement>('[data-week]')) {
    const i = Number(w.dataset.week);
    const dn = done.includes(i);
    const now = i === cur && !dn;
    w.classList.toggle('done', dn);
    w.classList.toggle('now', now);
    w.setAttribute('aria-pressed', String(dn));
    w.querySelector('i')!.className = dn ? 'ph-fill ph-check-circle' : w.classList.contains('review') ? 'ph ph-arrows-clockwise' : 'ph ph-circle';
  }
}

for (const t of document.querySelectorAll<HTMLElement>('[data-sched-tab]')) {
  t.addEventListener('click', () => {
    schedBook = t.dataset.schedTab!;
    const u = new URL(location.href);
    u.searchParams.set('book', schedBook);
    history.replaceState(null, '', u);
    render();
  });
}
for (const w of document.querySelectorAll<HTMLButtonElement>('[data-week]')) {
  w.addEventListener('click', () => {
    const i = Number(w.dataset.week);
    update((p) => {
      const a = p.sched[schedBook] ?? [];
      p.sched[schedBook] = a.includes(i) ? a.filter((x) => x !== i) : [...a, i];
      touchDay(p);
    });
  });
}

// — export / import —
$('[data-export]').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(P, null, 2)], { type: 'application/json' }));
  a.download = 'arabic-grammar-hub-progress.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  flash('Progress exported');
});
const file = $<HTMLInputElement>('[data-file]');
$('[data-import]').addEventListener('click', () => file.click());
file.addEventListener('change', () => {
  const f = file.files?.[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const p = JSON.parse(String(r.result)) as Progress;
      if (!p || typeof p.lessons !== 'object') throw new Error('not a progress file');
      replace(p);
      flash('Progress imported');
    } catch {
      flash('That file isn’t a progress export');
    }
  };
  r.readAsText(f);
  file.value = '';
});

render();
onChange(render);
