// Build-time only: turns the three markdown books into books, lessons and
// schedules. The markdown files stay the single source of truth.
import fs from 'node:fs';
import path from 'node:path';
import { toString } from 'mdast-util-to-string';
import type { RootContent, PhrasingContent, Paragraph, List, Heading, ListItem } from 'mdast';
import { parseMd, renderNodes, renderInline, renderText, diagramText, ROLES, type RenderOpts, type Role } from './markdown';
import { isArabicOnly, mostlyArabic } from './arabic';
import { BOOK_META, LESSON_META, MATTER, MEET, type BookId, type BookMeta, type Kind } from './meta';
import { href } from './urls';

export type { BookId, Kind };

export interface CheckItem {
  qHtml?: string;
  aHtml: string;
  /** Lay the question / answer out right to left. */
  qRtl?: boolean;
  aRtl: boolean;
}
export interface Checkpoint {
  promptHtml?: string;
  items: CheckItem[];
}
export interface SearchField {
  label: string;
  text: string;
}

export interface Lesson {
  id: string;
  book: BookId;
  slug: string;
  url: string;
  /** Lesson number as printed ("6a"); empty for front and back matter. */
  n: string;
  matter?: 'Front matter' | 'Back matter';
  ar: string;
  en: string;
  /** Sarf lessons are built around a reading with its own title. */
  reading?: string;
  /** Verb type, for the sarf lessons that are about one. */
  tag?: string;
  pages?: string;
  folio?: string;
  section?: number;
  goal?: { label: string; html: string };
  bodyHtml: string;
  watch: { label: string; html: string }[];
  checkpoint?: Checkpoint;
  /** Colours used on the page, for the colour key. */
  roles: Role[];
  links: string[];
  search: SearchField[];
}

export interface Section {
  title: string;
  introHtml: string;
  ids: string[];
}

export interface ScheduleEntry {
  /** "4" or "11–12". */
  weeks: string;
  kind: 'lesson' | 'review' | 'warmup';
  /** "Lesson 6a", "Review A", "Warm-up". */
  label: string;
  lessonId?: string;
  pages?: string;
  detail: string;
  detailHtml: string;
}

export interface Book extends BookMeta {
  url: string;
  sections: Section[];
  front: string[];
  back: string[];
  /** Every page in reading order, matter included. */
  seq: string[];
  /** Numbered lessons only. */
  lessonIds: string[];
  schedule?: { introHtml: string; entries: ScheduleEntry[]; weeks: number };
}

const isLabelled = (n: RootContent): n is Paragraph =>
  n.type === 'paragraph' && n.children[0]?.type === 'strong';

function labelOf(n: RootContent): { label: string; rest: PhrasingContent[] } | null {
  if (!isLabelled(n)) return null;
  const label = toString(n.children[0]).trim().replace(/:$/, '').trim();
  return { label, rest: stripColon(n.children.slice(1)) };
}

function stripColon(nodes: PhrasingContent[]): PhrasingContent[] {
  const out = nodes.slice();
  const first = out[0];
  if (first?.type === 'text') {
    const v = first.value.replace(/^\s*:?\s*/, '');
    if (v) out[0] = { ...first, value: v };
    else out.shift();
  }
  return out;
}

const isAnswers = (n: RootContent): n is Paragraph =>
  n.type === 'paragraph' && n.children[0]?.type === 'emphasis' && /^Answers:?$/.test(toString(n.children[0]).trim());

function splitAnswers(text: string): string[] {
  const t = text.trim();
  if (/^\d+\.\s/.test(t)) return t.split(/\s+·\s+(?=\d+\.\s)/).map((a) => a.replace(/^\d+\.\s*/, '').trim());
  return t.split(/\s+·\s+/).map((a) => a.trim());
}

function parseCheckpoint(rest: PhrasingContent[], o: RenderOpts): Checkpoint {
  const i = rest.findIndex((c) => c.type === 'emphasis' && /^Answers:?$/.test(toString(c).trim()));
  const prompt = i < 0 ? rest : rest.slice(0, i);
  const answers = i < 0 ? [] : splitAnswers(toString({ type: 'paragraph', children: rest.slice(i + 1) }));
  return { promptHtml: renderInline(prompt, o), items: answers.map((a) => ({ aHtml: renderText(a, o), aRtl: mostlyArabic(a) })) };
}

const isAnswerMark = (c: PhrasingContent) => c.type === 'emphasis' && /^Answer:?$/.test(toString(c).trim());

