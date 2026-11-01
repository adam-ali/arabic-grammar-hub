import type { APIRoute } from 'astro';
import { LESSONS } from '../lib/content';

/** Every searchable line of every lesson, fetched by the search page. */
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(Object.values(LESSONS).map((l) => ({ id: l.id, f: l.search.map((s) => [s.label, s.text]) }))),
    { headers: { 'Content-Type': 'application/json' } },
  );
