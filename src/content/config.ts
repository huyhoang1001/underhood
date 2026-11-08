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

const articlesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string().optional(),
    description: z.string(),
    date: z.string(),
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
    title: z.string(),
    slug: z.string().optional(),
    tagline: z.string(),
    date: z.string(),
    status: ContentStatusSchema.default('draft'),
    topic: TopicIdSchema,
    hypothesis: z.string(),
    setup: z.string(),
    implementation: z.string(),
    keyFindings: z.array(z.string()),
    limitations: z.array(z.string()).default([]),
    githubRepo: z.string().url(),
    relatedArticleSlug: z.string().optional(),
    interactiveType: z.enum(['node-threadpool', 'queue-backpressure', 'grpc-multiplex', 'cache-invalidation']).optional()
  })
});

export const collections = {
  articles: articlesCollection,
  experiments: experimentsCollection
};