/** "1. Question? *Answer:* answer" — one list item per question. */
function parseQuestions(list: List, o: RenderOpts): Checkpoint {
  return {
    items: list.children.map((li: ListItem) => {
      const [first, ...more] = li.children;
      const kids = first?.type === 'paragraph' ? first.children : [];
      const i = kids.findIndex(isAnswerMark);
      if (i < 0) throw new Error(`Checkpoint question has no *Answer:*: "${toString(li).slice(0, 60)}"`);
      const q = trimEnd(kids.slice(0, i));
      const a = stripColon(kids.slice(i + 1));
      const aText = toString({ type: 'paragraph', children: a });
      return {
        qHtml: renderInline(q, o),
        qRtl: mostlyArabic(toString({ type: 'paragraph', children: q })),
        aHtml: renderInline(a, o) + (more.length ? renderNodes(more, o) : ''),
        aRtl: mostlyArabic(aText),
      };
    }),
  };
}

function trimEnd(nodes: PhrasingContent[]): PhrasingContent[] {
  const out = nodes.slice();
  while (out.length) {
    const last = out[out.length - 1];
    if (last.type === 'break') out.pop();
    else if (last.type === 'text' && !last.value.trim()) out.pop();
    else if (last.type === 'text') {
      out[out.length - 1] = { ...last, value: last.value.replace(/\s+$/, '') };
      break;
    } else break;
  }
  return out;
}

function blockTexts(n: RootContent): string[] {
  if (n.type === 'code' && (n.lang === 'tree' || n.lang === 'parse' || n.lang === 'steps')) return [diagramText(n.value)];
  if (n.type === 'list') return n.children.map((li) => toString(li));
  if (n.type === 'table') return n.children.map((r) => r.children.map((c) => toString(c)).join('  ·  '));
  return [toString(n)];
}

interface Parsed {
  goal?: { label: string; html: string };
  bodyHtml: string;
  watch: { label: string; html: string }[];
  checkpoint?: Checkpoint;
  roles: Role[];
  search: SearchField[];
}

function parseBody(nodes: RootContent[], o: RenderOpts): Parsed {
  const body: RootContent[] = [];
  const watch: { label: string; nodes: RootContent[] }[] = [];
  const search: SearchField[] = [];
  let goal: Parsed['goal'];
  let checkpoint: Checkpoint | undefined;
  let mode: 'body' | 'watch' | 'questions' = 'body';

  for (const node of nodes) {
    // "**Checkpoint:**" on its own line, then a numbered list of questions.
    if (mode === 'questions') {
      mode = 'body';
      if (node.type === 'list' && node.ordered) {
        checkpoint = parseQuestions(node, o);
        node.children.forEach((li) => search.push({ label: 'Checkpoint', text: toString(li).replace(/\s*Answer:\s*/, ' → ') }));
        continue;
      }
    }
    const l = labelOf(node);
    if (l && /^(Rule|Goal)$/i.test(l.label)) {
      const rest = l.rest.slice();
      const first = rest[0];
      // "**Goal:** know when…" reads better as a sentence.
      if (first?.type === 'text') rest[0] = { ...first, value: first.value.charAt(0).toUpperCase() + first.value.slice(1) };
      goal = { label: l.label, html: renderInline(rest, o) };
      search.push({ label: l.label, text: toString({ type: 'paragraph', children: l.rest }) });
      mode = 'body';
      continue;
    }
    if (l && /^(Edge cases?|Watch out for)/i.test(l.label)) {
      watch.push({ label: l.label, nodes: l.rest.length ? [{ type: 'paragraph', children: l.rest }] : [] });
      mode = 'watch';
      continue;
    }
    // Drill numbers stay in the markdown for readers of the plan, but not on the site.
    if (l && /^Focus drills$/i.test(l.label)) {
      mode = 'body';
      continue;
    }
    if (l && /^Checkpoint$/i.test(l.label) && !toString({ type: 'paragraph', children: l.rest }).trim()) {
      mode = 'questions';
      continue;
    }
    if (l && /^Checkpoint$/i.test(l.label)) {
      checkpoint = parseCheckpoint(l.rest, o);
      search.push({ label: 'Checkpoint', text: toString({ type: 'paragraph', children: l.rest }).replace(/\s*Answers:\s*/, ' → ') });
      mode = 'body';
      continue;
    }
    // A self-test: a numbered list of questions, then "*Answers:* 1. … · 2. …".
    const prev = body[body.length - 1];
    if (isAnswers(node) && prev?.type === 'list' && prev.ordered) {
      body.pop();
      const answers = splitAnswers(toString({ type: 'paragraph', children: node.children.slice(1) }));
      checkpoint = {
        items: prev.children.map((li, i) => ({
          qHtml: renderNodes(li.children, o).replace(/^<p>|<\/p>$/g, ''),
          qRtl: mostlyArabic(toString(li)),
          aHtml: renderText(answers[i] ?? '', o),
          aRtl: mostlyArabic(answers[i] ?? ''),
        })),
      };
      prev.children.forEach((li, i) => search.push({ label: 'Self-test', text: `${toString(li)} → ${answers[i] ?? ''}` }));
      continue;
    }
    if (l) mode = 'body';
    if (mode === 'watch') watch[watch.length - 1].nodes.push(node);
    else {
      body.push(node);
      blockTexts(node).forEach((text) => search.push({ label: 'Notes', text }));
    }
  }
  watch.forEach((w) => w.nodes.forEach((n) => blockTexts(n).forEach((text) => search.push({ label: 'Watch out', text }))));
  const bodyHtml = renderNodes(body, o);
  const watchOut = watch.map((w) => ({ label: w.label, html: renderNodes(w.nodes, o) }));
  const all = [goal?.html, bodyHtml, ...watchOut.map((w) => w.html), ...(checkpoint?.items.flatMap((i) => [i.qHtml, i.aHtml]) ?? [])].join('');
  return {
    goal,
    bodyHtml,
    watch: watchOut,
    checkpoint,
    roles: ROLES.filter((r) => all.includes(`term c-${r}`) || all.includes(`c-${r}"`)),
    search,
  };
}

