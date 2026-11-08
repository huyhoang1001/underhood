import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Github,
  Share2,
  Check,
  Link as LinkIcon,
  BookOpen,
  ArrowRight,
  ArrowLeft as PrevIcon
} from 'lucide-react';
import { Article, ViewRoute } from '../types';
import { ARTICLES } from '../data/articles';
import { CodeBlock } from '../components/CodeBlock';
import { ArchitectureDiagram } from '../components/ArchitectureDiagram';
import { Callout } from '../components/Callout';
import { TableOfContents } from '../components/TableOfContents';
import { calculateReadingTime } from '../utils/readingTime';

interface ArticleViewProps {
  slug: string;
  onNavigate: (route: ViewRoute) => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({ slug, onNavigate }) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const articleIndex = ARTICLES.findIndex((a) => a.slug === slug);
  const article = ARTICLES[articleIndex] || ARTICLES[0];
  const readingStats = calculateReadingTime(article.content);

  const prevArticle = articleIndex > 0 ? ARTICLES[articleIndex - 1] : null;
  const nextArticle = articleIndex < ARTICLES.length - 1 ? ARTICLES[articleIndex + 1] : null;

  const relatedArticles = ARTICLES.filter((a) =>
    article.relatedSlugs?.includes(a.slug)
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="py-8 sm:py-12">
      {/* Back to Writing Breadcrumb */}
      <div className="mb-8">
        <button
          onClick={() => onNavigate({ view: 'writing' })}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to all writing</span>
        </button>
      </div>

      {/* Article Header */}
      <header className="space-y-4 max-w-3xl pb-8 border-b border-[#e7e3da] dark:border-[#30363d]">
        {/* Zero-pill clean unboxed metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716c] dark:text-[#8b949e]">
          <button
            onClick={() => onNavigate({ view: 'topics', topicId: article.topic })}
            className="font-semibold text-sky-600 dark:text-sky-400 hover:underline uppercase tracking-wider text-[11px]"
          >
            {article.topic.replace(/-/g, ' ')}
          </button>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#a8a29e] dark:text-[#6e7681]" />
            {article.date}
          </span>
          <span>·</span>
          <span
            className="flex items-center gap-1.5"
            title={`${readingStats.words.toLocaleString()} words · calculated at 200 words per minute baseline (${readingStats.codeBlocksCount} code blocks)`}
          >
            <Clock className="w-3 h-3 text-[#a8a29e] dark:text-[#6e7681]" />
            <span className="font-medium text-[#1c1917] dark:text-[#f0f6fc]">
              {readingStats.text}
            </span>
            <span className="text-[11px] text-[#a8a29e] dark:text-[#6e7681] font-mono">
              ({readingStats.words.toLocaleString()} words @ 200 wpm)
            </span>
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc] leading-tight text-balance">
          {article.title}
        </h1>

        <p className="text-base sm:text-lg text-[#78716c] dark:text-[#8b949e] leading-relaxed">
          {article.description}
        </p>

        {/* Action bar: GitHub repro link, Share, Copy link */}
        <div className="flex items-center justify-between pt-2 text-xs">
          <div className="flex items-center gap-2 text-[#a8a29e] dark:text-[#6e7681]">
            {article.tags.map((tag, idx) => (
              <React.Fragment key={tag}>
                {idx > 0 && <span>·</span>}
                <button
                  onClick={() => onNavigate({ view: 'writing', tag })}
                  className="hover:underline hover:text-sky-600 dark:hover:text-sky-400"
                >
                  #{tag}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {article.githubUrl && (
              <a
                href={article.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc] bg-[#f2ede4] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d] rounded transition-colors"
                title="View reproducible test harness on GitHub"
              >
                <Github className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Repro Harness</span>
              </a>
            )}

            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc] bg-[#f2ede4] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d] rounded transition-colors"
              title="Copy article link"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Two-Column Reading Canvas: Prose (65-75ch) & Sticky TOC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-10">
        {/* Article Body Content (8 cols) */}
        <main className="lg:col-span-8 max-w-prose">
          <RenderArticleContent
            content={article.content}
            slug={article.slug}
            onNavigate={onNavigate}
          />

          {/* Footnotes & References Section */}
          <section className="mt-16 pt-8 border-t border-[#e7e3da] dark:border-[#30363d] text-xs space-y-3">
            <div className="font-semibold uppercase tracking-wider text-[#1c1917] dark:text-[#f0f6fc]">
              References & Reading Notes
            </div>
            <ol className="list-decimal pl-4 space-y-1.5 text-[#78716c] dark:text-[#8b949e] leading-relaxed">
              <li>
                Little, J. D. C. (1961). <em>A Proof for the Queuing Formula: L = λW</em>. Operations Research, 9(3), 383-387.
              </li>
              <li>
                Nichols, K., & Jacobson, V. (2012). <em>Controlling Queue Delay (CoDel)</em>. Communications of the ACM, 55(7), 42-50.
              </li>
              <li>
                Brakemo, L. S., & Peterson, L. L. (1995). <em>TCP Vegas: End to End Congestion Avoidance on a Global Internet</em>. IEEE JSAC.
              </li>
              <li>
                HTTP/2 Specification RFC 7540, Section 5.2: <em>Flow Control Principles & Window Adjustments</em>.
              </li>
            </ol>
          </section>

          {/* Prev / Next Article Navigation */}
          <nav className="mt-12 pt-8 border-t border-[#e7e3da] dark:border-[#30363d] grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevArticle ? (
              <button
                onClick={() => onNavigate({ view: 'article', slug: prevArticle.slug })}
                className="p-4 rounded-lg border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] hover:border-slate-400 dark:hover:border-slate-600 text-left space-y-1 transition-colors"
              >
                <div className="flex items-center gap-1 text-[11px] font-mono text-[#78716c] dark:text-[#8b949e]">
                  <PrevIcon className="w-3 h-3" />
                  <span>Previous Article</span>
                </div>
                <div className="text-sm font-semibold text-[#1c1917] dark:text-[#f0f6fc] line-clamp-1">
                  {prevArticle.title}
                </div>
              </button>
            ) : (
              <div />
            )}

            {nextArticle ? (
              <button
                onClick={() => onNavigate({ view: 'article', slug: nextArticle.slug })}
                className="p-4 rounded-lg border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] hover:border-slate-400 dark:hover:border-slate-600 text-right space-y-1 transition-colors"
              >
                <div className="flex items-center justify-end gap-1 text-[11px] font-mono text-[#78716c] dark:text-[#8b949e]">
                  <span>Next Article</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
                <div className="text-sm font-semibold text-[#1c1917] dark:text-[#f0f6fc] line-clamp-1">
                  {nextArticle.title}
                </div>
              </button>
            ) : (
              <div />
            )}
          </nav>
        </main>

        {/* Right Sidebar: Table of Contents & Related Investigations (4 cols) */}
        <aside className="hidden lg:block lg:col-span-4 space-y-10 pl-4">
          <TableOfContents items={article.toc} />

          {/* Related Articles Drawer */}
          {relatedArticles.length > 0 && (
            <div className="space-y-3 pt-6 border-t border-[#e7e3da] dark:border-[#30363d]">
              <div className="font-semibold uppercase tracking-wider text-[11px] text-[#1c1917] dark:text-[#f0f6fc]">
                Related Investigations
              </div>
              <div className="space-y-3">
                {relatedArticles.map((rel) => (
                  <div
                    key={rel.slug}
                    onClick={() => onNavigate({ view: 'article', slug: rel.slug })}
                    className="group cursor-pointer space-y-1"
                  >
                    <div className="text-xs font-semibold text-[#1c1917] dark:text-[#f0f6fc] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2">
                      {rel.title}
                    </div>
                    <div className="text-[11px] text-[#78716c] dark:text-[#8b949e]">
                      {rel.readingTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* MDX / Markdown Parser & Component Renderer                          */
/* ------------------------------------------------------------------ */
type MarkdownBlock =
  | { type: 'h2'; content: string; id: string }
  | { type: 'h3'; content: string; id: string }
  | { type: 'code'; language: string; content: string; filename?: string }
  | { type: 'blockquote'; content: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; items: string[] }
  | { type: 'olist'; items: string[] }
  | { type: 'p'; content: string };

function RenderArticleContent({
  content,
  slug,
  onNavigate
}: {
  content: string;
  slug: string;
  onNavigate: (route: ViewRoute) => void;
}) {
  // Split into chunks based on code fences and headers
  const tokens = parseMarkdownBlocks(content);

  return (
    <div className="space-y-6 text-[#24292f] dark:text-[#c9d1d9] text-[15px] sm:text-base leading-[1.8] font-normal">
      {/* If this is the backpressure article, mount interactive architecture topology diagram */}
      {slug === 'backpressure-is-not-an-overload-policy' && (
        <ArchitectureDiagram />
      )}

      {tokens.map((block, idx) => {
        if (block.type === 'h2') {
          return (
            <h2
              key={idx}
              id={block.id}
              className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc] pt-8 pb-1 border-b border-[#e7e3da] dark:border-[#30363d] scroll-mt-24"
            >
              {block.content}
            </h2>
          );
        }

        if (block.type === 'h3') {
          return (
            <h3
              key={idx}
              id={block.id}
              className="text-xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc] pt-4 scroll-mt-24"
            >
              {block.content}
            </h3>
          );
        }

        if (block.type === 'code') {
          return (
            <CodeBlock
              key={idx}
              code={block.content}
              language={block.language}
              filename={block.filename}
            />
          );
        }

        if (block.type === 'blockquote') {
          return (
            <Callout key={idx} type="principle" title="Architectural Principle">
              <p>{block.content}</p>
            </Callout>
          );
        }

        if (block.type === 'table') {
          return (
            <div
              key={idx}
              className="my-6 overflow-x-auto rounded-lg border border-[#e7e3da] dark:border-[#30363d]"
            >
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#f7f4ee] dark:bg-[#161b22] text-[#1c1917] dark:text-[#f0f6fc] border-b border-[#e7e3da] dark:border-[#30363d]">
                  <tr>
                    {block.headers.map((h, hIdx) => (
                      <th key={hIdx} className="p-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e3da] dark:divide-[#30363d] font-mono text-xs">
                  {block.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-[#f2ede4]/50 dark:hover:bg-[#1c2128]/50"
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'list') {
          return (
            <ul
              key={idx}
              className="list-disc pl-5 space-y-2 text-[#44403c] dark:text-[#c9d1d9]"
            >
              {block.items.map((item, iIdx) => (
                <li key={iIdx}>{renderInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'olist') {
          return (
            <ol
              key={idx}
              className="list-decimal pl-5 space-y-2 text-[#44403c] dark:text-[#c9d1d9]"
            >
              {block.items.map((item, iIdx) => (
                <li key={iIdx}>{renderInlineMarkdown(item)}</li>
              ))}
            </ol>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} className="leading-relaxed">
            {renderInlineMarkdown(block.content)}
          </p>
        );
      })}
    </div>
  );
}

// Inline formatting helper for bold, code, and emphasis
function renderInlineMarkdown(text: string): React.ReactNode {
  // Simple regex parser for `code`, **bold**, *italic*
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 text-xs font-mono rounded bg-[#f2ede4] dark:bg-[#161b22] text-sky-700 dark:text-sky-300 border border-[#e7e3da] dark:border-[#30363d]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

// Lightweight block parser
function parseMarkdownBlocks(raw: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = raw.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim() || line.trim() === '---') {
      i++;
      continue;
    }

    // Code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().replace(/^```/, '').trim();
      let codeContent = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      i++; // skip closing ```
      blocks.push({
        type: 'code',
        language: lang || 'text',
        content: codeContent
      });
      continue;
    }

    // Headers
    if (line.startsWith('## ')) {
      const heading = line.replace('## ', '').trim();
      const id = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      blocks.push({ type: 'h2', content: heading, id });
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      const heading = line.replace('### ', '').trim();
      const id = heading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      blocks.push({ type: 'h3', content: heading, id });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      let bqContent = line.replace(/^>\s*/, '');
      i++;
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqContent += ' ' + lines[i].replace(/^>\s*/, '');
        i++;
      }
      blocks.push({ type: 'blockquote', content: bqContent });
      continue;
    }

    // Markdown Table
    if (line.startsWith('|') && line.endsWith('|')) {
      const headers = line
        .split('|')
        .slice(1, -1)
        .map((h) => h.trim());
      i++; // skip delimiter line |---|---|
      if (i < lines.length && lines[i].includes('---')) {
        i++;
      }
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const row = lines[i]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        rows.push(row);
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, '').trim());
        i++;
      }
      blocks.push({ type: 'olist', items });
      continue;
    }

    // Unordered list
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].replace(/^- /, '').trim());
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Paragraph
    let paragraph = line;
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('> ') &&
      !lines[i].startsWith('|') &&
      !lines[i].startsWith('- ') &&
      !/^\d+\.\s/.test(lines[i])
    ) {
      paragraph += ' ' + lines[i].trim();
      i++;
    }
    blocks.push({ type: 'p', content: paragraph });
  }

  return blocks;
}
