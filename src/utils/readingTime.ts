export interface ReadingTimeOptions {
  /** Words per minute reading speed. Defaults to 200 wpm. */
  wordsPerMinute?: number;
  /** Additional seconds per code block for technical comprehension. Defaults to 15s. */
  codeBlockTimeSeconds?: number;
}

export interface ReadingTimeResult {
  /** Human-readable formatted string, e.g., "9 min read" or "< 1 min read" */
  text: string;
  /** Estimated reading duration in whole minutes (rounded) */
  minutes: number;
  /** Precise estimated minutes as a float */
  exactMinutes: number;
  /** Total word count extracted from prose and code */
  words: number;
  /** Number of code blocks detected in the text */
  codeBlocksCount: number;
  /** Estimated reading duration in milliseconds */
  timeMs: number;
}

/**
 * Calculates estimated reading time for technical articles and markdown prose.
 * Uses a baseline of 200 words per minute (WPM), with adjustments for code blocks.
 */
export function calculateReadingTime(
  content: string,
  options: ReadingTimeOptions = {}
): ReadingTimeResult {
  const { wordsPerMinute = 200, codeBlockTimeSeconds = 15 } = options;

  if (!content || !content.trim()) {
    return {
      text: '< 1 min read',
      minutes: 1,
      exactMinutes: 0,
      words: 0,
      codeBlocksCount: 0,
      timeMs: 0
    };
  }

  // Count code blocks (```...```)
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = content.match(codeBlockRegex) || [];
  const codeBlocksCount = codeBlocks.length;

  // Extract code block content and clean markdown syntax
  let cleanContent = content;

  // Extract inline code
  cleanContent = cleanContent.replace(/`([^`]+)`/g, '$1');

  // Strip image tags: ![alt](url)
  cleanContent = cleanContent.replace(/!\[.*?\]\(.*?\)/g, '');

  // Convert markdown links to plain text: [text](url) -> text
  cleanContent = cleanContent.replace(/\[(.*?)\]\(.*?\)/g, '$1');

  // Strip headers, blockquotes, horizontal rules, and table delimiters
  cleanContent = cleanContent.replace(/^#{1,6}\s+/gm, '');
  cleanContent = cleanContent.replace(/^>\s*/gm, '');
  cleanContent = cleanContent.replace(/^-{3,}$/gm, '');
  cleanContent = cleanContent.replace(/\|/g, ' ');

  // Strip HTML tags if any
  cleanContent = cleanContent.replace(/<[^>]*>/g, '');

  // Extract word matches (alphanumeric sequences and hyphenated words)
  const wordsArray = cleanContent.match(/[\w\d'-]+/g) || [];
  const words = wordsArray.length;

  // Reading time in minutes: (words / wpm) + (codeBlocks * codeBlockTimeSeconds / 60)
  const proseMinutes = words / wordsPerMinute;
  const codeMinutes = (codeBlocksCount * codeBlockTimeSeconds) / 60;
  const exactMinutes = proseMinutes + codeMinutes;

  // Round up to nearest whole minute (standard editorial convention, min 1)
  const minutes = Math.max(1, Math.round(exactMinutes));
  const timeMs = Math.round(exactMinutes * 60 * 1000);

  const text = minutes <= 1 && exactMinutes < 0.8 ? '< 1 min read' : `${minutes} min read`;

  return {
    text,
    minutes,
    exactMinutes,
    words,
    codeBlocksCount,
    timeMs
  };
}

/**
 * Formats a given number of minutes into an editorial read-time string.
 */
export function formatReadingTime(minutes: number): string {
  if (minutes <= 0) return '< 1 min read';
  if (minutes === 1) return '1 min read';
  return `${minutes} min read`;
}
