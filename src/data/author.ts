import { AuthorProfile } from '../types';

export const AUTHOR: AuthorProfile = {
  name: 'Huy Hoang',
  handle: 'huyhoang1001',
  role: 'Software Engineer & Systems Researcher',
  affiliation: 'Underhood',
  bio: 'Exploring how software systems actually work beneath their abstractions. Focused on distributed systems, runtime internals, Linux primitives, and reproducible engineering experiments.',
  editorialPhilosophy:
    'Software architecture is rarely about finding a mythical optimal solution; it is about choosing which trade-offs and failure modes you understand and are prepared to operate. Underhood aims to dissect real engineering internals beyond marketing abstractions and conventional dogmas.',
  principles: [
    {
      title: 'Mechanical Sympathy Over Abstraction',
      description:
        'Software cannot be completely insulated from hardware and OS reality. Memory bandwidth, cache lines, kernel context switching, and network round-trip physics always assert themselves under pressure.'
    },
    {
      title: 'Backpressure Is Not an Overload Policy',
      description:
        'Every unbounded buffer is an outage waiting to happen. Systems must push back at the ingress, shed non-critical work intentionally, and fail predictably rather than exhaust resources silently.'
    },
    {
      title: 'Measure Tails, Not Averages',
      description:
        'Mean latency is a statistical illusion in multi-tenant systems. The p99, p99.9, and maximum latencies dictate user experience and trigger cascading retry storms.'
    },
    {
      title: 'Reproducibility as a First Principle',
      description:
        'Intuition and conventional wisdom fail in complex software systems. Claims about performance, concurrency, and resiliency must be backed by reproducible test harnesses, benchmarks, and verifiable traces.'
    }
  ],
  selectedProjects: [
    {
      title: 'Underhood Engineering Publication',
      role: 'Author & Maintainer',
      description: 'Git-backed, reproducible engineering publication and experiment platform investigating software internals, runtime concurrency, and distributed systems.',
      technologies: ['TypeScript', 'Node.js', 'MDX', 'Tailwind CSS', 'Vite'],
      link: 'https://github.com/huyhoang1001/underhood'
    },
    {
      title: 'Node.js Concurrency Lab',
      role: 'Author',
      description: 'Reproducible test harnesses evaluating the libuv threadpool, event loop blocking phases, Promise.all concurrency, and OS worker threads.',
      technologies: ['Node.js', 'libuv', 'v8', 'Linux perf'],
      link: 'https://github.com/huyhoang1001/underhood'
    }
  ],
  links: {
    github: 'https://github.com/huyhoang1001/underhood',
    twitter: 'https://x.com',
    email: 'contact@underhood.engineering',
    rss: '/rss.xml'
  }
};
