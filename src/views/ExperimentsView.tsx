import React from 'react';
import {
  ArrowLeft,
  FlaskConical,
  Github,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  ArrowRight,
  Sliders,
  Terminal
} from 'lucide-react';
import { EXPERIMENTS } from '../data/experiments';
import { ExperimentVisualizer } from '../components/ExperimentVisualizer';
import { ViewRoute } from '../types';

interface ExperimentsViewProps {
  slug?: string;
  onNavigate: (route: ViewRoute) => void;
}

export const ExperimentsView: React.FC<ExperimentsViewProps> = ({
  slug,
  onNavigate
}) => {
  // If viewing a specific experiment report
  if (slug) {
    const experiment = EXPERIMENTS.find((e) => e.slug === slug) || EXPERIMENTS[0];

    return (
      <div className="py-8 sm:py-12 space-y-10">
        <button
          onClick={() => onNavigate({ view: 'experiments' })}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All laboratory experiments</span>
        </button>

        {/* Experiment Header */}
        <header className="space-y-4 max-w-3xl pb-8 border-b border-[#e7e3da] dark:border-[#30363d]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#78716c] dark:text-[#8b949e]">
            <span className="font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-[11px]">
              {experiment.topic.replace(/-/g, ' ')}
            </span>
            <span>·</span>
            <span>Lab Test Run: {experiment.date}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc] leading-tight">
            {experiment.title}
          </h1>

          <p className="text-base text-[#78716c] dark:text-[#8b949e] leading-relaxed">
            {experiment.tagline}
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href={experiment.githubRepo}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1c1917] dark:text-[#f0f6fc] bg-[#f2ede4] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d] rounded-md hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>Reproducible Test Repository</span>
            </a>

            {experiment.relatedArticleSlug && (
              <button
                onClick={() =>
                  onNavigate({ view: 'article', slug: experiment.relatedArticleSlug! })
                }
                className="flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Read companion deep-dive essay</span>
              </button>
            )}
          </div>
        </header>

        {/* Hypothesis Callout */}
        <div className="p-5 rounded-lg border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 text-xs sm:text-sm leading-relaxed">
          <div className="text-[11px] font-mono uppercase tracking-wider text-sky-700 dark:text-sky-300 font-semibold mb-1">
            Experimental Hypothesis
          </div>
          <p className="text-[#1c1917] dark:text-[#f0f6fc]">{experiment.hypothesis}</p>
        </div>

        {/* Live Interactive Telemetry Simulator */}
        <div>
          <div className="flex items-center gap-2 pb-2 text-xs font-mono uppercase tracking-wider text-[#78716c] dark:text-[#8b949e]">
            <Sliders className="w-3.5 h-3.5 text-sky-500" />
            <span>Interactive Laboratory Simulation</span>
          </div>
          <ExperimentVisualizer type={experiment.interactiveType} />
        </div>

        {/* Methodology & Harness Setup */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="p-5 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#ffffff] dark:bg-[#161b22] space-y-3">
            <h2 className="text-sm font-bold text-[#1c1917] dark:text-[#f0f6fc] uppercase tracking-wider font-mono">
              Test Harness Setup
            </h2>
            <p className="text-xs sm:text-sm text-[#78716c] dark:text-[#8b949e] leading-relaxed">
              {experiment.setup}
            </p>
          </div>

          <div className="p-5 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#ffffff] dark:bg-[#161b22] space-y-3">
            <h2 className="text-sm font-bold text-[#1c1917] dark:text-[#f0f6fc] uppercase tracking-wider font-mono">
              Implementation Details
            </h2>
            <p className="text-xs sm:text-sm text-[#78716c] dark:text-[#8b949e] leading-relaxed">
              {experiment.implementation}
            </p>
          </div>
        </div>

        {/* Key Findings */}
        <div className="space-y-4 pt-4">
          <h2 className="text-base font-bold text-[#1c1917] dark:text-[#f0f6fc] uppercase tracking-wider font-mono text-xs">
            Key Empirical Findings
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {experiment.keyFindings.map((finding, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] flex items-start gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-[#44403c] dark:text-[#c9d1d9] leading-relaxed">
                  {finding}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Limitations */}
        <div className="space-y-3 pt-4">
          <h2 className="text-base font-bold text-[#1c1917] dark:text-[#f0f6fc] uppercase tracking-wider font-mono text-xs">
            Measurement Invariants & Limitations
          </h2>
          <ul className="space-y-2 text-xs sm:text-sm text-[#78716c] dark:text-[#8b949e]">
            {experiment.limitations.map((limit, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>{limit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Viewing all experiments
  return (
    <div className="py-8 sm:py-12 space-y-10">
      <div className="space-y-3 max-w-2xl">
        <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
          <FlaskConical className="w-3.5 h-3.5" />
          <span>UNDERHOOD ENGINEERING LABORATORY</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc]">
          Experiments
        </h1>
        <p className="text-sm sm:text-base text-[#78716c] dark:text-[#8b949e] leading-relaxed">
          Reproducible empirical investigations into queue dynamics, socket backlogs, stream multiplexing saturation, and cache stampede mitigations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {EXPERIMENTS.map((exp) => (
          <article
            key={exp.slug}
            onClick={() => onNavigate({ view: 'experiments', slug: exp.slug })}
            className="p-6 sm:p-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#ffffff] dark:bg-[#161b22] hover:border-sky-500/50 cursor-pointer transition-all space-y-4 shadow-2xs group"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider text-[11px]">
                {exp.topic.replace(/-/g, ' ')}
              </span>
              <span className="text-[#a8a29e] dark:text-[#6e7681] font-mono">
                Lab Run: {exp.date}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-[#1c1917] dark:text-[#f0f6fc] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              {exp.title}
            </h2>

            <p className="text-sm text-[#78716c] dark:text-[#8b949e] leading-relaxed max-w-3xl">
              {exp.tagline}
            </p>

            <div className="p-4 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d] text-xs font-mono text-[#44403c] dark:text-[#c9d1d9] space-y-1">
              <div className="text-[11px] text-[#78716c] dark:text-[#8b949e]">
                Hypothesis:
              </div>
              <p className="line-clamp-2 leading-relaxed">{exp.hypothesis}</p>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs font-semibold text-sky-600 dark:text-sky-400">
              <span className="inline-flex items-center gap-1.5">
                Launch interactive simulation <ArrowRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs text-[#a8a29e] dark:text-[#6e7681] font-normal">
                {exp.keyFindings.length} verified findings
              </span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
