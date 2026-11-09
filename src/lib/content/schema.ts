import { z } from 'zod';

export const TopicIdSchema = z.enum([
  'distributed-systems',
  'backend-engineering',
  'performance',
  'system-design',
  'cloud-infrastructure',
  'engineering-experiments',
  'lessons-learned'
]);

export const ContentStatusSchema = z.enum(['draft', 'published']);

// Keystatic saves dates as YAML date objects (unquoted), so we coerce to YYYY-MM-DD string
const DateSchema = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v))
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'));

export const ArticleFrontmatterSchema = z.object({
  // Keystatic uses title as slugField so it may be omitted from frontmatter;
  // callers should fall back to deriving title from the slug.
  title: z.string().min(1).optional(),
  description: z.string().min(1, 'Article description is required'),
  date: DateSchema,
  status: ContentStatusSchema.default('draft'),
  topic: TopicIdSchema,
  tags: z.array(z.string()).min(1, 'At least one tag is required'),
  featured: z.boolean().default(false),
  relatedArticles: z.array(z.string()).default([]),
  relatedExperiments: z.array(z.string()).default([]),
  githubUrl: z.string().url().optional(),
  coverImage: z.string().optional(),
  seo: z
    .object({
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      canonicalUrl: z.string().optional()
    })
    .optional()
});

export type ArticleFrontmatter = z.infer<typeof ArticleFrontmatterSchema>;

export const ExperimentFrontmatterSchema = z.object({
  title: z.string().min(1).optional(),
  tagline: z.string().min(1, 'Tagline is required'),
  date: DateSchema,
  status: ContentStatusSchema.default('draft'),
  topic: TopicIdSchema,
  hypothesis: z.string().min(1, 'Hypothesis is required'),
  setup: z.string().min(1, 'Setup description is required'),
  implementation: z.string().min(1, 'Implementation description is required'),
  keyFindings: z.array(z.string()).min(1, 'At least one key finding is required'),
  limitations: z.array(z.string()).default([]),
  githubRepo: z.string().url('Must be a valid repository URL'),
  relatedArticleSlug: z.string().optional(),
  interactiveType: z.enum(['node-threadpool', 'queue-backpressure', 'grpc-multiplex', 'cache-invalidation']).optional()
});

export type ExperimentFrontmatter = z.infer<typeof ExperimentFrontmatterSchema>;

export interface ArticleDocument {
  slug: string;
  frontmatter: ArticleFrontmatter;
  rawContent: string;
  readingTime: string;
  wordCount: number;
  toc: { id: string; title: string; level: number }[];
}

export interface ExperimentDocument {
  slug: string;
  frontmatter: ExperimentFrontmatter;
  rawContent: string;
}
