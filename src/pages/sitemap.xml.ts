import type { APIRoute } from 'astro';
import { SITE } from '../data/site';
import { ARTICLES } from '../data/articles';

const STATIC_PATHS = [
  '/',
  '/articles/',
  '/win-rate-calculator/',
  '/stock-average-calculator/',
  '/about/',
  '/contact/',
  '/disclaimer/',
  '/privacy-policy/',
  '/terms/',
];

export const GET: APIRoute = () => {
  const articlePaths = ARTICLES.map((a) => `/articles/${a.slug}/`);
  const allPaths = [...STATIC_PATHS, ...articlePaths];

  const urls = allPaths
    .map((path) => `  <url><loc>${new URL(path, SITE.url).href}</loc></url>`)
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};