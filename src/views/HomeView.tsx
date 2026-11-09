import React from 'react';
import { ArrowRight, BookOpen, FlaskConical, Rss } from 'lucide-react';
import { getArticles, getExperiments, toArticle, toExperiment } from '../lib/content';
import { TOPIC_LIST } from '../data/topics';
import { AUTHOR } from '../data/author';
import { ViewRoute } from '../types';

interface HomeViewProps {
  onNavigate: (route: ViewRoute) => void;
  onOpenRss?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenRss }) => {
  const articles = getArticles().map(toArticle);
  const experiments = getExperiments().map(toExperiment);

  const featuredArticle = articles.find((a) => a.featured) || articles[0];
  const recentArticles = articles.filter((a) => a.slug !== featuredArticle?.slug).slice(0, 3);
  const featuredExperiment = experiments[0];

  return (
    <div className="space-y-16 sm:space-y-24 py-8 sm:py-12">
      {/* 1. Hero Section */}
      <section className="space-y-6 max-w-4xl">
        <div className="inline-flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
          <span>UNDERHOOD ENGINEERING PUBLICATION</span>
          <span>·</span>
          <span>VOL. 2026</span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc] leading-[1.15]">
          Engineering beyond the surface.
        </h1>

        <p className="text-base sm:text-lg text-[#78716c] dark:text-[#8b949e] leading-relaxed max-w-2xl">
          Deep investigations into distributed systems, runtime internals, tail latency, and what happens when software meets sudden pressure.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            onClick={() => onNavigate({ view: 'writing' })}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors shadow-xs"
          >
            <BookOpen className="w-4 h-4" />
            <span>Explore Writing</span>
          </button>
          <button
            onClick={() => onNavigate({ view: 'experiments' })}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-[#1c1917] dark:text-[#f0f6fc] bg-[#f2ede4] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d] hover:border-slate-400 dark:hover:border-slate-600 rounded-md transition-colors"
          >
            <FlaskConical className="w-4 h-4 text-sky-500" />
            <span>Engineering Lab</span>
          </button>
          {onOpenRss && (
            <button
              onClick={onOpenRss}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc] transition-colors"
            >
              <Rss className="w-4 h-4 text-amber-500" />
              <span>RSS Feed</span>
            </button>
          )}
        </div>
      </section>

      {/* 2. Featured Lead Article OR Empty Editorial Notice */}
      {featuredArticle ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#e7e3da] dark:border-[#30363d]">
            <h2 className="text-xs uppercase tracking-widest font-mono text-[#78716c] dark:text-[#8b949e]">
              Featured Investigation
            </h2>
            <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
              {featuredArticle.draft && (
                <span className="text-amber-700 dark:text-amber-400 font-semibold">[Local Review Draft]</span>
              )}
              <span>Deep Dive</span>
            </div>
          </div>

          <article
            onClick={() => onNavigate({ view: 'article', slug: featuredArticle.slug })}
            className="group p-6 sm:p-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#ffffff] dark:bg-[#161b22] hover:border-sky-500/50 dark:hover:border-sky-500/50 transition-all cursor-pointer shadow-xs space-y-4"
          >
            {/* Zero-pill unboxed metadata */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#78716c] dark:text-[#8b949e]">
              <span className="font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider text-[11px]">
                {featuredArticle.topic.replace(/-/g, ' ')}
              </span>
              <span>·</span>
              <span>{featuredArticle.date}</span>
              <span>·</span>
              <span>{featuredArticle.readingTime}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-[#1c1917] dark:text-[#f0f6fc] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors leading-snug">
              {featuredArticle.title}
            </h3>

            <p className="text-sm sm:text-base text-[#78716c] dark:text-[#8b949e] leading-relaxed max-w-3xl">
              {featuredArticle.description}
            </p>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs text-[#a8a29e] dark:text-[#6e7681]">
                {featuredArticle.tags.map((tag, idx) => (
                  <React.Fragment key={tag}>
                    {idx > 0 && <span>·</span>}
                    <span>#{tag}</span>
                  </React.Fragment>
                ))}
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 group-hover:translate-x-1 transition-transform">
                Read Essay <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </article>
        </section>
      ) : (
        <section className="p-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-xs uppercase tracking-widest font-mono text-sky-600 dark:text-sky-400 font-semibold">
              Editorial Status
            </div>
            <span className="text-xs font-mono text-[#78716c] dark:text-[#8b949e]">Peer Verification</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-[#1c1917] dark:text-[#f0f6fc]">
            Upcoming Publications in Peer Review
          </h3>
          <p className="text-sm text-[#78716c] dark:text-[#8b949e] leading-relaxed max-w-3xl">
            Underhood&apos;s initial series of empirical investigations into runtime concurrency, event loop mechanics, and distributed systems resilience are currently undergoing reproducibility checks across independent Linux environments.
          </p>
          <div className="text-xs text-[#78716c] dark:text-[#8b949e] pt-1">
            Subscribe to the RSS feed to receive new essays as soon as reproduction tests pass.
          </div>
        </section>
      )}

      {/* 3. Latest Writing & Engineering Laboratory Spotlight */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Recent Articles */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-[#e7e3da] dark:border-[#30363d]">
            <h2 className="text-xs uppercase tracking-widest font-mono text-[#78716c] dark:text-[#8b949e]">
              Latest Writing
            </h2>
            <button
              onClick={() => onNavigate({ view: 'writing' })}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
            >
              View all ({articles.length})
            </button>
          </div>

          {recentArticles.length === 0 ? (
            <div className="p-6 rounded-lg border border-dashed border-[#e7e3da] dark:border-[#30363d] text-center text-xs text-[#78716c] dark:text-[#8b949e]">
              {articles.length === 0
                ? 'No essays currently published in production.'
                : 'All current essays are shown in the featured section above.'}
            </div>
          ) : (
            <div className="divide-y divide-[#e7e3da] dark:divide-[#30363d]">
              {recentArticles.map((article) => (
                <article
                  key={article.slug}
                  onClick={() => onNavigate({ view: 'article', slug: article.slug })}
                  className="group py-5 first:pt-0 cursor-pointer space-y-2"
                >
                  <div className="flex items-center gap-2 text-xs text-[#78716c] dark:text-[#8b949e]">
                    <span className="capitalize">{article.topic.replace(/-/g, ' ')}</span>
                    <span>·</span>
                    <span>{article.date}</span>
                    <span>·</span>
                    <span>{article.readingTime}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#1c1917] dark:text-[#f0f6fc] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#78716c] dark:text-[#8b949e] line-clamp-2 leading-relaxed">
                    {article.description}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Engineering Lab Showcase */}
        <div className="lg:col-span-5 space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-[#e7e3da] dark:border-[#30363d]">
            <h2 className="text-xs uppercase tracking-widest font-mono text-[#78716c] dark:text-[#8b949e]">
              Engineering Lab
            </h2>
            <button
              onClick={() => onNavigate({ view: 'experiments' })}
              className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
            >
              All Labs ({experiments.length})
            </button>
          </div>

          {featuredExperiment ? (
            <div
              onClick={() => onNavigate({ view: 'experiments', slug: featuredExperiment.slug })}
              className="p-5 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] hover:border-sky-500/50 transition-colors cursor-pointer space-y-3"
            >
              <div className="flex items-center gap-2 text-xs font-mono text-sky-600 dark:text-sky-400">
                <FlaskConical className="w-3.5 h-3.5" />
                <span>Reproducible Investigation</span>
              </div>

              <h3 className="text-base font-bold text-[#1c1917] dark:text-[#f0f6fc]">
                {featuredExperiment.title}
              </h3>

              <p className="text-xs text-[#78716c] dark:text-[#8b949e] leading-relaxed">
                {featuredExperiment.tagline}
              </p>

              <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d] text-xs font-mono space-y-1">
                <div className="text-[11px] text-[#78716c] dark:text-[#8b949e]">
                  Key Hypothesis:
                </div>
                <p className="text-[#1c1917] dark:text-[#f0f6fc] text-xs line-clamp-2">
                  {featuredExperiment.hypothesis}
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 pt-1">
                Launch Interactive Simulation <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-dashed border-[#e7e3da] dark:border-[#30363d] text-center text-xs text-[#78716c] dark:text-[#8b949e]">
              No active lab simulations published.
            </div>
          )}
        </div>
      </section>

      {/* 4. Topic Gateway Tracks */}
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-2 border-b border-[#e7e3da] dark:border-[#30363d]">
          <h2 className="text-xs uppercase tracking-widest font-mono text-[#78716c] dark:text-[#8b949e]">
            Topic Exploration
          </h2>
          <button
            onClick={() => onNavigate({ view: 'topics' })}
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
          >
            Explore taxonomy
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOPIC_LIST.slice(0, 6).map((topic) => {
            const count = articles.filter((a) => a.topic === topic.id).length;
            return (
              <div
                key={topic.id}
                onClick={() => onNavigate({ view: 'topics', topicId: topic.id })}
                className="p-5 rounded-lg border border-[#e7e3da] dark:border-[#30363d] bg-[#ffffff] dark:bg-[#161b22] hover:border-slate-400 dark:hover:border-slate-600 transition-colors cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-sm text-[#1c1917] dark:text-[#f0f6fc]">
                    {topic.name}
                  </span>
                  <span className="font-mono text-[#a8a29e] dark:text-[#6e7681]">
                    {count} {count === 1 ? 'article' : 'articles'}
                  </span>
                </div>
                <p className="text-xs text-[#78716c] dark:text-[#8b949e] line-clamp-2 leading-relaxed">
                  {topic.tagline}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Author Statement & Editorial Philosophy */}
      <section className="p-6 sm:p-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee]/70 dark:bg-[#161b22]/70 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#e7e3da] dark:border-[#30363d]">
          <div className="text-xs uppercase tracking-widest font-mono text-[#78716c] dark:text-[#8b949e]">
            Editorial Tenet
          </div>
          <button
            onClick={() => onNavigate({ view: 'about' })}
            className="text-xs text-sky-600 dark:text-sky-400 hover:underline"
          >
            Author profile →
          </button>
        </div>

        <blockquote className="text-base sm:text-lg font-serif italic text-[#1c1917] dark:text-[#f0f6fc] leading-relaxed max-w-3xl">
          &ldquo;{AUTHOR.editorialPhilosophy}&rdquo;
        </blockquote>

        <div className="flex items-center gap-3 pt-2 text-xs text-[#78716c] dark:text-[#8b949e]">
          <span className="font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
            {AUTHOR.name}
          </span>
          <span>·</span>
          <span>{AUTHOR.role}</span>
          <span>·</span>
          <span>{AUTHOR.affiliation}</span>
        </div>
      </section>
    </div>
  );
};
