import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { visit, SKIP } from 'unist-util-visit';
import type { Root as MdRoot, RootContent, PhrasingContent } from 'mdast';
import type { Root as HRoot, Element, ElementContent, Text } from 'hast';
import { segs, isArabicOnly } from './arabic';

export const parseMd = (src: string): MdRoot =>
  unified().use(remarkParse).use(remarkGfm).parse(src) as MdRoot;

const span = (t: string): Element => ({
  type: 'element',
  tagName: 'span',
  properties: { className: ['ar'], lang: 'ar', dir: 'rtl' },
  children: [{ type: 'text', value: t }],
});

/** Wrap Arabic runs in `<span class="ar">`, style tables and examples, and demote headings. */
function rehypeNotes() {
  return (tree: HRoot) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName === 'table') {
        node.properties.className = ['table'];
        // Mostly-Arabic tables read right to left.
        const cells: string[] = [];
        visit(node, 'element', (c: Element) => {
          if (c.tagName === 'td') cells.push(textOf(c));
        });
        const arCells = cells.filter((c) => c && isArabicOnly(c)).length;
        if (cells.length && arCells / cells.length > 0.6) node.properties.dir = 'rtl';
        if (parent && index != null) {
          parent.children[index] = {
            type: 'element',
            tagName: 'div',
            properties: { className: ['table-scroll'] },
            children: [node],
          };
          return SKIP;
        }
      }
      if (node.tagName === 'blockquote') node.properties.className = ['example'];
      if (/^h[1-6]$/.test(node.tagName)) {
        const lvl = Math.min(6, Math.max(3, Number(node.tagName[1])));
        node.tagName = 'h' + lvl;
        node.properties.className = ['prose-h'];
      }
    });
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || index == null) return;
      const p = parent as Element;
      if (p.type === 'element' && (p.tagName === 'code' || (p.properties?.className as string[] | undefined)?.includes('ar'))) return;
      const parts = segs(node.value);
      if (!parts.some((s) => s.ar)) return;
      const kids: ElementContent[] = parts.map((s) => (s.ar ? span(s.t) : { type: 'text', value: s.t }));
      p.children.splice(index, 1, ...kids);
      return index + kids.length;
    });
  };
}

function textOf(n: Element | ElementContent): string {
  if (n.type === 'text') return n.value;
  if (n.type === 'element') return n.children.map(textOf).join('');
  return '';
}

const toHast = unified().use(remarkRehype).use(rehypeNotes);
const stringify = unified().use(rehypeStringify);

export function renderNodes(nodes: RootContent[]): string {
  if (!nodes.length) return '';
  const hast = toHast.runSync({ type: 'root', children: nodes } as MdRoot) as HRoot;
  return stringify.stringify(hast);
}

/** Render inline content without a wrapping `<p>`. */
export function renderInline(nodes: PhrasingContent[]): string {
  const html = renderNodes([{ type: 'paragraph', children: nodes }]);
  return html.replace(/^<p>/, '').replace(/<\/p>$/, '');
}

export const renderText = (t: string) => renderInline([{ type: 'text', value: t }]);
