import React, { useEffect, useState } from 'react';
import { TocItem } from '../types';
import { AlignLeft } from 'lucide-react';

interface TableOfContentsProps {
  items: TocItem[];
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ items }) => {
  const [activeId, setActiveId] = useState<string>(items[0]?.id || '');

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0% -60% 0%',
        threshold: 0
      }
    );

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const topOffset = 85;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveId(id);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <nav className="text-xs space-y-2" aria-label="Table of contents">
      <div className="flex items-center gap-1.5 font-semibold text-[#1c1917] dark:text-[#f0f6fc] tracking-wider uppercase text-[11px] mb-3 pb-2 border-b border-[#e7e3da] dark:border-[#30363d]">
        <AlignLeft className="w-3.5 h-3.5 text-sky-500" />
        <span>Contents</span>
      </div>

      <ul className="space-y-1.5 border-l border-[#e7e3da] dark:border-[#30363d] pl-2.5">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li
              key={item.id}
              className={`${item.level === 3 ? 'ml-3' : ''}`}
            >
              <button
                onClick={() => scrollToHeading(item.id)}
                className={`text-left block w-full py-1 leading-snug transition-colors line-clamp-2 ${
                  isActive
                    ? 'text-sky-600 dark:text-sky-400 font-semibold -ml-[11px] pl-2.5 border-l-2 border-sky-500'
                    : 'text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc]'
                }`}
              >
                {item.title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
