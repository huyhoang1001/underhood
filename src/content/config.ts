import { defineCollection, z } from 'astro:content';

const TopicIdSchema = z.enum([
  'distributed-systems',
  'backend-engineering',
  'performance',
  'system-design',
  'cloud-infrastructure',
  'engineering-experiments',
  'lessons-learned'
]);

const ContentStatusSchema = z.enum(['draft', 'published']);

// Keystatic saves dates as YAML date objects (unquoted), so we coerce to string
const DateSchema = z.union([z.string(), z.date()]).transform(v =>
  v instanceof Date ? v.toISOString().slice(0, 10) : v
);

const articlesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().optional(), // Keystatic uses slugField, so title may not be in frontmatter
    description: z.string(),
    date: DateSchema,
    status: ContentStatusSchema.default('draft'),
    topic: TopicIdSchema,
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    relatedArticles: z.array(z.string()).default([]),
    relatedExperiments: z.array(z.string()).default([]),
    githubUrl: z.string().url().optional()
  })
});

const experimentsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string().optional(), // Keystatic uses slugField, so title may not be in frontmatter
    tagline: z.string(),
    date: DateSchema,
    status: ContentStatusSchema.default('draft'),
    topic: TopicIdSchema,
    hypothesis: z.string(),
    setup: z.string(),
    implementation: z.string(),
    keyFindings: z.array(z.string()),
    limitations: z.array(z.string()).default([]),
    githubRepo: z.string().url(),
    relatedArticleSlug: z.string().optional(),
    interactiveType: z.enum(['node-threadpool', 'queue-backpressure', 'grpc-multiplex', 'cache-invalidation', 'tokio-scheduler']).optional()
  })
});

export const collections = {
  articles: articlesCollection,
  experiments: experimentsCollection
};
