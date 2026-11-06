import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { visit, SKIP } from 'unist-util-visit';
import type { Root as MdRoot, RootContent, PhrasingContent } from 'mdast';
import type { Root as HRoot, Element, ElementContent, Properties } from 'hast';
import { segs, isArabicOnly, norm } from './arabic';

export const parseMd = (src: string): MdRoot =>
  unified().use(remarkParse).use(remarkGfm).parse(src) as MdRoot;

export interface RenderOpts {
  /** Colour grammar terms (فَاعِل، مَنْصُوب…) by the case they take. Used for nahw. */
  roles?: boolean;
}

// — colour coding —

/** The colours: a verb, the four cases, and particles. */
export const ROLES = ['verb', 'raf', 'nasb', 'jarr', 'jazm', 'harf'] as const;
export type Role = (typeof ROLES)[number];

const ONE: Record<string, Role> = {};
const TWO: Record<string, Role> = {};
const add = (role: Role, words: string) =>
  words.split(/\s*,\s*/).forEach((w) => ((w.includes(' ') ? TWO : ONE)[w] = role));
add('verb', 'فعل, افعال, فعليه');
add('raf', 'رفع, رفعه, رفعها, مرفوع, مرفوعه, مرفوعا, مرفوعان, مرفوعات, مرفوعين, مرفوعون, فاعل, فاعلا, مبتدا, نائب الفاعل, اسم كان, خبر ان');
add('nasb', 'نصب, نصبه, نصبها, منصوب, منصوبه, منصوبا, منصوبان, منصوبات, منصوبين, مفعول, مفعولا, حال, تمييز, ظرف, ظروف, خبر كان, اسم ان, مفعول به, مفعول فيه, مفعول مطلق, مفعول لاجله, مفعول معه');
add('jarr', 'جر, جره, جرها, خفض, خفضه, مجرور, مجروره, مجرورا, مخفوض, مضاف اليه');
add('jazm', 'جزم, جزمه, مجزوم, مجزومه, مجزوما');

/** Normalise one word for lookup: no vowels, no punctuation, no "and", no الْ. */
function key(word: string) {
  let w = norm(word).n.replace(/[()،؛:.,؟?!‌]/g, '');
  const bare = (s: string) => s.replace(/^(?:ال|بال|كال|لل)(?=..)/, '');
  if (ONE[bare(w)] || TWO[bare(w)]) return bare(w);
  if (/^[وف]/.test(w)) w = w.slice(1);
  return bare(w);
}
function lookupTwo(a: string, b: string): Role | undefined {
  // "مَفْعُولٌ بِهِ", "اسْمُ إِنَّ", "نَائِبُ الْفَاعِلِ": the second word keeps its الْ.
  const nb = norm(b).n.replace(/[()،؛:.,]/g, '');
  return TWO[`${key(a)} ${nb}`] ?? TWO[`${key(a)} ${key(b)}`];
}

const term = (role: Role, kids: ElementContent[]): Element => ({
  type: 'element',
  tagName: 'span',
  properties: { className: ['term', `c-${role}`], dataC: role },
  children: kids,
});

/** Split an Arabic run into words, wrapping grammar terms in coloured spans. */
function colorize(run: string): ElementContent[] {
  const toks = run.split(/(\s+)/);
  const out: ElementContent[] = [];
  let plain = '';
  const flush = () => {
    if (plain) out.push({ type: 'text', value: plain });
    plain = '';
  };
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (!t || /^\s+$/.test(t)) {
      plain += t;
      continue;
    }
    const two = i + 2 < toks.length ? lookupTwo(t, toks[i + 2]) : undefined;
    if (two) {
      flush();
      out.push(term(two, [{ type: 'text', value: t + toks[i + 1] + toks[i + 2] }]));
      i += 2;
      continue;
    }
    const one = ONE[key(t)];
    if (one) {
      flush();
      out.push(term(one, [{ type: 'text', value: t }]));
    } else plain += t;
  }
  flush();
  return out;
}

const arSpan = (t: string, roles: boolean): Element => ({
  type: 'element',
  tagName: 'span',
  properties: { className: ['ar'], lang: 'ar', dir: 'rtl' },
  children: roles ? colorize(t) : [{ type: 'text', value: t }],
});

