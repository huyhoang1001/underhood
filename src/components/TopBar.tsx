import React from 'react';
import { Search, Sun, Moon, Rss } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { ViewRoute } from '../types';

interface TopBarProps {
  currentRoute: ViewRoute;
  onNavigate: (route: ViewRoute) => void;
  onOpenSearch: () => void;
  onOpenRss: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentRoute,
  onNavigate,
  onOpenSearch,
  onOpenRss
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#fbf9f5]/85 dark:bg-[#0d1117]/85 border-b border-[#e7e3da] dark:border-[#30363d] transition-colors duration-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 h-16">
        {/* Zone 1: Single element brand wordmark */}
        <button
          onClick={() => onNavigate({ view: 'home' })}
          className="text-lg font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc] hover:text-sky-600 dark:hover:text-sky-400 transition-colors whitespace-nowrap shrink-0 focus:outline-none"
          aria-label="Underhood Homepage"
        >
          Underhood
        </button>

        {/* Zone 2: 4-5 clean single-line nav links with hover underlines */}
        <nav className="hidden sm:flex items-center gap-7 text-sm font-medium text-[#78716c] dark:text-[#8b949e]">
          <button
            onClick={() => onNavigate({ view: 'writing' })}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#1c1917] dark:hover:text-[#f0f6fc] ${
              currentRoute.view === 'writing' || currentRoute.view === 'article'
                ? 'text-sky-600 dark:text-sky-400 font-semibold underline underline-offset-4 decoration-2 decoration-sky-500'
                : ''
            }`}
          >
            Writing
          </button>
          <button
            onClick={() => onNavigate({ view: 'topics' })}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#1c1917] dark:hover:text-[#f0f6fc] ${
              currentRoute.view === 'topics'
                ? 'text-sky-600 dark:text-sky-400 font-semibold underline underline-offset-4 decoration-2 decoration-sky-500'
                : ''
            }`}
          >
            Topics
          </button>
          <button
            onClick={() => onNavigate({ view: 'experiments' })}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#1c1917] dark:hover:text-[#f0f6fc] ${
              currentRoute.view === 'experiments'
                ? 'text-sky-600 dark:text-sky-400 font-semibold underline underline-offset-4 decoration-2 decoration-sky-500'
                : ''
            }`}
          >
            Experiments
          </button>
          <button
            onClick={() => onNavigate({ view: 'about' })}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#1c1917] dark:hover:text-[#f0f6fc] ${
              currentRoute.view === 'about'
                ? 'text-sky-600 dark:text-sky-400 font-semibold underline underline-offset-4 decoration-2 decoration-sky-500'
                : ''
            }`}
          >
            About
          </button>
        </nav>

        {/* Zone 3: Actions & utilities (Search, RSS, Theme toggle) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#78716c] dark:text-[#8b949e] bg-[#f2ede4] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d] rounded-md hover:border-sky-500/50 hover:text-[#1c1917] dark:hover:text-[#f0f6fc] transition-colors whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label="Search articles (Cmd+K)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden md:inline px-1 py-0.5 text-[10px] font-mono bg-[#e7e3da] dark:bg-[#21262d] text-[#78716c] dark:text-[#8b949e] rounded border border-[#d6cebe] dark:border-[#30363d]">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={onOpenRss}
            className="p-1.5 text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc] hover:bg-[#f2ede4] dark:hover:bg-[#161b22] rounded-md transition-colors"
            title="RSS Feed"
            aria-label="RSS Feed"
          >
            <Rss className="w-4 h-4" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc] hover:bg-[#f2ede4] dark:hover:bg-[#161b22] rounded-md transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="sm:hidden flex items-center justify-around border-t border-[#e7e3da] dark:border-[#30363d] py-2 px-4 text-xs font-medium text-[#78716c] dark:text-[#8b949e]">
        <button
          onClick={() => onNavigate({ view: 'writing' })}
          className={`px-2 py-1 ${currentRoute.view === 'writing' || currentRoute.view === 'article' ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
        >
          Writing
        </button>
        <button
          onClick={() => onNavigate({ view: 'topics' })}
          className={`px-2 py-1 ${currentRoute.view === 'topics' ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
        >
          Topics
        </button>
        <button
          onClick={() => onNavigate({ view: 'experiments' })}
          className={`px-2 py-1 ${currentRoute.view === 'experiments' ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
        >
          Experiments
        </button>
        <button
          onClick={() => onNavigate({ view: 'about' })}
          className={`px-2 py-1 ${currentRoute.view === 'about' ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
        >
          About
        </button>
      </div>
    </header>
  );
};
