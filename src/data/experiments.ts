import { Experiment } from '../types';

export const EXPERIMENTS: Experiment[] = [
  {
    slug: 'bounded-queue-vs-drop-tail',
    title: 'Bounded Queue vs. Drop-Tail Under Sudden Traffic Surges',
    tagline: 'Empirical comparison of FIFO drop-tail, LIFO drop-head, and CoDel delay control under 3x synthetic ingress spikes.',
    date: '2026-10-18',
    topic: 'engineering-experiments',
    hypothesis:
      'Under sudden ingress spikes where arrival rate exceeds worker service capacity by 200%, a LIFO drop-head queue preserves client deadline validity and maintains sub-20ms p99 latency for accepted requests, whereas traditional FIFO drop-tail causes 100% deadline expiration due to bufferbloat.',
    setup:
      'A dedicated 8-core c6i.2xlarge AWS EC2 instance running a custom Go test harness. Ingress generator simulated a burst from 5,000 rps to 15,000 rps with a Poisson arrival distribution. Worker service capacity was capped at 5,000 rps with a fixed processing delay of 1.2ms per item. Client timeouts were set to 150ms.',
    implementation:
      'We implemented three queue topologies in Go using lock-free ring buffers: (1) Unbounded linked queue, (2) Bounded FIFO with tail-dropping, (3) Bounded LIFO with head eviction, and (4) CoDel (Controlled Delay) tracking minimum sojourn time over a 100ms interval.',
    keyFindings: [
      'FIFO Drop-Tail suffered 89.4% client deadline timeouts because newly arriving requests waited behind stale expired work.',
      'LIFO Drop-Head achieved 99.2% deadline compliance on all admitted requests, keeping p99 latency under 16.4ms.',
      'CoDel achieved optimal throughput recovery within 42ms after the ingress surge ceased, compared to 1,840ms for FIFO drop-tail.',
      'Unbounded queues triggered Go runtime heap spikes of +1.4GB, tripling GC pause durations.'
    ],
    limitations: [
      'Tested with homogeneous request workloads; heterogeneous processing times may alter head-of-line eviction dynamics.',
      'Memory allocation in test harness was isolated from network socket buffer effects.',
      'Single-node memory ring buffer; distributed queue partitions were not evaluated in this specific run.'
    ],
    githubRepo: 'https://github.com/underhood/bounded-queue-lab',
    relatedArticleSlug: 'what-happens-when-a-queue-grows-without-bounds',
    interactiveType: 'queue-backpressure'
  },
  {
    slug: 'grpc-multiplexing-saturation',
    title: 'HTTP/2 Stream Multiplexing Saturation Across WAN RTTs',
    tagline: 'Measuring throughput collapse and unary RPC latency degradation when multiplexing streaming payloads across varying network round trips.',
    date: '2026-09-28',
    topic: 'backend-engineering',
    hypothesis:
      'Multiplexing bulk byte streams and low-latency unary RPCs across a single TCP connection will cause unary RPC latency to degrade non-linearly when WAN RTT exceeds 25ms, even when total bandwidth is well below line capacity.',
    setup:
      'Two Linux instances running kernel 6.5 interconnected via NetEm with configurable latency (1ms to 80ms) and simulated packet loss (0% to 2%). gRPC Go 1.62 client transmitting 100 unary calls/sec alongside a concurrent 25MB/s bidirectional streaming RPC.',
    implementation:
      'Monitored client HTTP/2 window updates via eBPF kprobes attached to tcp_recvmsg and HTTP/2 frame parsers. Varied default stream window size (64KB vs 1MB vs 4MB) and connection window size.',
    keyFindings: [
      'At 40ms RTT with default 64KB windows, bulk streaming was throttled to 12.8 Mbps due to window update round-trip stalls.',
      'When packet loss was 0.5%, TCP head-of-line blocking inflated unary RPC p99 latency from 4.1ms to 287ms.',
      'Separating streaming and unary traffic into two independent TCP connections restored unary p99 latency to 4.3ms under identical loss.'
    ],
    limitations: [
      'eBPF overhead added approximately 1.5 microseconds per socket event.',
      'Evaluated HTTP/2 only; HTTP/3 (QUIC) results are being prepared for a subsequent experiment.'
    ],
    githubRepo: 'https://github.com/underhood/grpc-window-benchmarks',
    relatedArticleSlug: 'understanding-grpc-flow-control',
    interactiveType: 'grpc-multiplex'
  },
  {
    slug: 'cache-stampede-xfetch-evaluation',
    title: 'Cache Stampede Mitigation: XFetch vs. Mutex Locking',
    tagline: 'Evaluating probabilistic early expiration (XFetch algorithm) against single-flight mutex locking under 20,000 concurrent cache misses.',
    date: '2026-08-14',
    topic: 'performance',
    hypothesis:
      'Probabilistic early recomputation (XFetch) eliminates backend database traffic spikes on hot-key expiration with near-zero latency variance compared to distributed mutex lock acquisition.',
    setup:
      'Simulated Redis key with 60s TTL requested by 10,000 virtual clients. Computation of the cached object required an expensive 85ms synthetic SQL query. Monitored total database hits and tail latency during the expiration boundary.',
    implementation:
      'Implemented XFetch probabilistic formula: recompute if -beta * delta * ln(rand()) > TTL - now. Varied beta factor between 0.5 and 2.0 and compared against standard singleflight.Group locking.',
    keyFindings: [
      'Without mitigation, cache expiration caused 4,820 simultaneous SQL queries within 100ms.',
      'Singleflight locked concurrent requests, but queued callers experienced 90ms p99 latency spikes.',
      'XFetch (beta = 1.0) recomputed the cache entry in the background 1.8 seconds prior to expiration, resulting in 0 database spikes and a flat 1.1ms p99 latency profile.'
    ],
    limitations: [
      'XFetch requires write access to the computing worker and assumes monotonic clock stability.',
      'Slightly higher total compute over time if beta is configured too aggressively (> 2.0).'
    ],
    githubRepo: 'https://github.com/underhood/cache-stampede-xfetch',
    relatedArticleSlug: 'backpressure-is-not-an-overload-policy',
    interactiveType: 'cache-invalidation'
  },
  {
    slug: 'nodejs-threadpool-saturation',
    title: 'Node.js libuv Thread Pool Saturation & Event Loop Delay',
    tagline: 'Empirical benchmark of crypto.pbkdf2 worker saturation, UV_THREADPOOL_SIZE scaling, and Event Loop delay during synchronous CPU execution.',
    date: '2026-11-08',
    topic: 'backend-engineering',
    hypothesis:
      'Under default configuration (UV_THREADPOOL_SIZE=4), submitting 8 asynchronous PBKDF2 operations executes in two distinct waves of ~250ms each with total completion time doubling to ~560ms due to libuv thread pool queueing. Increasing UV_THREADPOOL_SIZE to 8 admits all jobs concurrently but encounters CPU core contention.',
    setup:
      'Node.js v22 on Linux x86_64 running reproducible test harness scripts under experiments/node-concurrency/. Jobs measured with high-resolution performance.now() and perf_hooks.monitorEventLoopDelay().',
    implementation:
      'Evaluated crypto.pbkdf2 across pool sizes 4 and 8, HTTP server event loop delay under synchronous blocking loop, socket concurrency vs Promise.all CPU callbacks, and node:worker_threads offloading.',
    keyFindings: [
      'With UV_THREADPOOL_SIZE=4, 4 PBKDF2 jobs completed in 269.9ms. Submitting 8 jobs executed in two 4-job waves, completing in 563.6ms.',
      'Increasing UV_THREADPOOL_SIZE to 8 allowed all 8 jobs to execute immediately, finishing in 577.5ms due to CPU core time-slicing.',
      'A synchronous CPU task blocked the Event Loop for 578.29ms, causing unrelated /ping requests to wait 579ms.',
      '10 concurrent asynchronous TCP socket operations overlapped via the OS kernel in 79.9ms total without consuming thread pool threads.',
      'Promise.all() executing 4 x 60ms CPU tasks ran strictly sequentially on the main thread in 241.1ms total.',
      'Offloading CPU execution to node:worker_threads allowed the main thread to execute 94 heartbeat ticks with a max lag of only 0.055ms.'
    ],
    limitations: [
      'Exact millisecond numbers vary based on host CPU core availability and frequency scaling.',
      'PBKDF2 is CPU-intensive native C++; disk I/O libuv workers exhibit different wait characteristics due to storage controller latency.'
    ],
    githubRepo: 'https://github.com/huyhoang1001/underhood/tree/main/experiments/node-concurrency',
    relatedArticleSlug: 'node-js-is-single-threaded-who-is-doing-the-work',
    interactiveType: 'node-threadpool'
  }
];
