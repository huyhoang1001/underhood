import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Github,
  Check,
  Link as LinkIcon,
  ArrowRight,
  ArrowLeft as PrevIcon,
  AlertCircle
} from 'lucide-react';
import { ViewRoute } from '../types';
import { getArticleBySlug, getArticles, toArticle } from '../lib/content';
import { MdxRenderer } from '../lib/content/mdx';
import { TableOfContents } from '../components/TableOfContents';

interface ArticleViewProps {
  slug: string;
  onNavigate: (route: ViewRoute) => void;
}

export const ArticleView: React.FC<ArticleViewProps> = ({ slug, onNavigate }) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const doc = getArticleBySlug(slug);

  if (!doc) {
    return (
      <div className="py-16 sm:py-24 text-center max-w-xl mx-auto space-y-6">
        <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1917] dark:text-[#f0f6fc]">
          Article Not Found
        </h1>
        <p className="text-sm text-[#78716c] dark:text-[#8b949e] leading-relaxed">
          The requested essay &ldquo;{slug}&rdquo; does not exist or is currently restricted to local development review.
        </p>
        <div>
          <button
            onClick={() => onNavigate({ view: 'writing' })}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Writing Index</span>
          </button>
        </div>
      </div>
    );
  }

  const article = toArticle(doc);
  const allArticles = getArticles().map(toArticle);
  const articleIndex = allArticles.findIndex((a) => a.slug === slug);
  const prevArticle = articleIndex > 0 ? allArticles[articleIndex - 1] : null;
  const nextArticle = articleIndex >= 0 && articleIndex < allArticles.length - 1 ? allArticles[articleIndex + 1] : null;

  const relatedArticles = allArticles.filter((a) =>
    article.relatedSlugs?.includes(a.slug)
  );

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Clipboard fallback
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
            title={`${doc.wordCount.toLocaleString()} words · calculated at 200 words per minute baseline`}
          >
            <Clock className="w-3 h-3 text-[#a8a29e] dark:text-[#6e7681]" />
            <span className="font-medium text-[#1c1917] dark:text-[#f0f6fc]">
              {article.readingTime}
            </span>
            <span className="text-[11px] text-[#a8a29e] dark:text-[#6e7681] font-mono">
              ({doc.wordCount.toLocaleString()} words @ 200 wpm)
            </span>
          </span>
          {article.draft && (
            <>
              <span>·</span>
              <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold text-[11px] uppercase tracking-wider">
                [Local Review Draft]
              </span>
            </>
          )}
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

      {/* Main Two-Column Reading Canvas: Prose & Sticky TOC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-10">
        {/* Article Body Content (8 cols) */}
        <main className="lg:col-span-8 max-w-prose">
          <MdxRenderer content={article.content} />

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
          <TableOfContents items={doc.toc} />

          {/* Related Articles */}
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