// — diagrams, written as ```tree and ```parse code blocks —

const el = (tagName: string, properties: Properties, children: ElementContent[] = []): Element => ({
  type: 'element',
  tagName,
  properties,
  children,
});
const txt = (value: string): ElementContent => ({ type: 'text', value });

interface TNode {
  label: string;
  note: string;
  role?: string;
  kids: TNode[];
}
/** "label | note {role}" */
function tnode(line: string): TNode {
  let s = line.trim().replace(/^-\s+/, '');
  let role: string | undefined;
  const m = s.match(/\s*\{(\w+)\}\s*$/);
  if (m) {
    role = m[1];
    s = s.slice(0, m.index);
  }
  const [label, ...rest] = s.split(/\s+\|\s+/);
  return { label: label.trim(), note: rest.join(' | ').trim(), role, kids: [] };
}

function nodeEl(n: TNode, cls: string, tag = 'span'): Element {
  // Labels mix English and Arabic, so lay each one out left to right even inside the right-to-left row.
  return el(tag, { className: [cls, ...(n.role ? [`c-${n.role}`] : [])], dir: 'ltr' }, [
    el('b', {}, [txt(n.label)]),
    ...(n.note ? [el('small', {}, [txt(n.note)])] : []),
  ]);
}

/**
 * A tree: the first line is the root, "- " lines are its branches and
 * "  - " lines are leaves under the branch above.
 */
function treeEl(src: string): Element {
  const lines = src.split('\n').filter((l) => l.trim());
  const root = tnode(lines[0]);
  for (const line of lines.slice(1)) {
    const depth = line.match(/^\s*/)![0].length >= 2 ? 2 : 1;
    const n = tnode(line);
    if (depth === 1 || !root.kids.length) root.kids.push(n);
    else root.kids[root.kids.length - 1].kids.push(n);
  }
  // Up to four branches fit side by side; more read better as a list.
  const wide = root.kids.length <= 4;
  return el('figure', { className: ['diagram', 'tree', wide ? 'tree-h' : 'tree-v'], role: 'img', ariaLabel: `Tree diagram: ${root.label}` }, [
    el('div', { className: ['t-root'] }, [nodeEl(root, 't-node')]),
    el('div', { className: ['t-kids'], dir: 'rtl' },
      root.kids.map((k) =>
        el('div', { className: ['t-branch'] }, [
          nodeEl(k, 't-node'),
          ...(k.kids.length ? [el('ul', { className: ['t-leaves'] }, k.kids.map((g) => nodeEl(g, 't-leaf', 'li')))] : []),
        ]),
      ),
    ),
  ]);
}

/** A sentence, one word per line: "word | short role | colour | full إِعْرَاب". An optional first line without "|" replaces the tap hint. */
function parseEl(src: string): Element {
  const lines = src.split('\n').filter((l) => l.trim());
  const hint = lines[0].includes(' | ') ? 'Tap a word for its إِعْرَاب' : lines.shift()!;
  const rows = lines
    .map((l) => l.split(/\s+\|\s+/).map((s) => s.trim()));
  return el('figure', { className: ['diagram', 'parse'] }, [
    el('div', { className: ['p-top'] }, [
      el('span', { className: ['p-hint'] }, [txt(hint)]),
      el('button', { type: 'button', className: ['p-all'], ariaPressed: 'false' }, [txt('Show all')]),
    ]),
    el('div', { className: ['p-words'], dir: 'rtl' },
      rows.map(([word, label, role], i) =>
        el('button', { type: 'button', className: ['p-word', `c-${role || 'harf'}`], dataI: String(i), ariaPressed: 'false' }, [
          el('b', { lang: 'ar' }, [txt(word)]),
          el('small', {}, [txt(label ?? '')]),
        ]),
      ),
    ),
    el('ol', { className: ['p-details'] },
      rows.map(([word, label, role, full], i) =>
        el('li', { dataI: String(i), className: [`c-${role || 'harf'}`] }, [
          el('b', {}, [txt(word)]),
          txt(': '),
          // " / " in the explanation starts a new line, and **x** is bold.
          ...(full || label || '').split(' / ').flatMap((line, j) => [
            ...(j ? [el('br', {}, [])] : []),
            ...line.split(/\*\*(.+?)\*\*/).map((part, k) => (k % 2 ? el('strong', {}, [txt(part)]) : txt(part))),
          ]),
        ]),
      ),
    ),
  ]);
}

