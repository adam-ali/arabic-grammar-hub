// Shared by the build and the browser: split mixed Arabic/English text, and
// normalise text for vowel-insensitive search.

const AR = '\\u0600-\\u06FF\\u0750-\\u077F\\uFB50-\\uFDFF\\uFE70-\\uFEFF';
/** A run of Arabic words, allowing spaces, slashes and brackets between them. */
export const AR_RE = new RegExp(`[${AR}]+(?:[ \\u00A0/()]+[${AR}]+)*`, 'g');
const AR_ONLY = new RegExp(`^[${AR}\\s().،/]+$`);

export interface Seg {
  t: string;
  ar: boolean;
  /** Offset of this segment in the source string. */
  i: number;
}

export function segs(str: string): Seg[] {
  const out: Seg[] = [];
  let last = 0;
  AR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = AR_RE.exec(str))) {
    let a = m.index;
    let b = a + m[0].length;
    // Keep brackets balanced so "إِنَّ (الْمُسْلِمِينَ)" stays one right-to-left run.
    const open = m[0].split('(').length - 1;
    const close = m[0].split(')').length - 1;
    if (open > close && str[b] === ')') b++;
    if (close > open && a > last && str[a - 1] === '(') a--;
    AR_RE.lastIndex = b;
    if (a > last) out.push({ t: str.slice(last, a), ar: false, i: last });
    out.push({ t: str.slice(a, b), ar: true, i: a });
    last = b;
  }
  if (last < str.length) out.push({ t: str.slice(last), ar: false, i: last });
  return out;
}

export const isArabicOnly = (s: string) => AR_ONLY.test(s.trim());

/** True when nearly all the letters in a string are Arabic. */
export function mostlyArabic(s: string) {
  const ar = (s.match(new RegExp(`[${AR}]`, 'g')) ?? []).length;
  const lat = (s.match(/[A-Za-z]/g) ?? []).length;
  return ar > 0 && ar / (ar + lat) > 0.85;
}

/** Vowel marks, Qur'anic marks and tatweel. */
export const DIA = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/;

/**
 * Lower-case, drop vowel marks and fold alif/ya/ta-marbuta variants.
 * `map[i]` is the index in the source string of normalised character `i`,
 * so a match can be highlighted in the original text.
 */
export function norm(s: string): { n: string; map: number[] } {
  let n = '';
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    let c = s[i];
    if (DIA.test(c)) continue;
    if ('أإآٱ'.includes(c)) c = 'ا';
    else if (c === 'ى') c = 'ي';
    else if (c === 'ة') c = 'ه';
    else c = c.toLowerCase();
    n += c;
    map.push(i);
  }
  return { n, map };
}

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ESC[c]);

/** Escaped HTML with Arabic runs wrapped for the Arabic font. */
export const arHtml = (s: string) =>
  segs(s)
    .map((g) => (g.ar ? `<span class="ar" lang="ar" dir="rtl">${esc(g.t)}</span>` : esc(g.t)))
    .join('');
