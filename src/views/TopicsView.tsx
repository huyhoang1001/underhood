import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { TOPIC_LIST, TOPICS } from '../data/topics';
import { getArticles, getExperiments, toArticle, toExperiment } from '../lib/content';
import { ViewRoute, TopicId } from '../types';

interface TopicsViewProps {
  activeTopicId?: TopicId;
  onNavigate: (route: ViewRoute) => void;
}

export const TopicsView: React.FC<TopicsViewProps> = ({
  activeTopicId,
  onNavigate
}) => {
  const allArticles = getArticles().map(toArticle);
  const allExperiments = getExperiments().map(toExperiment);

  // If viewing a specific topic
  if (activeTopicId && TOPICS[activeTopicId]) {
    const topic = TOPICS[activeTopicId];
    const topicArticles = allArticles.filter((a) => a.topic === activeTopicId);
    const topicExperiments = allExperiments.filter((e) => e.topic === activeTopicId);

    return (
      <div className="py-8 sm:py-12 space-y-10">
        <button
          onClick={() => onNavigate({ view: 'topics' })}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All topics directory</span>
        </button>

        <header className="space-y-3 max-w-3xl pb-8 border-b border-[#e7e3da] dark:border-[#30363d]">
          <div className="text-xs font-mono uppercase tracking-widest text-sky-600 dark:text-sky-400">
            Domain Focus
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc]">
            {topic.name}
          </h1>
          <p className="text-base text-[#78716c] dark:text-[#8b949e] leading-relaxed">
            {topic.description}
          </p>
        </header>

        {/* Topic Articles */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-[#e7e3da] dark:border-[#30363d] text-xs font-mono text-[#78716c] dark:text-[#8b949e]">
            <span>Published Essays ({topicArticles.length})</span>
          </div>

          {topicArticles.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#78716c] dark:text-[#8b949e] max-w-lg mx-auto space-y-2">
              <p>No articles are currently published in this domain.</p>
              <p className="text-xs text-[#a8a29e] dark:text-[#6e7681]">
                Upcoming technical investigations and reproducible benchmarks for {topic.name} are in peer review.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#e7e3da] dark:divide-[#30363d]">
              {topicArticles.map((article) => (
                <article
                  key={article.slug}
                  onClick={() => onNavigate({ view: 'article', slug: article.slug })}
                  className="group py-6 first:pt-0 cursor-pointer space-y-2"
                >
                  <div className="flex items-center gap-2 text-xs text-[#78716c] dark:text-[#8b949e]">
                    <span>{article.date}</span>
                    <span>·</span>
                    <span>{article.readingTime}</span>
                    {article.draft && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-amber-700 dark:text-amber-400 font-semibold text-[11px] uppercase tracking-wider">
                          [Draft]
                        </span>
                      </>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-[#1c1917] dark:text-[#f0f6fc] group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-[#78716c] dark:text-[#8b949e] leading-relaxed line-clamp-2">
                    {article.description}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* Associated Experiments */}
        {topicExperiments.length > 0 && (
          <div className="space-y-4 pt-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#e7e3da] dark:border-[#30363d] text-xs font-mono text-[#78716c] dark:text-[#8b949e]">
              <span>Associated Laboratory Experiments</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {topicExperiments.map((exp) => (
                <div
                  key={exp.slug}
                  onClick={() => onNavigate({ view: 'experiments', slug: exp.slug })}
                  className="p-5 rounded-lg border border-[#e7e3da] dark:border-[#30363d] bg-[#ffffff] dark:bg-[#161b22] hover:border-sky-500/50 cursor-pointer space-y-2 transition-colors"
                >
                  <h4 className="text-sm font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
                    {exp.title}
                  </h4>
                  <p className="text-xs text-[#78716c] dark:text-[#8b949e] line-clamp-2 leading-relaxed">
                    {exp.tagline}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 dark:text-sky-400 pt-1">
                    Launch simulation <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Viewing all topics
  return (
    <div className="py-8 sm:py-12 space-y-10">
      <div className="space-y-3 max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc]">
          Topics
        </h1>
        <p className="text-sm sm:text-base text-[#78716c] dark:text-[#8b949e] leading-relaxed">
          Content organized by core engineering disciplines. Each domain curates foundational theoretical concepts, practical failure modes, and reproducible benchmarks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TOPIC_LIST.map((topic) => {
          const articles = allArticles.filter((a) => a.topic === topic.id);
          const experiments = allExperiments.filter((e) => e.topic === topic.id);
          return (
            <div
              key={topic.id}
              onClick={() => onNavigate({ view: 'topics', topicId: topic.id })}
              className="p-6 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#ffffff] dark:bg-[#161b22] hover:border-sky-500/50 cursor-pointer transition-all space-y-4 shadow-2xs flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider text-[11px]">
                    Domain
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#a8a29e] dark:text-[#6e7681]">
                    <span>{articles.length} {articles.length === 1 ? 'essay' : 'essays'}</span>
                    {experiments.length > 0 && (
                      <>
                        <span>·</span>
                        <span>{experiments.length} lab</span>
                      </>
                    )}
                  </div>
                </div>

                <h2 className="text-xl font-bold text-[#1c1917] dark:text-[#f0f6fc]">
                  {topic.name}
                </h2>

                <p className="text-xs sm:text-sm text-[#78716c] dark:text-[#8b949e] leading-relaxed">
                  {topic.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#e7e3da] dark:border-[#30363d] flex items-center justify-between text-xs text-sky-600 dark:text-sky-400 font-semibold">
                <span>Explore domain archive</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