/** "A → B → C": one verb changing step by step, one row per verb type. "{x}" marks the part that was added. */
function stepsEl(src: string): Element {
  const lines = src.split('\n').filter((l) => l.trim());
  const caption = lines[0].includes(' | ') ? undefined : lines.shift();
  const chip = (s: string, last: boolean) =>
    el('span', { className: ['s-step', ...(last ? ['s-last'] : [])] }, [
      el('span', { className: ['ar'], lang: 'ar', dir: 'rtl' },
        s.split(/(\{[^}]+\})/).filter(Boolean).map((p) =>
          p.startsWith('{') ? el('b', { className: ['ending'] }, [txt(p.slice(1, -1))]) : txt(p),
        ),
      ),
    ]);
  return el('figure', { className: ['diagram', 'steps'] }, [
    ...(caption ? [el('figcaption', { className: ['s-cap'] }, [txt(caption.trim())])] : []),
    ...lines.map((line) => {
      const [label, chain = '', note] = line.split(/\s+\|\s+/);
      const steps = chain.split(/\s*→\s*/);
      const kids: ElementContent[] = [];
      steps.forEach((st, i) => {
        if (i) kids.push(el('i', { className: ['ph', 'ph-arrow-left', 's-arrow'], ariaHidden: 'true' }));
        kids.push(chip(st.trim(), i === steps.length - 1));
      });
      return el('div', { className: ['s-row'] }, [
        el('div', { className: ['s-label'] }, [txt(label.trim())]),
        el('div', { className: ['s-chain'], dir: 'rtl' }, kids),
        ...(note ? [el('div', { className: ['s-note'] }, [txt(note.trim())])] : []),
      ]);
    }),
  ]);
}

const LETTERS = '\\u0621-\\u064A\\u064B-\\u0652\\u0670\\u0640\\u0671-\\u06D3';
const TAIL = new RegExp(`[${LETTERS}]+$`);
const HEAD = new RegExp(`^[${LETTERS}]+`);

/**
 * Bold on part of an Arabic word (كَتَبَ**ا**, **الْ**كِتَابُ) highlights that part.
 * Keep the whole word in one span so its letters still join and read right to left.
 */
function partWords(tree: HRoot) {
  visit(tree, 'element', (node: Element, index, parent) => {
    if (!parent || index == null || node.tagName !== 'strong' || !/[\u0600-\u06FF]/.test(textOf(node))) return;
    const kids = parent.children;
    const prev = kids[index - 1];
    const next = kids[index + 1];
    const pre = prev?.type === 'text' ? (prev.value.match(TAIL)?.[0] ?? '') : '';
    const post = next?.type === 'text' ? (next.value.match(HEAD)?.[0] ?? '') : '';
    // A second bold part in the same word (تَ**فَا**عَلَ): join the word already built.
    let j = index - 1;
    while (j >= 0 && kids[j].type === 'text' && (kids[j] as { value: string }).value === '') j--;
    const host = !pre && j >= 0 ? kids[j] : undefined;
    const joinHost = host?.type === 'element' && ((host.properties.className as string[] | undefined) ?? []).includes('word');
    if (!pre && !post && !joinHost) return;
    if (pre && prev?.type === 'text') prev.value = prev.value.slice(0, -pre.length);
    if (post && next?.type === 'text') next.value = next.value.slice(post.length);
    node.properties.className = ['ending'];
    const parts: ElementContent[] = [...(pre ? [txt(pre)] : []), node, ...(post ? [txt(post)] : [])];
    if (joinHost && host?.type === 'element') {
      host.children.push(...parts);
      kids.splice(j + 1, index - j);
      return [SKIP, j + 1];
    }
    kids[index] = el('span', { className: ['ar', 'word'], lang: 'ar', dir: 'rtl' }, parts);
    return [SKIP, index + 1];
  });
}

