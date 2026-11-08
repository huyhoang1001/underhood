import React from 'react';
import { ArrowUp, Github, Rss, ArrowUpRight } from 'lucide-react';
import { ViewRoute } from '../types';
import { TOPIC_LIST } from '../data/topics';

interface FooterProps {
  onNavigate: (route: ViewRoute) => void;
  onOpenRss: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenRss }) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full border-t border-[#e7e3da] dark:border-[#30363d] bg-[#fbf9f5] dark:bg-[#0d1117] text-xs text-[#78716c] dark:text-[#8b949e] py-12 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#e7e3da] dark:border-[#30363d]">
          {/* Brand & Editorial Column (5 cols) */}
          <div className="md:col-span-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc]">
                Underhood
              </span>
              <span className="text-xs text-[#a8a29e] dark:text-[#6e7681]">·</span>
              <span className="text-xs font-mono text-[#78716c] dark:text-[#8b949e]">
                Engineering beyond the surface.
              </span>
            </div>
            <p className="text-xs leading-relaxed text-[#78716c] dark:text-[#8b949e] max-w-sm">
              An independent technical publication exploring distributed consensus, high-throughput systems, tail latency, and what breaks under pressure.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <button
                onClick={onOpenRss}
                className="flex items-center gap-1.5 hover:text-[#1c1917] dark:hover:text-[#f0f6fc] transition-colors"
              >
                <Rss className="w-3.5 h-3.5 text-amber-500" />
                <span>RSS Feed</span>
              </button>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 hover:text-[#1c1917] dark:hover:text-[#f0f6fc] transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub Source</span>
              </a>
            </div>
          </div>

          {/* Navigation Tracks (3 cols) */}
          <div className="md:col-span-3 space-y-2.5">
            <div className="font-semibold text-xs uppercase tracking-wider text-[#1c1917] dark:text-[#f0f6fc]">
              Navigation
            </div>
            <ul className="space-y-1.5">
              <li>
                <button
                  onClick={() => onNavigate({ view: 'writing' })}
                  className="hover:text-[#1c1917] dark:hover:text-[#f0f6fc] transition-colors"
                >
                  All Articles
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate({ view: 'experiments' })}
                  className="hover:text-[#1c1917] dark:hover:text-[#f0f6fc] transition-colors"
                >
                  Engineering Lab
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate({ view: 'topics' })}
                  className="hover:text-[#1c1917] dark:hover:text-[#f0f6fc] transition-colors"
                >
                  Topic Directory
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate({ view: 'about' })}
                  className="hover:text-[#1c1917] dark:hover:text-[#f0f6fc] transition-colors"
                >
                  Author & Principles
                </button>
              </li>
            </ul>
          </div>

          {/* Core Domains (4 cols) */}
          <div className="md:col-span-4 space-y-2.5">
            <div className="font-semibold text-xs uppercase tracking-wider text-[#1c1917] dark:text-[#f0f6fc]">
              Core Disciplines
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              {TOPIC_LIST.slice(0, 6).map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => onNavigate({ view: 'topics', topicId: topic.id })}
                  className="text-left text-xs truncate hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  {topic.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#a8a29e] dark:text-[#6e7681]">
          <div>
            © {new Date().getFullYear()} Underhood Engineering. Crafted for high-fidelity technical reading.
          </div>
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 hover:text-[#1c1917] dark:hover:text-[#f0f6fc] transition-colors"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
