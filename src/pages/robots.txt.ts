import type { APIRoute } from 'astro';

export const GET: APIRoute = async (context) => {
  const siteUrl = context.site?.toString() || 'https://underhood.dev';
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /keystatic/
Disallow: /api/keystatic/

Sitemap: ${siteUrl}/sitemap-index.xml
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
};
