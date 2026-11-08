import { AuthorProfile } from '../types';

export const AUTHOR: AuthorProfile = {
  name: 'Alex Vance',
  handle: 'avance',
  role: 'Principal Distributed Systems Engineer',
  affiliation: 'Underhood Research & Infrastructure',
  bio: 'Specializing in large-scale distributed consensus, high-throughput RPC subsystems, and storage engine internals. Focused on what breaks when capacity meets sudden load.',
  editorialPhilosophy:
    'Software architecture is rarely about finding the optimal solution; it is about choosing which failure mode you are willing to debug at 3:00 AM. Underhood aims to dissect real engineering internals beyond marketing abstractions.',
  principles: [
    {
      title: 'Mechanical Sympathy Over Abstraction',
      description:
        'Software cannot be insulated from hardware reality. Memory bandwidth, cache lines, kernel context switching, and network round-trip physics always assert themselves under pressure.'
    },
    {
      title: 'Backpressure Is Not a Luxury',
      description:
        'Every unbounded buffer is an outage waiting to happen. Systems must push back at the ingress, shed non-critical work intentionally, and fail predictably rather than exhaust resources silently.'
    },
    {
      title: 'Measure Tails, Not Averages',
      description:
        'Mean latency is a statistical illusion in multi-tenant distributed systems. The p99, p99.9, and maximum latencies dictate user experience and trigger cascading retry storms.'
    },
    {
      title: 'Reproducibility as a First Principle',
      description:
        'Anecdotes and intuition fail in complex distributed systems. Claims about performance and resiliency must be backed by reproducible test harnesses, chaos verification, and verifiable traces.'
    }
  ],
  selectedProjects: [
    {
      title: 'Chronos Distributed Consensus',
      role: 'Lead Architect',
      description: 'A Raft-derivative consensus engine optimized for low write amplification on NVMe storage with pipelined append logs.',
      technologies: ['Rust', 'io_uring', 'gRPC', 'RocksDB'],
      link: 'https://github.com'
    },
    {
      title: 'Kestrel Flow Controller',
      role: 'Author & Maintainer',
      description: 'An adaptive client-side rate-limiter and circuit breaker using gradient descent load tracking and CoDel drop queues.',
      technologies: ['Go', 'eBPF', 'OpenTelemetry'],
      link: 'https://github.com'
    },
    {
      title: 'NetProbe Profiler',
      role: 'Contributor',
      description: 'Continuous eBPF-based TCP socket inspection tool capturing socket backlog saturation and unacknowledged flight windows.',
      technologies: ['C', 'eBPF', 'Linux Kernel'],
      link: 'https://github.com'
    }
  ],
  links: {
    github: 'https://github.com',
    twitter: 'https://x.com',
    email: 'alex@underhood.engineering',
    rss: '/rss.xml'
  }
};
