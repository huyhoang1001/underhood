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

// --- Go goroutines article/experiment frontmatter fixtures ---

const goArticleFrontmatter = {
  description:
    "A hands-on journey through Go's goroutines, the M:N scheduler, GOMAXPROCS, and the worker pool pattern — with reproducible benchmarks showing what happens when a Go server runs CPU-heavy work without bounding concurrency.",
  date: '2025-07-15',
  status: 'draft' as const,
  topic: 'backend-engineering' as const,
  tags: ['go', 'goroutines', 'concurrency', 'scheduler', 'performance'],
  featured: false,
  githubUrl: 'https://github.com/huyhoang1001/underhood/tree/main/experiments/golang-goroutines',
  relatedArticles: ['nodejs-single-threaded', 'rust-async-runtime'],
  relatedExperiments: ['golang-goroutines']
};

const goExperimentFrontmatter = {
  tagline:
    'Empirical benchmark of Go scheduler starvation under CPU-bound goroutines, worker pool isolation with buffered channels, and bounded concurrency backpressure on a Go net/http server.',
  date: '2025-07-15',
  status: 'draft' as const,
  topic: 'backend-engineering' as const,
  hypothesis:
    'Executing a 100 ms CPU-bound loop directly in a request goroutine with GOMAXPROCS=1 starves the Go scheduler — causing /health latency to spike from ~2 ms to >100 ms under 50 concurrent connections. A fixed-size worker pool draining a buffered channel keeps /health latency at ≤5 ms regardless of GOMAXPROCS, because CPU concurrency is bounded independently of the goroutine count.',
  setup:
    'Go 1.22 on macOS (Apple Silicon). Three strategies benchmarked with wrk -t4 -c50 -d30s. Tested under GOMAXPROCS=1 and GOMAXPROCS=num_cores. Worker pool size: 4 goroutines. Bounded channel depth: 20. Per-request CSV latency logged to stdout.',
  implementation:
    "Three /compute?strategy= branches in main.go: 'goroutine' runs the busy-wait directly in the request goroutine, 'workerpool' dispatches to a pre-started pool of 4 goroutines via a buffered job channel, and 'bounded' adds a queue-depth cap of 20 returning 503 when full. Goroutine ID extracted from runtime.Stack() output. Handlers unit-tested via net/http/httptest.",
  keyFindings: [
    "'goroutine' strategy with GOMAXPROCS=1: /health p99 degrades to >100 ms under 50 concurrent compute requests — Go scheduler starvation confirmed.",
    "'goroutine' strategy with GOMAXPROCS=num_cores: /health p99 stays ≤10 ms — true parallelism prevents starvation when cores are available.",
    "'workerpool' strategy: /health p99 stays ≤5 ms regardless of GOMAXPROCS setting — bounded CPU concurrency keeps the scheduler free.",
    "'bounded' strategy: matches workerpool latency isolation while returning 503 to excess requests instead of allowing unlimited goroutine queue growth."
  ],
  limitations: [
    'Benchmark numbers reflect a specific machine; exact latencies vary with CPU core count and OS scheduler behaviour.',
    'The 100 ms busy-wait is a synthetic proxy for real CPU work — actual workloads show different distribution shapes.',
    "Go's asynchronous preemption (introduced in Go 1.14) can interrupt CPU-bound goroutines at safe points, which may reduce starvation severity compared to pre-1.14 versions."
  ],
  githubRepo: 'https://github.com/huyhoang1001/underhood/tree/main/experiments/golang-goroutines',
  relatedArticleSlug: 'golang-goroutines'
};

/**
 * Property 1 (Go): Go article and experiment frontmatter round-trip
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4
 */
