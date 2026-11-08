import { load } from 'js-yaml';

export interface ParsedFrontmatter<T = Record<string, any>> {
  data: T;
  content: string;
}

/**
 * Universal browser-safe frontmatter parser.
 * Extracts YAML between --- fences using js-yaml with zero Node.js Buffer dependency.
 */
export function parseFrontmatter<T = Record<string, any>>(rawInput: any): ParsedFrontmatter<T> {
  let raw = '';
  if (typeof rawInput === 'string') {
    raw = rawInput;
  } else if (rawInput && typeof rawInput === 'object') {
    if (typeof rawInput.default === 'string') {
      raw = rawInput.default;
    } else if (rawInput.default && typeof rawInput.default.default === 'string') {
      raw = rawInput.default.default;
    }
  }

  const trimmed = raw.trimStart();
  if (!trimmed.startsWith('---')) {
    return { data: {} as T, content: raw };
  }

  // Match the frontmatter block between opening and closing --- markers
  const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {} as T, content: raw };
  }

  const [, yamlStr, content] = match;
  try {
    const data = (load(yamlStr) as T) || ({} as T);
    return { data, content };
  } catch (err) {
    console.error('Failed to parse YAML frontmatter:', err);
    throw err;
  }
}
