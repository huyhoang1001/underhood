import { describe, it, expect } from 'vitest';
import {
  ArticleFrontmatterSchema,
  ExperimentFrontmatterSchema
} from '../lib/content/schema';
import {
  getArticles,
  getArticleBySlug,
  getExperimentBySlug,
  extractToc
} from '../lib/content';
import { calculateReadingTime } from '../utils/readingTime';
import { TOPICS, TOPIC_LIST } from '../data/topics';
import { AUTHOR } from '../data/author';

describe('Underhood Content Schema Validation', () => {
  it('validates correct article frontmatter according to schema', () => {
    const validArticle = {
      title: 'Distributed Consensus Under Partition',
      description: 'Evaluating Raft leader election failure boundaries.',
      date: '2026-11-08',
      status: 'published' as const,
      topic: 'distributed-systems' as const,
      tags: ['consensus', 'raft'],
      featured: true,
      relatedArticles: [],
      relatedExperiments: []
    };

    const result = ArticleFrontmatterSchema.safeParse(validArticle);
    expect(result.success).toBe(true);
  });

  it('rejects invalid article frontmatter with missing required fields', () => {
    const invalidArticle = {
      // title is optional, so omitting it is fine
      description: 'Missing date and topic',
      tags: [] // empty tags
    };

    const result = ArticleFrontmatterSchema.safeParse(invalidArticle);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      // date and topic are still required
      expect(fieldErrors.date).toBeDefined();
      expect(fieldErrors.topic).toBeDefined();
    }
  });

  it('validates experiment frontmatter and rejects missing hypothesis or invalid repo URL', () => {
    const invalidExp = {
      title: 'Broken Experiment',
      tagline: 'Broken',
      date: '2026-11-08',
      status: 'draft',
      topic: 'backend-engineering',
      hypothesis: '',
      setup: '',
      implementation: '',
      keyFindings: [],
      githubRepo: 'not-a-valid-url'
    };

    const result = ExperimentFrontmatterSchema.safeParse(invalidExp);
    expect(result.success).toBe(false);
  });
});

describe('Draft Isolation & Query Policies', () => {
  it('strictly excludes drafts when includeDrafts is false (simulating production build)', () => {
    const prodArticles = getArticles({ includeDrafts: false });
    // In production, no draft is exposed
    expect(prodArticles.every((a) => a.frontmatter.status === 'published')).toBe(true);
  });

  it('includes all articles when includeDrafts is explicitly set to true (local development preview)', () => {
    const devArticles = getArticles({ includeDrafts: true });
    const nodeArticle = devArticles.find((a) => a.slug === 'nodejs-single-threaded');
    expect(nodeArticle).toBeDefined();
    expect(nodeArticle?.frontmatter.topic).toBe('backend-engineering');
    expect(nodeArticle?.readingTime).toMatch(/\d+ min read/);
  });

  it('returns article by slug when it is published', () => {
    // nodejs-single-threaded is published, so it should be accessible in production too
    const prodLookup = getArticleBySlug('nodejs-single-threaded', { includeDrafts: false });
    expect(prodLookup).toBeDefined();

    const devLookup = getArticleBySlug('nodejs-single-threaded', { includeDrafts: true });
    expect(devLookup).toBeDefined();
    // title is stored as slugField by Keystatic, so frontmatter.title may be undefined;
    // the slug itself encodes the title
    expect(devLookup?.slug).toBe('nodejs-single-threaded');
  });

  it('returns undefined for non-existent slugs', () => {
    const notFound = getArticleBySlug('non-existent-random-slug', { includeDrafts: true });
    expect(notFound).toBeUndefined();
  });

  it('loads nodejs-threadpool experiment with draft isolation', () => {
    const prodExp = getExperimentBySlug('nodejs-threadpool', { includeDrafts: false });
    expect(prodExp).toBeUndefined();

    const devExp = getExperimentBySlug('nodejs-threadpool', { includeDrafts: true });
    expect(devExp).toBeDefined();
    expect(devExp?.frontmatter.interactiveType).toBe('node-threadpool');
    expect(devExp?.frontmatter.keyFindings.length).toBeGreaterThanOrEqual(4);
  });
});

describe('Reading Time & Table of Contents Utilities', () => {
  it('calculates reading time accurately based on 200 words per minute', () => {
    const sampleWords = new Array(400).fill('word').join(' ');
    const stats = calculateReadingTime(sampleWords);
    expect(stats.words).toBe(400);
    expect(stats.minutes).toBe(2);
    expect(stats.text).toBe('2 min read');
  });

  it('extracts table of contents headings hierarchy cleanly', () => {
    const markdown = `
# Title
Introductory text.

## Section One
Content 1.

### Subsection A
Details.

## Section Two
Content 2.
    `;

    const toc = extractToc(markdown);
    expect(toc.length).toBe(3);
    expect(toc[0]).toEqual({ id: 'section-one', title: 'Section One', level: 2 });
    expect(toc[1]).toEqual({ id: 'subsection-a', title: 'Subsection A', level: 3 });
    expect(toc[2]).toEqual({ id: 'section-two', title: 'Section Two', level: 2 });
  });
});

describe('Author Profile & Editorial Standards', () => {
  it('author profile has valid repository link and required principles', () => {
    expect(AUTHOR.name).toBe('Huy Hoang');
    expect(AUTHOR.handle).toBe('huyhoang1001');
    expect(AUTHOR.principles.length).toBeGreaterThanOrEqual(4);
    expect(AUTHOR.selectedProjects.length).toBeGreaterThanOrEqual(2);
    expect(AUTHOR.links.github).toBe('https://github.com/huyhoang1001/underhood');
  });

  it('has comprehensive topic taxonomy', () => {
    expect(TOPIC_LIST.length).toBeGreaterThanOrEqual(7);
    expect(TOPICS['backend-engineering']).toBeDefined();
    expect(TOPICS['distributed-systems']).toBeDefined();
  });
});

describe('Browser-Safe Frontmatter Parsing', () => {
  it('parses YAML frontmatter without Node.js Buffer dependency', async () => {
    const { parseFrontmatter } = await import('../lib/content/parseFrontmatter');
    const raw = `---
title: "Testing Concurrency"
tags:
  - test
  - nodejs
featured: true
---
# Main Content
This is body text.`;

    const { data, content } = parseFrontmatter<any>(raw);
    expect(data.title).toBe('Testing Concurrency');
    expect(data.tags).toEqual(['test', 'nodejs']);
    expect(data.featured).toBe(true);
    expect(content.trim()).toBe('# Main Content\nThis is body text.');
  });
});

