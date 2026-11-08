import React, { useState, useMemo } from 'react';
import { Search, X, BookOpen, Filter } from 'lucide-react';
import { ARTICLES } from '../data/articles';
import { TOPIC_LIST } from '../data/topics';
import { ViewRoute, TopicId } from '../types';

interface WritingViewProps {
  initialTopic?: TopicId;
  initialTag?: string;
  onNavigate: (route: ViewRoute) => void;
}

export const WritingView: React.FC<WritingViewProps> = ({
  initialTopic,
  initialTag,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<string>(initialTopic || 'all');
  const [selectedTag, setSelectedTag] = useState<string>(initialTag || 'all');

  // Extract all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    ARTICLES.forEach((a) => a.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, []);

  const filteredArticles = useMemo(() => {
    return ARTICLES.filter((article) => {
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
  }, [selectedTopic, selectedTag, searchQuery]);

  return (
    <div className="space-y-10 py-8 sm:py-12">
      {/* Title & Introduction */}
      <div className="space-y-3 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc]">
          Writing
        </h1>
        <p className="text-sm sm:text-base text-[#78716c] dark:text-[#8b949e] leading-relaxed">
          Essays, architectural retrospectives, and deep technical analyses across distributed systems, protocols, and performance engineering.
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

        {/* Clean Topic Buttons (Functional segmented buttons) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <button
            onClick={() => setSelectedTopic('all')}
            className={`px-3 py-1.5 font-medium rounded-md transition-colors whitespace-nowrap ${
              selectedTopic === 'all'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc] bg-[#f2ede4] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d]'
            }`}
          >
            All Topics ({ARTICLES.length})
          </button>
          {TOPIC_LIST.map((topic) => {
            const count = ARTICLES.filter((a) => a.topic === topic.id).length;
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

        {/* Tag Filters (Optional refined filtering) */}
        {selectedTopic === 'all' && (
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
          <span>Showing {filteredArticles.length} published essays</span>
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
