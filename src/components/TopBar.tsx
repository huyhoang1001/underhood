import React, { useEffect, useState } from 'react';
import { Search, Sun, Moon, Rss } from 'lucide-react';
import { useTheme } from './ThemeContext';
import { ViewRoute } from '../types';

interface TopBarProps {
  currentPath?: string;
  currentRoute?: ViewRoute;
  onNavigate?: (route: ViewRoute) => void;
  onOpenSearch: () => void;
  onOpenRss: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPath: initialPath,
  currentRoute,
  onNavigate,
  onOpenSearch,
  onOpenRss
}) => {
  const { theme, toggleTheme } = useTheme();
  const [currentPath, setCurrentPath] = useState(initialPath || '/');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string, route: ViewRoute) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate(route);
    }
  };

  const isWritingActive = currentPath.startsWith('/writing') || currentRoute?.view === 'writing' || currentRoute?.view === 'article';
  const isTopicsActive = currentPath.startsWith('/topics') || currentRoute?.view === 'topics';
  const isExperimentsActive = currentPath.startsWith('/experiments') || currentRoute?.view === 'experiments';
  const isAboutActive = currentPath.startsWith('/about') || currentRoute?.view === 'about';

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#fbf9f5]/85 dark:bg-[#0d1117]/85 border-b border-[#e7e3da] dark:border-[#30363d] transition-colors duration-200">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 h-16">
        {/* Zone 1: Single element brand wordmark */}
        <a
          href="/"
          onClick={(e) => handleLinkClick(e, '/', { view: 'home' })}
          className="text-lg font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc] hover:text-sky-600 dark:hover:text-sky-400 transition-colors whitespace-nowrap shrink-0 focus:outline-none"
          aria-label="Underhood Homepage"
        >
          Underhood
        </a>

        {/* Zone 2: Nav links */}
        <nav className="hidden sm:flex items-center gap-7 text-sm font-medium text-[#78716c] dark:text-[#8b949e]">
          <a
            href="/writing"
            onClick={(e) => handleLinkClick(e, '/writing', { view: 'writing' })}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#1c1917] dark:hover:text-[#f0f6fc] ${
              isWritingActive
                ? 'text-sky-600 dark:text-sky-400 font-semibold underline underline-offset-4 decoration-2 decoration-sky-500'
                : ''
            }`}
          >
            Writing
          </a>
          <a
            href="/topics"
            onClick={(e) => handleLinkClick(e, '/topics', { view: 'topics' })}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#1c1917] dark:hover:text-[#f0f6fc] ${
              isTopicsActive
                ? 'text-sky-600 dark:text-sky-400 font-semibold underline underline-offset-4 decoration-2 decoration-sky-500'
                : ''
            }`}
          >
            Topics
          </a>
          <a
            href="/experiments"
            onClick={(e) => handleLinkClick(e, '/experiments', { view: 'experiments' })}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#1c1917] dark:hover:text-[#f0f6fc] ${
              isExperimentsActive
                ? 'text-sky-600 dark:text-sky-400 font-semibold underline underline-offset-4 decoration-2 decoration-sky-500'
                : ''
            }`}
          >
            Experiments
          </a>
          <a
            href="/about"
            onClick={(e) => handleLinkClick(e, '/about', { view: 'about' })}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-[#1c1917] dark:hover:text-[#f0f6fc] ${
              isAboutActive
                ? 'text-sky-600 dark:text-sky-400 font-semibold underline underline-offset-4 decoration-2 decoration-sky-500'
                : ''
            }`}
          >
            About
          </a>
        </nav>

        {/* Zone 3: Actions & utilities */}
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
        <a
          href="/writing"
          onClick={(e) => handleLinkClick(e, '/writing', { view: 'writing' })}
          className={`px-2 py-1 ${isWritingActive ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
        >
          Writing
        </a>
        <a
          href="/topics"
          onClick={(e) => handleLinkClick(e, '/topics', { view: 'topics' })}
          className={`px-2 py-1 ${isTopicsActive ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
        >
          Topics
        </a>
        <a
          href="/experiments"
          onClick={(e) => handleLinkClick(e, '/experiments', { view: 'experiments' })}
          className={`px-2 py-1 ${isExperimentsActive ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
        >
          Experiments
        </a>
        <a
          href="/about"
          onClick={(e) => handleLinkClick(e, '/about', { view: 'about' })}
          className={`px-2 py-1 ${isAboutActive ? 'text-sky-600 dark:text-sky-400 font-semibold' : ''}`}
        >
          About
        </a>
      </div>
    </header>
  );
};
