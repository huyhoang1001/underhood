import React from 'react';
import { ArrowLeft, Compass, BookOpen, Terminal } from 'lucide-react';
import { ViewRoute } from '../types';

interface NotFoundViewProps {
  path?: string;
  onNavigate: (route: ViewRoute) => void;
}

export const NotFoundView: React.FC<NotFoundViewProps> = ({ path, onNavigate }) => {
  return (
    <div className="py-20 sm:py-28 text-center max-w-xl mx-auto space-y-8">
      {/* 404 Visual badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#f2ede4] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d] text-xs font-mono text-[#78716c] dark:text-[#8b949e]">
        <Terminal className="w-3.5 h-3.5 text-sky-500" />
        <span>HTTP 404 · RESOURCE_NOT_FOUND</span>
      </div>

      <div className="space-y-3">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc]">
          Endpoint not located.
        </h1>
        <p className="text-sm sm:text-base text-[#78716c] dark:text-[#8b949e] leading-relaxed max-w-md mx-auto">
          The requested path {path ? <code className="text-sky-600 dark:text-sky-400 font-mono text-xs">{path}</code> : 'resource'} does not correspond to a published essay, experiment, or valid system route.
        </p>
      </div>

      <div className="p-4 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#ffffff] dark:bg-[#161b22] text-xs text-left font-mono space-y-1.5 text-[#78716c] dark:text-[#8b949e] max-w-md mx-auto shadow-2xs">
        <div className="text-[11px] uppercase tracking-wider text-[#a8a29e] dark:text-[#6e7681]">
          Debug Diagnosis
        </div>
        <p className="text-[#1c1917] dark:text-[#f0f6fc]">
          1. The slug may have been renamed or relocated.
        </p>
        <p className="text-[#1c1917] dark:text-[#f0f6fc]">
          2. The document is an unreleased draft and not accessible in production.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
        <button
          onClick={() => onNavigate({ view: 'writing' })}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors shadow-xs"
        >
          <BookOpen className="w-4 h-4" />
          <span>Browse Writing Index</span>
        </button>

        <button
          onClick={() => onNavigate({ view: 'home' })}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-[#1c1917] dark:text-[#f0f6fc] bg-[#f2ede4] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d] hover:border-slate-400 dark:hover:border-slate-600 rounded-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};
