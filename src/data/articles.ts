import { Article } from '../types';
import { getArticles, toArticle, getArticleBySlug } from '../lib/content';

// Re-export dynamically loaded MDX articles without any hardcoded demo articles
export const ARTICLES: Article[] = getArticles().map(toArticle);

export const ARTICLE_SLUGS: string[] = ARTICLES.map((a) => a.slug);

export function findArticleBySlug(slug: string, options?: { includeDrafts?: boolean }): Article | undefined {
  const doc = getArticleBySlug(slug, options);
  return doc ? toArticle(doc) : undefined;
}
