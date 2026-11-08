import { describe, it, expect } from 'vitest';
import { ARTICLES, ARTICLE_SLUGS } from '../data/articles';
import { TOPICS, TOPIC_LIST } from '../data/topics';
import { EXPERIMENTS } from '../data/experiments';
import { AUTHOR } from '../data/author';

describe('Underhood Data Integrity', () => {
  it('all articles have unique slugs and valid frontmatter', () => {
    const slugSet = new Set<string>();
    ARTICLES.forEach((article) => {
      expect(slugSet.has(article.slug)).toBe(false);
      slugSet.add(article.slug);

      expect(article.title).toBeTruthy();
      expect(article.description).toBeTruthy();
      expect(article.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(article.readingTime).toMatch(/\d+ min read/);
      expect(TOPICS[article.topic]).toBeDefined();
      expect(article.tags.length).toBeGreaterThan(0);
      expect(article.content.length).toBeGreaterThan(200);
      expect(article.toc.length).toBeGreaterThan(1);
    });
  });

  it('all experiments have valid hypotheses and reproducible fields', () => {
    EXPERIMENTS.forEach((exp) => {
      expect(exp.slug).toBeTruthy();
      expect(exp.hypothesis).toBeTruthy();
      expect(exp.setup).toBeTruthy();
      expect(exp.implementation).toBeTruthy();
      expect(exp.keyFindings.length).toBeGreaterThan(1);
      expect(exp.limitations.length).toBeGreaterThan(0);
      expect(exp.githubRepo).toMatch(/^https:\/\/github\.com/);
      expect([
        'queue-backpressure',
        'grpc-multiplex',
        'cache-invalidation',
        'node-threadpool'
      ]).toContain(exp.interactiveType);
    });
  });

  it('registers the Node.js concurrency article as a local review draft', () => {
    const nodeArticle = ARTICLES.find(
      (a) => a.slug === 'node-js-is-single-threaded-who-is-doing-the-work'
    );
    expect(nodeArticle).toBeDefined();
    expect(nodeArticle?.draft).toBe(true);
    expect(nodeArticle?.topic).toBe('backend-engineering');
    expect(nodeArticle?.toc.length).toBe(10);
    expect(nodeArticle?.readingTime).toMatch(/\d+ min read/);
  });

  it('author profile has required principles and links', () => {
    expect(AUTHOR.name).toBe('Alex Vance');
    expect(AUTHOR.principles.length).toBeGreaterThanOrEqual(4);
    expect(AUTHOR.selectedProjects.length).toBeGreaterThanOrEqual(3);
    expect(AUTHOR.links.github).toBeTruthy();
    expect(AUTHOR.links.email).toBeTruthy();
  });
});

describe('Distributed Systems & Queue Math', () => {
  it("calculates Little's Law wait time correctly: W = L / lambda", () => {
    const queueLength = 600; // items
    const arrivalRate = 1200; // rps
    const expectedWaitSeconds = queueLength / arrivalRate; // 0.5s = 500ms
    const waitTimeMs = (queueLength / arrivalRate) * 1000;

    expect(expectedWaitSeconds).toBe(0.5);
    expect(waitTimeMs).toBe(500);
  });

  it('calculates HTTP/2 BDP Max Throughput correctly: Window / RTT', () => {
    const windowBytes = 65536; // 64 KB default
    const rttSeconds = 0.04; // 40ms
    const maxThroughputBps = windowBytes / rttSeconds;
    const maxThroughputMbps = (maxThroughputBps * 8) / (1024 * 1024);

    // Exactly 12.5 Mbps in binary megabits
    expect(maxThroughputMbps).toBeGreaterThanOrEqual(12.5);
    expect(maxThroughputMbps).toBeLessThan(13.5);
  });

  it('verifies XFetch early recomputation window scales with beta and delta', () => {
    const deltaMs = 100;
    const beta1 = 1.0;
    const beta2 = 2.0;

    const window1 = ((beta1 * deltaMs) / 1000) * 2.3;
    const window2 = ((beta2 * deltaMs) / 1000) * 2.3;

    expect(window2).toBeCloseTo(window1 * 2, 4);
    expect(window1).toBeGreaterThan(0.2);
  });
});
