import React, { useState } from 'react';
import { Footer } from './Footer';
import { RssModal } from './RssModal';
import { ThemeProvider } from './ThemeContext';

export function FooterNav() {
  const [isRssOpen, setIsRssOpen] = useState(false);

  return (
    <ThemeProvider>
      <Footer onOpenRss={() => setIsRssOpen(true)} />
      <RssModal isOpen={isRssOpen} onClose={() => setIsRssOpen(false)} />
    </ThemeProvider>
  );
}