/** Style tables and examples, turn diagram code blocks into figures, and wrap Arabic. */
function rehypeNotes(opts: RenderOpts) {
  return (tree: HRoot) => {
    partWords(tree);
    visit(tree, 'element', (node: Element, index, parent) => {
      if (!parent || index == null) return;
      if (node.tagName === 'pre') {
        const code = node.children[0] as Element | undefined;
        const lang = ((code?.properties?.className as string[] | undefined) ?? []).find((c) => c.startsWith('language-'));
        const src = code ? textOf(code) : '';
        if (lang === 'language-tree') parent.children[index] = treeEl(src);
        else if (lang === 'language-parse') parent.children[index] = parseEl(src);
        else if (lang === 'language-steps') parent.children[index] = stepsEl(src);
        else return;
        return SKIP;
      }
      if (node.tagName === 'table') {
        node.properties.className = ['table'];
        // Mostly-Arabic tables read right to left.
        const cells: string[] = [];
        visit(node, 'element', (c: Element) => {
          if (c.tagName === 'td') cells.push(textOf(c));
        });
        const arCells = cells.filter((c) => c && isArabicOnly(c)).length;
        if (cells.length && arCells / cells.length > 0.6) node.properties.dir = 'rtl';
        parent.children[index] = el('div', { className: ['table-scroll'] }, [node]);
        return SKIP;
      }
      if (node.tagName === 'blockquote') node.properties.className = ['example'];
      if (/^h[1-6]$/.test(node.tagName)) {
        const lvl = Math.min(6, Math.max(3, Number(node.tagName[1])));
        node.tagName = 'h' + lvl;
        node.properties.className = ['prose-h'];
      }
    });
    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index == null) return;
      const p = parent as Element;
      if (p.type === 'element' && (p.tagName === 'code' || (p.properties?.className as string[] | undefined)?.some((c) => c === 'ar' || c === 'term' || c === 'ending'))) return;
      const parts = segs(node.value);
      if (!parts.some((s) => s.ar)) return;
      const kids: ElementContent[] = parts.map((s) => (s.ar ? arSpan(s.t, !!opts.roles) : txt(s.t)));
      p.children.splice(index, 1, ...kids);
      return index + kids.length;
    });
    // Keep short Arabic phrases in table cells on one line (كَتَبَ يَكْتُبُ).
    visit(tree, 'element', (td: Element) => {
      if (td.tagName !== 'td') return;
      visit(td, 'element', (sp: Element) => {
        const cls = (sp.properties.className as string[] | undefined) ?? [];
        if (cls.includes('ar') && textOf(sp).length <= 24) sp.properties.className = [...cls, 'nw'];
      });
    });
  };
}

function textOf(n: Element | ElementContent): string {
  if (n.type === 'text') return n.value;
  if (n.type === 'element') return n.children.map(textOf).join('');
  return '';
}

const stringify = unified().use(rehypeStringify);
const pipes = new Map<boolean, ReturnType<typeof makePipe>>();
const makePipe = (roles: boolean) => unified().use(remarkRehype).use(rehypeNotes, { roles });
const pipe = (o: RenderOpts) => {
  const r = !!o.roles;
  if (!pipes.has(r)) pipes.set(r, makePipe(r));
  return pipes.get(r)!;
};

export function renderNodes(nodes: RootContent[], o: RenderOpts = {}): string {
  if (!nodes.length) return '';
  const hast = pipe(o).runSync({ type: 'root', children: nodes } as MdRoot) as HRoot;
  return stringify.stringify(hast);
}

/** Render inline content without a wrapping `<p>`. */
export function renderInline(nodes: PhrasingContent[], o: RenderOpts = {}): string {
  const html = renderNodes([{ type: 'paragraph', children: nodes }], o);
  return html.replace(/^<p>/, '').replace(/<\/p>$/, '');
}

export const renderText = (t: string, o: RenderOpts = {}) => renderInline([{ type: 'text', value: t }], o);

/** Plain text of a diagram block, for search. */
export const diagramText = (src: string) =>
  src
    .split('\n')
    .map((l) => l.replace(/^\s*-\s+/, '').replace(/\{\w+\}/g, '').replace(/[{}]/g, '').replace(/\s+\|\s+/g, ' · ').trim())
    .filter(Boolean)
    .join(' · ');