function splitBy(nodes: RootContent[], depth: number) {
  const intro: RootContent[] = [];
  const parts: { heading: Heading; nodes: RootContent[] }[] = [];
  for (const n of nodes) {
    if (n.type === 'heading' && n.depth === depth) parts.push({ heading: n, nodes: [] });
    else if (parts.length) parts[parts.length - 1].nodes.push(n);
    else intro.push(n);
  }
  return { intro, parts };
}

const PAGES = /\((pp?\.\s*[^)]*)\)/;
const dash = (s: string) => s.replace(/(\d)\s*-\s*(\d)/g, '$1–$2');

function loadBook(meta: BookMeta, lessons: Record<string, Lesson>): Book {
  let src = fs.readFileSync(path.join(process.cwd(), meta.file), 'utf8');
  src = src.replace(/^---\n[\s\S]*?\n---\n/, '');
  const root = parseMd(src);
  const top = root.children.filter((n) => !(n.type === 'heading' && n.depth === 1));
  const chapters = splitBy(top, 2).parts;

  const book: Book = { ...meta, url: href(`${meta.id}/`), sections: [], front: [], back: [], seq: [], lessonIds: [] };
  const o: RenderOpts = { roles: meta.kind === 'nahw' };

  const matter = (kind: keyof typeof MATTER, en: string, nodes: RootContent[], where: 'front' | 'back', pages?: string) => {
    const m = MATTER[kind];
    const id = `${meta.id}-${m.slug}`;
    const p = parseBody(nodes, o);
    lessons[id] = {
      id, book: meta.id, slug: m.slug, url: href(`${meta.id}/${m.slug}/`), n: '',
      matter: where === 'front' ? 'Front matter' : 'Back matter',
      ar: m.ar, en, pages, folio: pages?.match(/\d+/)?.[0], links: [],
      ...p,
      search: [{ label: 'Title', text: `${m.ar} · ${en}` }, ...p.search],
    };
    book[where].push(id);
  };

  for (const ch of chapters) {
    const title = toString(ch.heading);
    if (/^How to use/i.test(title)) matter('front', title, ch.nodes, 'front');
    else if (/^Week-by-week/i.test(title)) book.schedule = parseSchedule(meta.id, ch.nodes);
    else if (/^Quick revision/i.test(title)) matter('revision', title.replace(/:.*/, ''), ch.nodes, 'back');
    else if (/^Lessons?\s/i.test(title)) {
      const { intro, parts } = splitBy(ch.nodes, 3);
      const sec: Section = { title: title.replace(/^[^:]*:\s*/, ''), introHtml: renderNodes(intro, o), ids: [] };
      for (const part of parts) {
        const h = toString(part.heading);
        if (/self-test/i.test(h)) {
          matter('test', 'Final self-test', part.nodes, 'back');
          continue;
        }
        if (/^General exercises/i.test(h)) {
          matter('exercises', 'General exercises', part.nodes, 'back', h.match(PAGES)?.[1]);
          continue;
        }
        const m = h.match(/^(?:Lesson\s+)?(\d+[a-z]?)\s+—\s+(.*)$/);
        if (!m) throw new Error(`${meta.file}: can't read lesson heading "${h}"`);
        const n = m[1];
        const rest = m[2];
        const pm = rest.match(PAGES);
        const left = (pm ? rest.slice(0, pm.index) : rest).replace(/\s*—\s*$/, '').trim();
        const right = pm ? rest.slice((pm.index ?? 0) + pm[0].length).replace(/^\s*—\s*/, '').trim() : '';
        const lm = LESSON_META[meta.id][n];
        if (!lm) throw new Error(`${meta.file}: no title for lesson ${n} in meta.ts`);
        const id = `${meta.id}-${n}`;
        const p = parseBody(part.nodes, o);
        const pages = pm ? dash(pm[1]) : undefined;
        const ar = meta.kind === 'nahw' ? left.split(/\s+—\s+/)[0] : lm.ar;
        const reading = meta.kind === 'sarf' && left ? left : undefined;
        const tag = meta.id === 'sarf3' && right && isArabicOnly(right) ? right : undefined;
        lessons[id] = {
          id, book: meta.id, slug: n, url: href(`${meta.id}/${n}/`), n, ar, en: lm.en, reading, tag,
          pages, folio: pages?.match(/\d+/)?.[0], section: book.sections.length, links: [],
          ...p,
          search: [
            { label: 'Title', text: `${ar} · ${lm.en}` + (reading ? ` · ${reading}` : '') + (tag ? ` · ${tag}` : '') },
            { label: 'Keywords', text: lm.kw },
            ...p.search,
          ],
        };
        sec.ids.push(id);
        book.lessonIds.push(id);
      }
      book.sections.push(sec);
    } else throw new Error(`${meta.file}: unexpected chapter "${title}"`);
  }
  book.seq = [...book.front, ...book.lessonIds, ...book.back];
  return book;
}

