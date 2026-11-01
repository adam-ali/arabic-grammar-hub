import { BOOKS, BK, L, status, STATUS_ICON, STATUS_LABEL, kindOf } from './store';
import { norm, segs, esc, DIA } from '../lib/arabic';

interface Field { label: string; text: string; n: string; map: number[] }
interface Entry { id: string; fields: Field[] }

const main = document.querySelector<HTMLElement>('[data-index]')!;
const input = main.querySelector<HTMLInputElement>('[data-q]')!;
const clear = main.querySelector<HTMLButtonElement>('[data-clear]')!;
const out = main.querySelector<HTMLElement>('[data-results]')!;
const countLabel = main.querySelector<HTMLElement>('[data-result-count]')!;
let filter = 'all';
let index: Entry[] | null = null;

input.value = new URLSearchParams(location.search).get('q') ?? '';

fetch(main.dataset.index!)
  .then((r) => r.json())
  .then((rows: { id: string; f: [string, string][] }[]) => {
    index = rows.map((r) => ({ id: r.id, fields: r.f.map(([label, text]) => ({ label, text, ...norm(text) })) }));
    render();
  })
  .catch(() => (countLabel.textContent = 'Search index failed to load'));

/** Snippet around the match, with Arabic runs styled and the match highlighted. */
function snippet(fd: Field, k: number, qlen: number) {
  const txt = fd.text;
  const a = fd.map[k];
  let b = fd.map[k + qlen - 1] + 1;
  while (b < txt.length && DIA.test(txt[b])) b++;
  let s0 = Math.max(0, a - 40);
  let e0 = Math.min(txt.length, b + 60);
  if (s0 > 0) {
    const sp = txt.indexOf(' ', s0);
    if (sp >= 0 && sp < a) s0 = sp + 1;
  }
  if (e0 < txt.length) {
    const sp = txt.lastIndexOf(' ', e0);
    if (sp > b) e0 = sp;
  }
  const sub = txt.slice(s0, e0);
  const ha = a - s0;
  const hb = b - s0;
  const html = segs(sub)
    .map((g) => {
      const x0 = g.i;
      const x1 = g.i + g.t.length;
      const h0 = Math.min(x1, Math.max(x0, ha));
      const h1 = Math.max(h0, Math.min(x1, hb));
      const inner = esc(sub.slice(x0, h0)) + (h1 > h0 ? `<mark>${esc(sub.slice(h0, h1))}</mark>` : '') + esc(sub.slice(h1, x1));
      return g.ar ? `<span class="ar" lang="ar" dir="rtl">${inner}</span>` : inner;
    })
    .join('');
  return (s0 > 0 ? '… ' : '') + html + (e0 < txt.length ? ' …' : '');
}

function render() {
  const raw = input.value;
  clear.hidden = !raw;
  const q = norm(raw.trim()).n;
  for (const f of main.querySelectorAll<HTMLElement>('[data-filter]')) f.setAttribute('aria-pressed', String(f.dataset.filter === filter));
  if (!index) return;
  const res: { id: string; fd: Field; k: number }[] = [];
  if (q.length) {
    for (const e of index) {
      for (const fd of e.fields) {
        const k = fd.n.indexOf(q);
        if (k >= 0) {
          res.push({ id: e.id, fd, k });
          break;
        }
      }
    }
  }
  const counts: Record<string, number> = { all: res.length };
  for (const b of BOOKS) counts[b.id] = res.filter((r) => L[r.id].b === b.id).length;
  for (const c of main.querySelectorAll<HTMLElement>('[data-count]')) c.textContent = q.length ? String(counts[c.dataset.count!]) : '';
  const shown = res.filter((r) => filter === 'all' || L[r.id].b === filter);
  countLabel.textContent = q.length ? `${shown.length} lesson${shown.length === 1 ? '' : 's'}` : 'Type to search all three books';
  if (q.length && !shown.length) {
    out.innerHTML = `<div class="no-results">No lessons match. Try a root without vowels, like <span class="ar" lang="ar">كتب</span>, or an English term like “passive”.</div>`;
    return;
  }
  out.innerHTML = shown
    .slice(0, 40)
    .map((r) => {
      const z = L[r.id];
      const st = status(r.id);
      return `<a class="card result k-${kindOf(r.id)}" href="${z.url}">
        <span class="top"><span class="sq"></span><span>${esc(BK[z.b].short)} · ${esc(z.m ?? 'Lesson ' + z.n)}</span>
          <span class="stx"><i class="${STATUS_ICON[st]} st" data-status="${st}"></i>${STATUS_LABEL[st]}</span></span>
        <span class="mid"><b>${segs(z.en).map((g) => (g.ar ? `<span class="ar" lang="ar" dir="rtl">${esc(g.t)}</span>` : esc(g.t))).join('')}</b>
          <span class="arf" lang="ar" dir="rtl">${esc(z.ar)}</span></span>
        <span class="snip"><small>${esc(r.fd.label)}</small>${snippet(r.fd, r.k, q.length)}</span>
      </a>`;
    })
    .join('');
}

input.addEventListener('input', () => {
  const u = new URL(location.href);
  if (input.value) u.searchParams.set('q', input.value);
  else u.searchParams.delete('q');
  history.replaceState(null, '', u);
  render();
});
clear.addEventListener('click', () => {
  input.value = '';
  input.dispatchEvent(new Event('input'));
  input.focus();
});
for (const f of main.querySelectorAll<HTMLElement>('[data-filter]')) {
  f.addEventListener('click', () => {
    filter = f.dataset.filter!;
    render();
  });
}
render();
