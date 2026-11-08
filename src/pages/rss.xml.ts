import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import RSS from 'rss';

export const GET: APIRoute = async (context) => {
  const articles = await getCollection('articles', ({ data }: { data: CollectionEntry<'articles'>['data'] }) => {
    return data.status === 'published';
  });

  const feed = new RSS({
    title: 'Underhood — Software Systems & Concurrency',
    description: 'Engineering blog exploring Node.js internals, event loops, distributed systems, and reproducible benchmarks.',
    site_url: context.site?.toString() || 'https://underhood.dev',
    feed_url: `${context.site?.toString() || 'https://underhood.dev'}/rss.xml`,
    language: 'en',
    pubDate: new Date().toUTCString(),
    copyright: `© ${new Date().getFullYear()} Huy Hoang`
  });

  articles.forEach((art: CollectionEntry<'articles'>) => {
    feed.item({
      title: art.data.title,
      description: art.data.description,
      url: `${context.site?.toString() || 'https://underhood.dev'}/writing/${art.slug}`,
      date: art.data.date,
      categories: [art.data.topic, ...art.data.tags]
    });
  });

  return new Response(feed.xml({ indent: true }), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8'
    }
  });
};
