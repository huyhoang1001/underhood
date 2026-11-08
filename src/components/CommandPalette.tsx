import React, { useEffect, useState, useRef } from 'react';
import { Search, X, BookOpen, FlaskConical, ArrowRight } from 'lucide-react';
import { ARTICLES } from '../data/articles';
import { EXPERIMENTS } from '../data/experiments';
import { ViewRoute } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: ViewRoute) => void;
}

interface SearchResult {
  id: string;
  type: 'article' | 'experiment';
  title: string;
  description: string;
  snippet?: string;
  tagline?: string;
  topic: string;
  slug: string;
  tags?: string[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Trigger open if parent handles or focus
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
      setQuery('');
    }
  }, [isOpen]);

  const cleanQuery = query.toLowerCase().trim();

  const results: SearchResult[] = React.useMemo(() => {
    const items: SearchResult[] = [];

    // Articles
    ARTICLES.forEach((a) => {
      let score = 0;
      let matchedSnippet = '';
      const titleLower = a.title.toLowerCase();
      const descLower = a.description.toLowerCase();
      const contentLower = a.content.toLowerCase();
      const tagsMatch = a.tags.some((t) => t.toLowerCase().includes(cleanQuery));

      if (!cleanQuery) {
        score = a.featured ? 2 : 1;
      } else {
        if (titleLower.includes(cleanQuery)) score += 10;
        if (descLower.includes(cleanQuery)) score += 5;
        if (tagsMatch) score += 4;
        if (contentLower.includes(cleanQuery)) {
          score += 2;
          const idx = contentLower.indexOf(cleanQuery);
          const start = Math.max(0, idx - 40);
          const end = Math.min(a.content.length, idx + cleanQuery.length + 50);
          matchedSnippet = '...' + a.content.slice(start, end).replace(/\n/g, ' ') + '...';
        }
      }

      if (score > 0) {
        items.push({
          id: `art-${a.slug}`,
          type: 'article',
          title: a.title,
          description: a.description,
          snippet: matchedSnippet,
          topic: a.topic,
          slug: a.slug,
          tags: a.tags
        });
      }
    });

    // Experiments
    EXPERIMENTS.forEach((e) => {
      let score = 0;
      const titleLower = e.title.toLowerCase();
      const tagLower = e.tagline.toLowerCase();
      const hypLower = e.hypothesis.toLowerCase();

      if (!cleanQuery) {
        score = 1;
      } else {
        if (titleLower.includes(cleanQuery)) score += 10;
        if (tagLower.includes(cleanQuery)) score += 5;
        if (hypLower.includes(cleanQuery)) score += 3;
      }

      if (score > 0) {
        items.push({
          id: `exp-${e.slug}`,
          type: 'experiment',
          title: e.title,
          description: e.tagline,
          topic: e.topic,
          slug: e.slug
        });
      }
    });

    return items;
  }, [cleanQuery]);

  const handleSelect = (result: SearchResult) => {
    onClose();
    if (result.type === 'article') {
      onNavigate({ view: 'article', slug: result.slug });
    } else {
      onNavigate({ view: 'experiments', slug: result.slug });
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#ffffff] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#e7e3da] dark:border-[#30363d]">
          <Search className="w-5 h-5 text-[#78716c] dark:text-[#8b949e] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search articles, experiments, topics, or engineering principles..."
            className="w-full bg-transparent text-sm text-[#1c1917] dark:text-[#f0f6fc] placeholder-[#78716c] dark:placeholder-[#8b949e] focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline px-1.5 py-0.5 text-[10px] font-mono text-[#78716c] dark:text-[#8b949e] bg-[#f2ede4] dark:bg-[#21262d] rounded border border-[#d6cebe] dark:border-[#30363d]">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div className="overflow-y-auto p-2 divide-y divide-[#e7e3da]/40 dark:divide-[#30363d]/40">
          {results.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#78716c] dark:text-[#8b949e]">
              No results found for &ldquo;{query}&rdquo;.
              <div className="text-xs text-[#a8a29e] dark:text-[#6e7681] mt-2">
                Try searching for &ldquo;backpressure&rdquo;, &ldquo;grpc&rdquo;, &ldquo;queue&rdquo;, or &ldquo;retries&rdquo;.
              </div>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#f2ede4] dark:bg-[#21262d] text-[#1c1917] dark:text-[#f0f6fc]'
                      : 'hover:bg-[#f7f4ee] dark:hover:bg-[#1c2128] text-[#44403c] dark:text-[#c9d1d9]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-sky-600 dark:text-sky-400 font-medium">
                      {item.type === 'article' ? (
                        <>
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Article</span>
                        </>
                      ) : (
                        <>
                          <FlaskConical className="w-3.5 h-3.5" />
                          <span>Experiment</span>
                        </>
                      )}
                      <span className="text-[#a8a29e] dark:text-[#6e7681]">·</span>
                      <span className="capitalize">{item.topic.replace(/-/g, ' ')}</span>
                    </div>
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    )}
                  </div>

                  <h4 className="text-sm font-semibold text-[#1c1917] dark:text-[#f0f6fc] mt-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#78716c] dark:text-[#8b949e] line-clamp-1 mt-0.5">
                    {item.description}
                  </p>

                  {item.snippet && (
                    <div className="text-[11px] font-mono text-[#78716c] dark:text-[#8b949e] bg-[#f7f4ee] dark:bg-[#0d1117] p-1.5 rounded mt-1.5 border border-[#e7e3da] dark:border-[#30363d]/60">
                      {item.snippet}
                    </div>
                  )}

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex items-center gap-2 text-[11px] text-[#a8a29e] dark:text-[#6e7681] mt-1.5">
                      {item.tags.slice(0, 4).map((tag, tIdx) => (
                        <React.Fragment key={tag}>
                          {tIdx > 0 && <span>·</span>}
                          <span>#{tag}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-[#f7f4ee] dark:bg-[#0d1117] border-t border-[#e7e3da] dark:border-[#30363d] flex items-center justify-between text-[11px] text-[#78716c] dark:text-[#8b949e]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>Instant Full-Text Search</span>
        </div>
      </div>
    </div>
  );
};
