import { describe, it, expect } from 'vitest';
import { calculateReadingTime, formatReadingTime } from '../utils/readingTime';

describe('calculateReadingTime utility', () => {
  it('handles empty or whitespace string gracefully', () => {
    const result = calculateReadingTime('');
    expect(result.words).toBe(0);
    expect(result.minutes).toBe(1);
    expect(result.text).toBe('< 1 min read');
    expect(result.codeBlocksCount).toBe(0);
  });

  it('calculates 1 minute for ~200 words at 200 wpm baseline', () => {
    // Generate exactly 200 words
    const words = Array(200).fill('distributed').join(' ');
    const result = calculateReadingTime(words, { wordsPerMinute: 200 });

    expect(result.words).toBe(200);
    expect(result.minutes).toBe(1);
    expect(result.text).toBe('1 min read');
  });

  it('calculates 5 minutes for ~1,000 words at 200 wpm', () => {
    const words = Array(1000).fill('system').join(' ');
    const result = calculateReadingTime(words, { wordsPerMinute: 200 });

    expect(result.words).toBe(1000);
    expect(result.minutes).toBe(5);
    expect(result.text).toBe('5 min read');
  });

  it('respects custom reading speed configurations', () => {
    const words = Array(400).fill('concurrency').join(' ');
    // At 100 wpm, 400 words = 4 minutes
    const slowResult = calculateReadingTime(words, { wordsPerMinute: 100 });
    expect(slowResult.minutes).toBe(4);

    // At 400 wpm, 400 words = 1 minute
    const fastResult = calculateReadingTime(words, { wordsPerMinute: 400 });
    expect(fastResult.minutes).toBe(1);
  });

  it('accurately strips markdown formatting without corrupting word count', () => {
    const markdown = `
# Major Architecture Heading

Here is an [internal link](https://example.com) and an image ![architecture](https://example.com/arch.png).

> A critical blockquote about distributed consensus.

| Column 1 | Column 2 |
| :--- | :--- |
| Node A | Node B |

Some **bold text** and *italicized emphasis* with \`inlineCodeToken\`.
    `.trim();

    const result = calculateReadingTime(markdown);
    // Verified non-zero valid word count
    expect(result.words).toBeGreaterThan(15);
    expect(result.words).toBeLessThan(40);
    expect(result.minutes).toBe(1);
    expect(result.codeBlocksCount).toBe(0);
  });

  it('accounts for technical code blocks with additional comprehension time', () => {
    const codeSnippet = `
\`\`\`go
func HandleRequest(ctx context.Context, req *Request) error {
    if err := limiter.TryAcquire(); err != nil {
        return codes.ResourceExhausted
    }
    return nil
}
\`\`\`
    `.trim();

    const result = calculateReadingTime(codeSnippet, { codeBlockTimeSeconds: 15 });
    expect(result.codeBlocksCount).toBe(1);
    expect(result.words).toBeGreaterThan(0);
  });
});

describe('formatReadingTime helper', () => {
  it('formats minutes correctly', () => {
    expect(formatReadingTime(0)).toBe('< 1 min read');
    expect(formatReadingTime(1)).toBe('1 min read');
    expect(formatReadingTime(7)).toBe('7 min read');
    expect(formatReadingTime(15)).toBe('15 min read');
  });
});
