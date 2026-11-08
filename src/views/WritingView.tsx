import React, { useState, useMemo } from 'react';
import { Search, X, BookOpen, Rss, Clock } from 'lucide-react';
import { getArticles, toArticle } from '../lib/content';
import { TOPIC_LIST } from '../data/topics';
import { ViewRoute, TopicId } from '../types';

interface WritingViewProps {
  initialTopic?: TopicId;
  initialTag?: string;
  onNavigate: (route: ViewRoute) => void;
  onOpenRss?: () => void;
}

export const WritingView: React.FC<WritingViewProps> = ({
  initialTopic,
  initialTag,
  onNavigate,
  onOpenRss
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic || 'all');
  const [selectedTag, setSelectedTag] = useState<string>(initialTag || 'all');

  const articles = useMemo(() => getArticles().map(toArticle), []);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    articles.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [articles]);

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      // Topic filter
      if (selectedTopic !== 'all' && article.topic !== selectedTopic) {
        return false;
      }
      // Tag filter
      if (selectedTag !== 'all' && !article.tags.includes(selectedTag)) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = article.title.toLowerCase().includes(q);
        const matchesDesc = article.description.toLowerCase().includes(q);
        const matchesContent = article.content.toLowerCase().includes(q);
        const matchesTag = article.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesContent && !matchesTag) {
          return false;
        }
      }
      return true;
    });
  }, [articles, selectedTopic, selectedTag, searchQuery]);

  // Graceful empty state when zero articles are published
  if (articles.length === 0) {
    return (
      <div className="py-16 sm:py-24 space-y-8 max-w-2xl mx-auto text-center">
        <div className="inline-flex p-3 rounded-full bg-sky-500/10 text-sky-500">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc]">
            Writing & Engineering Essays
          </h1>
          <p className="text-sm sm:text-base text-[#78716c] dark:text-[#8b949e] leading-relaxed">
            Underhood&apos;s upcoming technical investigations and reproducibility benchmarks are currently in draft review and peer reproduction.
          </p>
        </div>
        <div className="p-6 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] text-xs space-y-3 text-left">
          <div className="font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400 font-semibold text-[11px]">
            Editorial Standards
          </div>
          <p className="text-[#44403c] dark:text-[#c9d1d9] leading-relaxed">
            Every publication on Underhood requires automated test harnesses, measurable latency distributions, and verifiable system traces. We do not publish speculative content without empirical evidence.
          </p>
          <div className="pt-2 flex items-center gap-3">
            {onOpenRss && (
              <button
                onClick={onOpenRss}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors"
              >
                <Rss className="w-3.5 h-3.5" />
                <span>Subscribe via RSS</span>
              </button>
            )}
            <button
              onClick={() => onNavigate({ view: 'about' })}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              Learn about our editorial philosophy →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 py-8 sm:py-12">
      {/* Title & Introduction */}
      <div className="space-y-3 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc]">
          Writing
        </h1>
        <p className="text-sm sm:text-base text-[#78716c] dark:text-[#8b949e] leading-relaxed">
          Essays, architectural retrospectives, and deep technical analyses across distributed systems, runtime internals, and performance engineering.
        </p>
      </div>

      {/* Filter Bar & Search Input */}
      <div className="space-y-4">
        {/* Search input */}
        <div className="relative max-w-xl">
          <Search className="w-4 h-4 text-[#78716c] dark:text-[#8b949e] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter articles by keyword, protocol, or concept..."
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-[#ffffff] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d] rounded-lg text-[#1c1917] dark:text-[#f0f6fc] placeholder-[#78716c] dark:placeholder-[#8b949e] focus:outline-none focus:border-sky-500 transition-colors shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#78716c] hover:text-[#1c1917] dark:hover:text-[#f0f6fc]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Clean Topic Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <button
            onClick={() => setSelectedTopic('all')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
              selectedTopic === 'all'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc] bg-[#f2ede4] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d]'
            }`}
          >
            All Topics ({articles.length})
          </button>
          {TOPIC_LIST.map((topic) => {
            const count = articles.filter((a) => a.topic === topic.id).length;
            if (count === 0) return null;
            return (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
                  selectedTopic === topic.id
                    ? 'bg-sky-600 text-white shadow-2xs'
                    : 'text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc] bg-[#f2ede4] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d]'
                }`}
              >
                {topic.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Tag Filters */}
        {selectedTopic === 'all' && allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 text-xs text-[#78716c] dark:text-[#8b949e]">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#a8a29e] dark:text-[#6e7681]">
              Tags:
            </span>
            <button
              onClick={() => setSelectedTag('all')}
              className={`hover:underline ${selectedTag === 'all' ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <React.Fragment key={tag}>
                <span>·</span>
                <button
                  onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
                  className={`hover:underline ${selectedTag === tag ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
                >
                  #{tag}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Articles List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-[#e7e3da] dark:border-[#30363d] text-xs font-mono text-[#78716c] dark:text-[#8b949e]">
          <span>Showing {filteredArticles.length} {filteredArticles.length === 1 ? 'essay' : 'essays'}</span>
          <span>Sorted by Publication Date</span>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#78716c] dark:text-[#8b949e]">
            No articles match the current filter criteria.
            <div className="mt-3">
              <button
                onClick={() => {
                  setSelectedTopic('all');
                  setSelectedTag('all');
                  setSearchQuery('');
                }}
                className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline"
              >
                Reset filters
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#e7e3da] dark:divide-[#30363d]">
            {filteredArticles.map((article) => (
              <article
                key={article.slug}
                onClick={() => onNavigate({ view: 'article', slug: article.slug })}
                className="group py-8 first:pt-0 cursor-pointer space-y-3"
              >
                {/* Zero-pill unboxed metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716c] dark:text-[#8b949e]">
                  <span className="font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-[11px]">
                    {article.topic.replace(/-/g, ' ')}
                  </span>
                  <span>·</span>
                  <span>{article.date}</span>
                  <span>·</span>
                  <span>{article.readingTime}</span>
                  {article.draft && (
                    <>
                      <span>·</span>
                      <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold text-[11px] uppercase tracking-wider">
                        [Local Review Draft]
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-[#1c1917] dark:text-[#f0f6fc] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                  {article.title}
                </h2>

                <p className="text-sm text-[#78716c] dark:text-[#8b949e] leading-relaxed max-w-3xl">
                  {article.description}
                </p>

                <div className="flex items-center gap-2 text-xs text-[#a8a29e] dark:text-[#6e7681] pt-1">
                  {article.tags.map((tag, tIdx) => (
                    <React.Fragment key={tag}>
                      {tIdx > 0 && <span>·</span>}
                      <span>#{tag}</span>
                    </React.Fragment>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
