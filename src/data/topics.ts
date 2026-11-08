import { Topic, TopicId } from '../types';

export const TOPICS: Record<TopicId, Topic> = {
  'distributed-systems': {
    id: 'distributed-systems',
    name: 'Distributed Systems',
    tagline: 'Consensus, coordination, fault tolerance, and network boundaries.',
    description: 'Analyzing state machines under partition, split-brain realities, vector clocks, raft/paxos implementations, and asynchronous message delivery boundaries.'
  },
  'backend-engineering': {
    id: 'backend-engineering',
    name: 'Backend Engineering',
    tagline: 'High-throughput servers, protocol internals, and storage engines.',
    description: 'Deep dives into socket programming, HTTP/2 and gRPC transport, thread pool topologies, database connection pool exhaustion, and memory management.'
  },
  'performance': {
    id: 'performance',
    name: 'Performance',
    tagline: 'Tail latency, zero-copy I/O, cache hierarchies, and profiling.',
    description: 'Investigating p99 and p99.9 outliers, mechanical sympathy, CPU cache line false sharing, GC pauses, kernel bypass, and memory footprint optimization.'
  },
  'system-design': {
    id: 'system-design',
    name: 'System Design',
    tagline: 'Trade-offs, durability boundaries, and architectural topologies.',
    description: 'Evaluating real-world architectures: event sourcing vs CDC, CQRS bottlenecks, partition keys, tiered storage, and rate-limiting at scale.'
  },
  'cloud-infrastructure': {
    id: 'cloud-infrastructure',
    name: 'Cloud & Infrastructure',
    tagline: 'Container orchestrators, egress topologies, and resilience engineering.',
    description: 'Observability pipelines, service meshes, eBPF packet routing, multi-region failover, cost-efficiency, and bare-metal realities beneath the cloud.'
  },
  'engineering-experiments': {
    id: 'engineering-experiments',
    name: 'Engineering Experiments',
    tagline: 'Hypothesis-driven benchmarks, chaos injections, and lab telemetry.',
    description: 'Controlled laboratory setups testing queuing models, protocol head-of-line blocking, cache stampede mitigations, and drop-tail boundaries.'
  },
  'lessons-learned': {
    id: 'lessons-learned',
    name: 'Lessons Learned',
    tagline: 'Post-mortems, subtle production bugs, and architectural revisions.',
    description: 'Candid breakdowns of multi-hour outages, cascading retry storms, database lock escalations, and counter-intuitive production behaviors.'
  }
};

export const TOPIC_LIST: Topic[] = Object.values(TOPICS);