function parseSchedule(bookId: BookId, nodes: RootContent[]): Book['schedule'] {
  const list = nodes.find((n): n is List => n.type === 'list');
  const intro = nodes.filter((n) => n.type === 'paragraph');
  const entries: ScheduleEntry[] = [];
  let weeks = 0;
  for (const li of list?.children ?? []) {
    const p = li.children[0] as Paragraph;
    const head = toString(p.children[0]);
    const rest = toString({ type: 'paragraph', children: p.children.slice(1) });
    const m = head.match(/^Weeks?\s+([\d–-]+)\s+—\s+(.+)$/);
    if (!m) throw new Error(`Can't read schedule line "${head}"`);
    const what = m[2].trim();
    const lm = what.match(/^Lesson\s+(\S+)/);
    const detail = rest.replace(PAGES, '').replace(/^\s*:\s*/, '').trim();
    entries.push({
      weeks: dash(m[1]),
      kind: lm ? 'lesson' : /warm/i.test(what) ? 'warmup' : 'review',
      label: what,
      lessonId: lm ? `${bookId}-${lm[1]}` : undefined,
      pages: rest.match(PAGES)?.[1],
      detail,
      detailHtml: renderText(detail),
    });
    weeks = Math.max(weeks, ...(m[1].match(/\d+/g) ?? []).map(Number));
  }
  return { introHtml: renderNodes(intro), entries, weeks };
}

function build() {
  const lessons: Record<string, Lesson> = {};
  const books = BOOK_META.map((m) => loadBook(m, lessons));
  // "See also": lessons in the other books that share a topic.
  for (const row of MEET) {
    const ids = (['nahw', 'sarf2', 'sarf3'] as const).flatMap((b) => row[b].map((n) => `${b}-${n}`));
    for (const id of ids) {
      if (!lessons[id]) throw new Error(`meta.ts MEET refers to missing lesson ${id}`);
      for (const other of ids) {
        const l = lessons[id];
        if (lessons[other].book !== l.book && !l.links.includes(other)) l.links.push(other);
      }
    }
  }
  for (const l of Object.values(lessons)) l.links = l.links.slice(0, 4);
  return { books, lessons };
}

const data = build();
export const BOOKS: Book[] = data.books;
export const LESSONS: Record<string, Lesson> = data.lessons;
export const BOOK: Record<BookId, Book> = Object.fromEntries(BOOKS.map((b) => [b.id, b])) as Record<BookId, Book>;

/** What the browser scripts need to know about every page, kept small. */
export function clientData() {
  return {
    books: BOOKS.map((b) => ({
      id: b.id, kind: b.kind, short: b.short, title: b.title, url: b.url, seq: b.seq, lessonIds: b.lessonIds,
      weeks: b.schedule?.weeks ?? 0,
      schedule: b.schedule?.entries.map((e) => ({ weeks: e.weeks, label: e.label, lessonId: e.lessonId, detail: e.detail })) ?? [],
    })),
    lessons: Object.fromEntries(
      Object.values(LESSONS).map((l) => [
        l.id,
        { b: l.book, n: l.n, en: l.en, ar: l.ar, pages: l.pages, url: l.url, m: l.matter, cp: l.checkpoint?.items.length ?? 0 },
      ]),
    ),
  };
}
export type ClientData = ReturnType<typeof clientData>;
