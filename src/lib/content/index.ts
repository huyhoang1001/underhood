import { parseFrontmatter } from './parseFrontmatter';
import {
  ArticleFrontmatterSchema,
  ExperimentFrontmatterSchema,
  ArticleDocument,
  ExperimentDocument,
  ArticleFrontmatter,
  ExperimentFrontmatter
} from './schema';
import { calculateReadingTime } from '../../utils/readingTime';
import { TopicId, Article, Experiment } from '../../types';

// Discover all MDX files at build time via Vite's eager raw glob from canonical src/content
const articleModules = import.meta.glob('/src/content/articles/*.mdx', {
  query: '?raw',
  eager: true
}) as Record<string, { default: string } | string>;

const experimentModules = import.meta.glob('/src/content/experiments/*.mdx', {
  query: '?raw',
  eager: true
}) as Record<string, { default: string } | string>;

// Helper to extract Table of Contents from markdown headings
export function extractToc(content: string): { id: string; title: string; level: number }[] {
  const toc: { id: string; title: string; level: number }[] = [];
  const lines = content.split('\n');

  lines.forEach((line) => {
    if (line.startsWith('## ')) {
      const title = line.replace(/^##\s+/, '').trim();
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      toc.push({ id, title, level: 2 });
    } else if (line.startsWith('### ')) {
      const title = line.replace(/^###\s+/, '').trim();
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      toc.push({ id, title, level: 3 });
    }
  });

  return toc;
}

// Parse and validate all articles
export function loadAllArticles(): ArticleDocument[] {
  const articles: ArticleDocument[] = [];

  for (const [path, rawMod] of Object.entries(articleModules)) {
    if (path.includes('TEMPLATE')) continue;
    try {
      const slug = path.split('/').pop()?.replace(/\.mdx$/, '') || '';
      const { data, content } = parseFrontmatter(rawMod);
      const parsed = ArticleFrontmatterSchema.safeParse(data);

      if (!parsed.success) {
        console.error(`[Content Loader] Schema validation failed for ${path}:`, parsed.error.format());
        throw new Error(`Invalid frontmatter in article ${path}: ${parsed.error.message}`);
      }

      const readingStats = calculateReadingTime(content);
      const toc = extractToc(content);

      articles.push({
        slug,
        frontmatter: parsed.data,
        rawContent: content,
        readingTime: readingStats.text,
        wordCount: readingStats.words,
        toc
      });
    } catch (err: any) {
      console.error(`[Content Loader] Failed to load article ${path}:`, err);
      throw err;
    }
  }

  // Sort by publication date descending
  return articles.sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime());
}

// Parse and validate all experiments
export function loadAllExperiments(): ExperimentDocument[] {
  const experiments: ExperimentDocument[] = [];

  for (const [path, rawMod] of Object.entries(experimentModules)) {
    try {
      const slug = path.split('/').pop()?.replace(/\.mdx$/, '') || '';
      const { data, content } = parseFrontmatter(rawMod);
      const parsed = ExperimentFrontmatterSchema.safeParse(data);

      if (!parsed.success) {
        console.error(`[Content Loader] Schema validation failed for ${path}:`, parsed.error.format());
        throw new Error(`Invalid frontmatter in experiment ${path}: ${parsed.error.message}`);
      }

      experiments.push({
        slug,
        frontmatter: parsed.data,
        rawContent: content
      });
    } catch (err: any) {
      console.error(`[Content Loader] Failed to load experiment ${path}:`, err);
      throw err;
    }
  }

  return experiments.sort((a, b) => new Date(b.frontmatter.date).getTime() - new Date(a.frontmatter.date).getTime());
}

// Convert ArticleDocument to Article view model
export function toArticle(doc: ArticleDocument): Article {
  return {
    slug: doc.slug,
    title: doc.frontmatter.title,
    description: doc.frontmatter.description,
    date: doc.frontmatter.date,
    readingTime: doc.readingTime,
    topic: doc.frontmatter.topic,
    tags: doc.frontmatter.tags,
    featured: doc.frontmatter.featured,
    draft: doc.frontmatter.status === 'draft',
    status: doc.frontmatter.status,
    githubUrl: doc.frontmatter.githubUrl,
    content: doc.rawContent,
    toc: doc.toc,
    relatedSlugs: doc.frontmatter.relatedArticles
  };
}

// Convert ExperimentDocument to Experiment view model
export function toExperiment(doc: ExperimentDocument): Experiment {
  return {
    slug: doc.slug,
    title: doc.frontmatter.title,
    tagline: doc.frontmatter.tagline,
    date: doc.frontmatter.date,
    status: doc.frontmatter.status,
    topic: doc.frontmatter.topic,
    hypothesis: doc.frontmatter.hypothesis,
    setup: doc.frontmatter.setup,
    implementation: doc.frontmatter.implementation,
    keyFindings: doc.frontmatter.keyFindings,
    limitations: doc.frontmatter.limitations,
    githubRepo: doc.frontmatter.githubRepo,
    relatedArticleSlug: doc.frontmatter.relatedArticleSlug,
    interactiveType: doc.frontmatter.interactiveType
  };
}

// Cache documents in memory
const ALL_ARTICLES = loadAllArticles();
const ALL_EXPERIMENTS = loadAllExperiments();

// Environment check for draft inclusion (only include drafts during local development preview)
export const isDevEnvironment = Boolean(
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV
);

export interface ContentQueryOptions {
  includeDrafts?: boolean;
}

/**
 * Returns articles filtered by publishing status.
 * Drafts are excluded by default in production; previewable in dev mode.
 */
export function getArticles(options: ContentQueryOptions = {}): ArticleDocument[] {
  const includeDrafts = options.includeDrafts ?? isDevEnvironment;
  return ALL_ARTICLES.filter((article) => {
    if (!includeDrafts && article.frontmatter.status === 'draft') {
      return false;
    }
    return true;
  });
}

/**
 * Looks up a single article by slug.
 * Returns undefined if not found or if a draft is requested in production.
 */
export function getArticleBySlug(slug: string, options: ContentQueryOptions = {}): ArticleDocument | undefined {
  const includeDrafts = options.includeDrafts ?? isDevEnvironment;
  const article = ALL_ARTICLES.find((a) => a.slug === slug);
  if (!article) return undefined;
  if (!includeDrafts && article.frontmatter.status === 'draft') {
    return undefined;
  }
  return article;
}

/**
 * Returns experiments filtered by status.
 */
export function getExperiments(options: ContentQueryOptions = {}): ExperimentDocument[] {
  const includeDrafts = options.includeDrafts ?? isDevEnvironment;
  return ALL_EXPERIMENTS.filter((exp) => {
    if (!includeDrafts && exp.frontmatter.status === 'draft') {
      return false;
    }
    return true;
  });
}

/**
 * Looks up a single experiment by slug.
 */
export function getExperimentBySlug(slug: string, options: ContentQueryOptions = {}): ExperimentDocument | undefined {
  const includeDrafts = options.includeDrafts ?? isDevEnvironment;
  const exp = ALL_EXPERIMENTS.find((e) => e.slug === slug);
  if (!exp) return undefined;
  if (!includeDrafts && exp.frontmatter.status === 'draft') {
    return undefined;
  }
  return exp;
}

/**
 * Returns articles belonging to a specific topic.
 */
export function getArticlesByTopic(topicId: TopicId, options: ContentQueryOptions = {}): ArticleDocument[] {
  return getArticles(options).filter((a) => a.frontmatter.topic === topicId);
}

/**
 * Returns articles matching a specific tag.
 */
export function getArticlesByTag(tag: string, options: ContentQueryOptions = {}): ArticleDocument[] {
  return getArticles(options).filter((a) => a.frontmatter.tags.includes(tag));
}

/**
 * Returns all distinct tags across visible articles.
 */
export function getAllTags(options: ContentQueryOptions = {}): string[] {
  const tagsSet = new Set<string>();
  getArticles(options).forEach((a) => a.frontmatter.tags.forEach((t) => tagsSet.add(t)));
  return Array.from(tagsSet).sort();
}