describe('Property 1 (Go): Go article and experiment frontmatter round-trip', () => {
  it('arbitrary article frontmatter serialises to YAML and re-parses with deep equality', () => {
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
          // date must round-trip as YYYY-MM-DD
          expect(result.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(result.data.date).toBe(frontmatter.date);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('arbitrary experiment frontmatter serialises to YAML and re-parses with deep equality', () => {
    fc.assert(
      fc.property(experimentFrontmatterArb, (frontmatter) => {
        const yamlStr = yaml.dump(frontmatter);
        const parsed = yaml.load(yamlStr) as Record<string, unknown>;
        const result = experimentSchema.safeParse(parsed);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.tagline).toBe(frontmatter.tagline);
          expect(result.data.topic).toBe(frontmatter.topic);
          expect(result.data.status).toBe(frontmatter.status);
          expect(result.data.hypothesis).toBe(frontmatter.hypothesis);
          expect(result.data.setup).toBe(frontmatter.setup);
          expect(result.data.implementation).toBe(frontmatter.implementation);
          expect(result.data.keyFindings).toEqual(frontmatter.keyFindings);
          expect(result.data.limitations).toEqual(frontmatter.limitations);
          expect(result.data.githubRepo).toBe(frontmatter.githubRepo);
          // date must round-trip as YYYY-MM-DD
          expect(result.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(result.data.date).toBe(frontmatter.date);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('concrete Go article frontmatter round-trips through YAML serialisation', () => {
    const yamlStr = yaml.dump(goArticleFrontmatter);
    const parsed = yaml.load(yamlStr) as Record<string, unknown>;
    const result = articleSchema.safeParse(parsed);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe(goArticleFrontmatter.description);
      expect(result.data.date).toBe('2025-07-15');
      expect(result.data.status).toBe('draft');
      expect(result.data.topic).toBe('backend-engineering');
      expect(result.data.tags).toEqual(['go', 'goroutines', 'concurrency', 'scheduler', 'performance']);
      expect(result.data.featured).toBe(false);
      expect(result.data.relatedArticles).toEqual(['nodejs-single-threaded', 'rust-async-runtime']);
      expect(result.data.relatedExperiments).toEqual(['golang-goroutines']);
      expect(result.data.githubUrl).toBe(
        'https://github.com/huyhoang1001/underhood/tree/main/experiments/golang-goroutines'
      );
    }
  });

  it('concrete Go experiment frontmatter round-trips through YAML serialisation', () => {
    const yamlStr = yaml.dump(goExperimentFrontmatter);
    const parsed = yaml.load(yamlStr) as Record<string, unknown>;
    const result = experimentSchema.safeParse(parsed);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tagline).toBe(goExperimentFrontmatter.tagline);
      expect(result.data.date).toBe('2025-07-15');
      expect(result.data.status).toBe('draft');
      expect(result.data.topic).toBe('backend-engineering');
      expect(result.data.keyFindings).toHaveLength(4);
      expect(result.data.limitations).toHaveLength(3);
      expect(result.data.githubRepo).toBe(
        'https://github.com/huyhoang1001/underhood/tree/main/experiments/golang-goroutines'
      );
      expect(result.data.relatedArticleSlug).toBe('golang-goroutines');
    }
  });
});

/**
 * Property 2 (Go): Go optional frontmatter fields default correctly
 * Validates: Requirements 10.5, 10.6
 */
describe('Property 2 (Go): Go optional frontmatter fields default correctly', () => {
  it('Go article: omitting featured, relatedArticles, relatedExperiments applies correct defaults', () => {
    fc.assert(
      fc.property(
        fc.constant({
          description: goArticleFrontmatter.description,
          date: goArticleFrontmatter.date,
          status: goArticleFrontmatter.status,
          topic: goArticleFrontmatter.topic,
          tags: goArticleFrontmatter.tags
          // featured, relatedArticles, relatedExperiments intentionally omitted
        }),
        (minimal) => {
          const result = articleSchema.safeParse(minimal);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.featured).toBe(false);
            expect(result.data.relatedArticles).toEqual([]);
            expect(result.data.relatedExperiments).toEqual([]);
            expect(result.data.status).toBe('draft');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Go article: arbitrary valid article frontmatter always applies featured=false default when omitted', () => {
    fc.assert(
      fc.property(
        articleFrontmatterArb.map(({ featured: _featured, relatedArticles: _ra, relatedExperiments: _re, ...rest }) => rest),
        (minimalFrontmatter) => {
          const result = articleSchema.safeParse(minimalFrontmatter);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.featured).toBe(false);
            expect(result.data.relatedArticles).toEqual([]);
            expect(result.data.relatedExperiments).toEqual([]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Go experiment: omitting limitations applies limitations=[] default', () => {
    fc.assert(
      fc.property(
        fc.constant({
          tagline: goExperimentFrontmatter.tagline,
          date: goExperimentFrontmatter.date,
          status: goExperimentFrontmatter.status,
          topic: goExperimentFrontmatter.topic,
          hypothesis: goExperimentFrontmatter.hypothesis,
          setup: goExperimentFrontmatter.setup,
          implementation: goExperimentFrontmatter.implementation,
          keyFindings: goExperimentFrontmatter.keyFindings,
          githubRepo: goExperimentFrontmatter.githubRepo
          // limitations, relatedArticleSlug intentionally omitted
        }),
        (minimal) => {
          const result = experimentSchema.safeParse(minimal);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.limitations).toEqual([]);
            expect(result.data.status).toBe('draft');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Go experiment: arbitrary valid experiment frontmatter always applies limitations=[] default when omitted', () => {
    fc.assert(
      fc.property(
        experimentFrontmatterArb.map(({ limitations: _lim, ...rest }) => rest),
        (minimalFrontmatter) => {
          const result = experimentSchema.safeParse(minimalFrontmatter);
          expect(result.success).toBe(true);
          if (result.success) {
            expect(result.data.limitations).toEqual([]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
