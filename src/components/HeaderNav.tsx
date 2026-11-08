import React, { useState } from 'react';
import { TopBar } from './TopBar';
import { CommandPalette } from './CommandPalette';
import { RssModal } from './RssModal';
import { ThemeProvider } from './ThemeContext';

export function HeaderNav({ currentPath }: { currentPath: string }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isRssOpen, setIsRssOpen] = useState(false);

  return (
    <ThemeProvider>
      <TopBar
        currentPath={currentPath}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenRss={() => setIsRssOpen(true)}
      />
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(route) => {
          if (route.view === 'home') window.location.href = '/';
          else if (route.view === 'writing') window.location.href = '/writing';
          else if (route.view === 'article') window.location.href = `/writing/${route.slug}`;
          else if (route.view === 'experiments') window.location.href = route.slug ? `/experiments/${route.slug}` : '/experiments';
          else if (route.view === 'topics') window.location.href = route.topicId ? `/topics/${route.topicId}` : '/topics';
          else if (route.view === 'about') window.location.href = '/about';
        }}
      />
      <RssModal isOpen={isRssOpen} onClose={() => setIsRssOpen(false)} />
    </ThemeProvider>
  );
}
