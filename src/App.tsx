import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './components/ThemeContext';
import { TopBar } from './components/TopBar';
import { ReadingProgressBar } from './components/ReadingProgressBar';
import { CommandPalette } from './components/CommandPalette';
import { RssModal } from './components/RssModal';
import { Footer } from './components/Footer';
import { HomeView } from './views/HomeView';
import { WritingView } from './views/WritingView';
import { ArticleView } from './views/ArticleView';
import { TopicsView } from './views/TopicsView';
import { ExperimentsView } from './views/ExperimentsView';
import { AboutView } from './views/AboutView';
import { NotFoundView } from './views/NotFoundView';
import { ViewRoute, TopicId } from './types';
import { getArticleBySlug, getExperimentBySlug } from './lib/content';

/**
 * Resolves browser URL pathname or hash to a typed ViewRoute.
 * Validates slugs and gracefully routes missing content to 404.
 */
function resolveRouteFromLocation(): ViewRoute {
  if (typeof window === 'undefined') {
    return { view: 'home' };
  }

  // Support both clean pathname and legacy hash fallback
  let path = window.location.pathname;
  if ((!path || path === '/') && window.location.hash) {
    path = '/' + window.location.hash.replace(/^#\/?/, '');
  }

  // Normalize path
  const normalized = path.replace(/\/+$/, '') || '/';
  const parts = normalized.split('/').filter(Boolean);

  if (parts.length === 0 || normalized === '/') {
    return { view: 'home' };
  }

  if (parts[0] === 'writing') {
    if (parts[1]) {
      const slug = parts[1];
      const article = getArticleBySlug(slug);
      if (!article) {
        return { view: 'not-found', path: normalized };
      }
      return { view: 'article', slug };
    }
    return { view: 'writing' };
  }

  if (parts[0] === 'topics') {
    if (parts[1]) {
      return { view: 'topics', topicId: parts[1] as TopicId };
    }
    return { view: 'topics' };
  }

  if (parts[0] === 'experiments') {
    if (parts[1]) {
      const slug = parts[1];
      const exp = getExperimentBySlug(slug);
      if (!exp) {
        return { view: 'not-found', path: normalized };
      }
      return { view: 'experiments', slug };
    }
    return { view: 'experiments' };
  }

  if (parts[0] === 'about') {
    return { view: 'about' };
  }

  return { view: 'not-found', path: normalized };
}

/**
 * Builds clean URL pathname from ViewRoute
 */
function routeToPath(route: ViewRoute): string {
  switch (route.view) {
    case 'home':
      return '/';
    case 'writing':
      return '/writing';
    case 'article':
      return `/writing/${route.slug}`;
    case 'topics':
      return route.topicId ? `/topics/${route.topicId}` : '/topics';
    case 'experiments':
      return route.slug ? `/experiments/${route.slug}` : '/experiments';
    case 'about':
      return '/about';
    case 'not-found':
      return route.path || '/404';
  }
}

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<ViewRoute>(() => resolveRouteFromLocation());
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRssOpen, setIsRssOpen] = useState(false);

  // Navigate handler updating route and browser history
  const handleNavigate = (route: ViewRoute) => {
    setCurrentRoute(route);
    const newPath = routeToPath(route);

    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Listen to browser popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(resolveRouteFromLocation());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[#fbf9f5] dark:bg-[#0d1117] text-[#1c1917] dark:text-[#e6edf3] font-sans antialiased selection:bg-sky-500/20 selection:text-inherit flex flex-col justify-between transition-colors duration-200">
        {/* Top Reading Progress Bar (always active during article view) */}
        {currentRoute.view === 'article' && <ReadingProgressBar />}

        <div>
          {/* Header Navigation following strict 3-zone contract */}
          <TopBar
            currentRoute={currentRoute}
            onNavigate={handleNavigate}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenRss={() => setIsRssOpen(true)}
          />

          {/* Main Content Viewport */}
          <main className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
            {currentRoute.view === 'home' && (
              <HomeView
                onNavigate={handleNavigate}
                onOpenRss={() => setIsRssOpen(true)}
              />
            )}
            {currentRoute.view === 'writing' && (
              <WritingView
                initialTopic={currentRoute.topic}
                initialTag={currentRoute.tag}
                onNavigate={handleNavigate}
                onOpenRss={() => setIsRssOpen(true)}
              />
            )}
            {currentRoute.view === 'article' && (
              <ArticleView
                slug={currentRoute.slug}
                onNavigate={handleNavigate}
              />
            )}
            {currentRoute.view === 'topics' && (
              <TopicsView
                activeTopicId={currentRoute.topicId}
                onNavigate={handleNavigate}
              />
            )}
            {currentRoute.view === 'experiments' && (
              <ExperimentsView
                slug={currentRoute.slug}
                onNavigate={handleNavigate}
              />
            )}
            {currentRoute.view === 'about' && (
              <AboutView
                onNavigate={handleNavigate}
                onOpenRss={() => setIsRssOpen(true)}
              />
            )}
            {currentRoute.view === 'not-found' && (
              <NotFoundView
                path={currentRoute.path}
                onNavigate={handleNavigate}
              />
            )}
          </main>
        </div>

        {/* Global Footer */}
        <Footer
          onNavigate={handleNavigate}
          onOpenRss={() => setIsRssOpen(true)}
        />

        {/* Global Command Palette / Search Modal */}
        <CommandPalette
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          onNavigate={handleNavigate}
        />

        {/* RSS Feed Preview Modal */}
        <RssModal
          isOpen={isRssOpen}
          onClose={() => setIsRssOpen(false)}
        />
      </div>
    </ThemeProvider>
  );
}
