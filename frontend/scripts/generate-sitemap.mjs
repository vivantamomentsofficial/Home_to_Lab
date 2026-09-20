import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BLOG_POSTS } from '../src/data/blogData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = 'https://www.hometolab.in';

function formatDateToISO(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    return new Date().toISOString().split('T')[0];
  }
  return parsed.toISOString().split('T')[0];
}

const staticRoutes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/about', priority: '0.9', changefreq: 'weekly' },
  { path: '/contact', priority: '0.9', changefreq: 'monthly' },
  { path: '/privacy-policy', priority: '0.8', changefreq: 'monthly' },
  { path: '/terms', priority: '0.8', changefreq: 'monthly' },
  { path: '/disclaimer', priority: '0.8', changefreq: 'monthly' },
  { path: '/blog', priority: '0.9', changefreq: 'daily' },
  { path: '/login', priority: '0.8', changefreq: 'monthly' },
  { path: '/register', priority: '0.8', changefreq: 'monthly' },
];

const todayISO = new Date().toISOString().split('T')[0];

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

for (const route of staticRoutes) {
  xml += `  <url>\n`;
  xml += `    <loc>${DOMAIN}${route.path}</loc>\n`;
  xml += `    <lastmod>${todayISO}</lastmod>\n`;
  xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
  xml += `    <priority>${route.priority}</priority>\n`;
  xml += `  </url>\n`;
}

for (const post of BLOG_POSTS) {
  const postDate = formatDateToISO(post.date);
  xml += `  <url>\n`;
  xml += `    <loc>${DOMAIN}/blog/${post.slug}</loc>\n`;
  xml += `    <lastmod>${postDate}</lastmod>\n`;
  xml += `    <changefreq>monthly</changefreq>\n`;
  xml += `    <priority>0.7</priority>\n`;
  xml += `  </url>\n`;
}

xml += `</urlset>\n`;

const publicSitemapPath = path.resolve(__dirname, '../public/sitemap.xml');
const rootSitemapPath = path.resolve(__dirname, '../../sitemap.xml');

fs.writeFileSync(publicSitemapPath, xml, 'utf8');
fs.writeFileSync(rootSitemapPath, xml, 'utf8');

console.log(`[Sitemap Generator] Generated sitemap with ${staticRoutes.length} static routes and ${BLOG_POSTS.length} blog posts.`);
