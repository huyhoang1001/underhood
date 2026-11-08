export type TopicId =
  | 'distributed-systems'
  | 'backend-engineering'
  | 'performance'
  | 'system-design'
  | 'cloud-infrastructure'
  | 'engineering-experiments'
  | 'lessons-learned';

export interface Topic {
  id: TopicId;
  name: string;
  tagline: string;
  description: string;
  articleCount?: number;
}

export interface TocItem {
  id: string;
  title: string;
  level: number;
}

export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  topic: TopicId;
  tags: string[];
  featured?: boolean;
  draft?: boolean;
  status?: 'draft' | 'published';
  githubUrl?: string;
  content: string;
  toc: TocItem[];
  relatedSlugs: string[];
}

export interface Experiment {
  slug: string;
  title: string;
  tagline: string;
  date: string;
  status?: 'draft' | 'published';
  topic: TopicId;
  hypothesis: string;
  setup: string;
  implementation: string;
  keyFindings: string[];
  limitations: string[];
  githubRepo: string;
  relatedArticleSlug?: string;
  interactiveType?: 'queue-backpressure' | 'grpc-multiplex' | 'cache-invalidation' | 'node-threadpool';
}

export interface AuthorProfile {
  name: string;
  handle: string;
  role: string;
  affiliation: string;
  bio: string;
  editorialPhilosophy: string;
  principles: {
    title: string;
    description: string;
  }[];
  selectedProjects: {
    title: string;
    role: string;
    description: string;
    technologies: string[];
    link?: string;
  }[];
  links: {
    github: string;
    twitter: string;
    email: string;
    rss: string;
  };
}

export type ViewRoute =
  | { view: 'home' }
  | { view: 'writing'; tag?: string; topic?: TopicId }
  | { view: 'article'; slug: string }
  | { view: 'topics'; topicId?: TopicId }
  | { view: 'experiments'; slug?: string }
  | { view: 'about' }
  | { view: 'not-found'; path?: string };
