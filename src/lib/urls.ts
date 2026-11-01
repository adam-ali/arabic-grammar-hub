const raw: string = import.meta.env?.BASE_URL ?? '/';
export const BASE = raw.endsWith('/') ? raw : raw + '/';

/** A site-relative path with the deploy base in front: href('nahw/') → '/arabic-grammar-hub/nahw/'. */
export const href = (p = '') => BASE + p.replace(/^\//, '');
