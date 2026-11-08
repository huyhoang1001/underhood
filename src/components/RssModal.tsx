import React, { useState } from 'react';
import { X, Copy, Check, Rss } from 'lucide-react';
import { ARTICLES } from '../data/articles';

interface RssModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RssModal: React.FC<RssModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Generate authentic RSS 2.0 XML
  const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>Underhood — Engineering Beyond the Surface</title>
  <link>https://underhood.engineering</link>
  <description>An independent engineering publication exploring distributed systems, performance, backend architecture, and reproducible experiments.</description>
  <language>en-us</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="https://underhood.engineering/rss.xml" rel="self" type="application/rss+xml" />
${ARTICLES.map(
  (a) => `  <item>
    <title>${a.title}</title>
    <link>https://underhood.engineering/writing/${a.slug}</link>
    <description>${a.description}</description>
    <pubDate>${new Date(a.date).toUTCString()}</pubDate>
    <guid>https://underhood.engineering/writing/${a.slug}</guid>
    <category>${a.topic}</category>
  </item>`
).join('\n')}
</channel>
</rss>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rssXml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#ffffff] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#e7e3da] dark:border-[#30363d]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
            <Rss className="w-4 h-4 text-amber-500" />
            <span>Underhood RSS 2.0 Feed</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          <p className="text-[#44403c] dark:text-[#c9d1d9] leading-relaxed">
            Subscribe to Underhood in your favorite RSS reader (e.g. NetNewsWire, Feedly, Reeder, or Inoreader) to receive instant updates whenever new distributed systems essays or laboratory experiments are published.
          </p>

          <div className="flex items-center justify-between pt-1">
            <span className="font-mono text-[#78716c] dark:text-[#8b949e]">
              Feed URL: <strong>https://underhood.engineering/rss.xml</strong>
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied XML</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Feed XML</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-3 bg-[#f7f4ee] dark:bg-[#0d1117] rounded-lg border border-[#e7e3da] dark:border-[#30363d] font-mono text-[11px] text-[#78716c] dark:text-[#8b949e] overflow-x-auto max-h-56">
            {rssXml}
          </pre>
        </div>
      </div>
    </div>
  );
};
