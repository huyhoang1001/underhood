import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as yaml from 'js-yaml';
import { z } from 'zod';

// --- Schemas (inlined to avoid astro:content import issues in test context) ---

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

const DateSchema = z.union([z.string(), z.date()]).transform((v) =>
  v instanceof Date ? v.toISOString().slice(0, 10) : v
);

const articleSchema = z.object({
  title: z.string().optional(),
  description: z.string(),
  date: DateSchema,
  status: ContentStatusSchema.default('draft'),
  topic: TopicIdSchema,
  tags: z.array(z.string()),
  featured: z.boolean().default(false),
  relatedArticles: z.array(z.string()).default([]),
  relatedExperiments: z.array(z.string()).default([]),
  githubUrl: z.string().url().optional()
});

const experimentSchema = z.object({
  title: z.string().optional(),
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
  interactiveType: z.enum(['node-threadpool', 'queue-backpressure', 'grpc-multiplex', 'cache-invalidation']).optional()
});

// --- Arbitraries ---

const topicArb = fc.constantFrom(
  'distributed-systems' as const,
  'backend-engineering' as const,
  'performance' as const,
  'system-design' as const,
  'cloud-infrastructure' as const,
  'engineering-experiments' as const,
  'lessons-learned' as const
);

const statusArb = fc.constantFrom('draft' as const, 'published' as const);

const dateStringArb = fc
  .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .filter((d) => !isNaN(d.getTime()))
  .map((d) => d.toISOString().slice(0, 10));

const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);

const stringArrayArb = fc.array(nonEmptyStringArb, { minLength: 0, maxLength: 5 });

const articleFrontmatterArb = fc.record({
  description: nonEmptyStringArb,
  date: dateStringArb,
  status: statusArb,
  topic: topicArb,
  tags: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
  featured: fc.boolean(),
  relatedArticles: stringArrayArb,
  relatedExperiments: stringArrayArb
});

const experimentFrontmatterArb = fc.record({
  tagline: nonEmptyStringArb,
  date: dateStringArb,
  status: statusArb,
  topic: topicArb,
  hypothesis: nonEmptyStringArb,
  setup: nonEmptyStringArb,
  implementation: nonEmptyStringArb,
  keyFindings: fc.array(nonEmptyStringArb, { minLength: 1, maxLength: 5 }),
  limitations: stringArrayArb,
  githubRepo: fc.constant('https://github.com/example/repo')
});

// --- Tests ---

/**
 * Property 4: Article frontmatter round-trip
 * Validates: Requirements 10.1, 10.3
 */
describe('Property 4: Article frontmatter round-trip', () => {
  it('serialises to YAML and re-parses to a deeply equal object', () => {
    fc.assert(
      fc.property(articleFrontmatterArb, (frontmatter) => {
        const yamlStr = yaml.dump(frontmatter);
        const parsed = yaml.load(yamlStr) as Record<string, unknown>;
        const result = articleSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBe(frontmatter.description);
          expect(result.data.topic).toBe(frontmatter.topic);
          expect(result.data.status).toBe(frontmatter.status);
          expect(result.data.featured).toBe(frontmatter.featured);
          expect(result.data.tags).toEqual(frontmatter.tags);
          expect(result.data.relatedArticles).toEqual(frontmatter.relatedArticles);
          expect(result.data.relatedExperiments).toEqual(frontmatter.relatedExperiments);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('normalises date fields to YYYY-MM-DD string format', () => {
    fc.assert(
      fc.property(articleFrontmatterArb, (frontmatter) => {
        const yamlStr = yaml.dump(frontmatter);
        const parsed = yaml.load(yamlStr) as Record<string, unknown>;
        const result = articleSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data.date).toBe('string');
          expect(result.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 5: Experiment frontmatter round-trip
 * Validates: Requirements 10.2, 10.4
 */
describe('Property 5: Experiment frontmatter round-trip', () => {
  it('serialises to YAML and re-parses to a deeply equal object', () => {
    fc.assert(
      fc.property(experimentFrontmatterArb, (frontmatter) => {
        const yamlStr = yaml.dump(frontmatter);
        const parsed = yaml.load(yamlStr) as Record<string, unknown>;
        const result = experimentSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.tagline).toBe(frontmatter.tagline);
          expect(result.data.topic).toBe(frontmatter.topic);
          expect(result.data.hypothesis).toBe(frontmatter.hypothesis);
          expect(result.data.keyFindings).toEqual(frontmatter.keyFindings);
          expect(result.data.limitations).toEqual(frontmatter.limitations);
        }
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 6: Schema defaults applied for omitted optional fields
 * Validates: Requirements 10.5, 10.6
 */
describe('Property 6: Schema defaults applied for omitted optional fields', () => {
  it('applies featured=false when omitted from article frontmatter', () => {
    const minimal = {
      description: 'A test article',
      date: '2025-01-15',
      status: 'draft' as const,
      topic: 'backend-engineering' as const,
      tags: ['rust']
      // featured, relatedArticles, relatedExperiments intentionally omitted
    };
    const result = articleSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.featured).toBe(false);
      expect(result.data.relatedArticles).toEqual([]);
      expect(result.data.relatedExperiments).toEqual([]);
    }
  });

  it('applies limitations=[] when omitted from experiment frontmatter', () => {
    const minimal = {
      tagline: 'A test experiment',
      date: '2025-01-15',
      status: 'draft' as const,
      topic: 'backend-engineering' as const,
      hypothesis: 'Things happen',
      setup: 'Run tests',
      implementation: 'Write code',
      keyFindings: ['Finding 1'],
      githubRepo: 'https://github.com/example/repo'
      // limitations intentionally omitted
    };
    const result = experimentSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limitations).toEqual([]);
    }
  });
});
