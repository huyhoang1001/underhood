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
import { ViewRoute, TopicId } from './types';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<ViewRoute>(() => {
    // Parse initial URL hash if present
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const parts = hash.split('/');

      if (parts[0] === 'writing' && parts[1]) {
        return { view: 'article', slug: parts[1] };
      }
      if (parts[0] === 'writing') {
        return { view: 'writing' };
      }
      if (parts[0] === 'topics' && parts[1]) {
        return { view: 'topics', topicId: parts[1] as TopicId };
      }
      if (parts[0] === 'topics') {
        return { view: 'topics' };
      }
      if (parts[0] === 'experiments' && parts[1]) {
        return { view: 'experiments', slug: parts[1] };
      }
      if (parts[0] === 'experiments') {
        return { view: 'experiments' };
      }
      if (parts[0] === 'about') {
        return { view: 'about' };
      }
    }
    return { view: 'home' };
  });

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRssOpen, setIsRssOpen] = useState(false);

  // Sync hash on navigation
  const handleNavigate = (route: ViewRoute) => {
    setCurrentRoute(route);
    let hash = '';
    if (route.view === 'home') hash = '';
    else if (route.view === 'writing') hash = '#writing';
    else if (route.view === 'article') hash = `#writing/${route.slug}`;
    else if (route.view === 'topics') {
      hash = route.topicId ? `#topics/${route.topicId}` : '#topics';
    } else if (route.view === 'experiments') {
      hash = route.slug ? `#experiments/${route.slug}` : '#experiments';
    } else if (route.view === 'about') hash = '#about';

    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash || window.location.pathname);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Listen to browser popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      const parts = hash.split('/');

      if (parts[0] === 'writing' && parts[1]) {
        setCurrentRoute({ view: 'article', slug: parts[1] });
      } else if (parts[0] === 'writing') {
        setCurrentRoute({ view: 'writing' });
      } else if (parts[0] === 'topics' && parts[1]) {
        setCurrentRoute({ view: 'topics', topicId: parts[1] as TopicId });
      } else if (parts[0] === 'topics') {
        setCurrentRoute({ view: 'topics' });
      } else if (parts[0] === 'experiments' && parts[1]) {
        setCurrentRoute({ view: 'experiments', slug: parts[1] });
      } else if (parts[0] === 'experiments') {
        setCurrentRoute({ view: 'experiments' });
      } else if (parts[0] === 'about') {
        setCurrentRoute({ view: 'about' });
      } else {
        setCurrentRoute({ view: 'home' });
      }
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
              <HomeView onNavigate={handleNavigate} />
            )}
            {currentRoute.view === 'writing' && (
              <WritingView
                initialTopic={currentRoute.topic}
                initialTag={currentRoute.tag}
                onNavigate={handleNavigate}
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
