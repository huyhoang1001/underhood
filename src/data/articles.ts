import { Article } from '../types';
import { calculateReadingTime } from '../utils/readingTime';

const RAW_ARTICLES: Omit<Article, 'readingTime'>[] = [
  {
    slug: 'backpressure-is-not-an-overload-policy',
    title: 'Backpressure Is Not an Overload Policy',
    description: 'What happens when service capacity runs out? Why propagating backpressure up the stack often causes catastrophic deadlocks instead of graceful degradation.',
    date: '2026-11-08',
    topic: 'distributed-systems',
    tags: ['distributed-systems', 'grpc', 'performance', 'queues', 'backpressure'],
    featured: true,
    draft: false,
    githubUrl: 'https://github.com/underhood/backpressure-harness',
    toc: [
      { id: 'the-illusion-of-pushback', title: 'The Illusion of Pushback', level: 2 },
      { id: 'tcp-vs-application-flow-control', title: 'TCP vs. Application Flow Control', level: 2 },
      { id: 'cascading-buffer-saturation', title: 'Cascading Buffer Saturation', level: 2 },
      { id: 'load-shedding-vs-backpressure', title: 'Load Shedding vs. Backpressure', level: 2 },
      { id: 'implementing-adaptive-concurrency', title: 'Implementing Adaptive Concurrency in Go', level: 2 },
      { id: 'architectural-recommendations', title: 'Architectural Recommendations', level: 2 }
    ],
    relatedSlugs: ['what-happens-when-a-queue-grows-without-bounds', 'understanding-grpc-flow-control', 'inside-a-distributed-system-failure'],
    content: `
Engineers frequently confuse **backpressure** with an **overload protection strategy**. When a downstream service slows down, the conventional wisdom is: *"Just apply backpressure. Let TCP windowing or reactive streams push the delay back to the caller."*

In single-node concurrent pipelines (like an in-memory channel in Go or an Akka stream), backpressure works well. But in a distributed mesh consisting of dozens of microservices, unbounded retries, and asynchronous workers, naive backpressure does not protect your system. 

Instead, it transforms a localized degradation into a **cluster-wide deadlock**.

---

## The Illusion of Pushback

When Service C becomes saturated, it stops reading from its TCP socket buffer. The operating system kernel marks the receive window as 0 (\`TCP ZeroWindow\`). Service B, attempting to write more RPC frames to Service C, blocks on \`write(2)\` or queues outbound buffers in user-space memory.

\`\`\`
[ Client Ingress ]
       │  (Requests continue arriving at 50,000 rps)
       ▼
 [ Service A (Gateway) ] 
       │  Holds open connection pool
       ▼
 [ Service B (Worker) ]  <── Threads block on write(2)
       │  TCP ZeroWindow Advertised
       ▼
 [ Service C (Storage Engine) ]  <── SATURATED (Lock contention)
\`\`\`

Here is the crux: **the ingress traffic does not stop just because Service C is slow.** Users on mobile devices and external webhooks continue submitting requests. Because Service B is blocked waiting for Service C, Service B’s worker threads become exhausted. Consequently, Service B stops reading from Service A. 

Within seconds, the congestion wave travels upstream all the way to your API Gateway. The entire infrastructure halts.

---

## TCP vs. Application Flow Control

TCP flow control was designed for point-to-point packet delivery across unreliable links in 1981. It has zero awareness of application boundaries, deadlocks, or request deadlines.

| Attribute | TCP Flow Control (\`TCP Window\`) | Application Load Shedding (\`CoDel / Shed\`) |
| :--- | :--- | :--- |
| **Granularity** | Byte-stream level | Request / Transaction level |
| **Deadline Awareness** | None (packets buffered indefinitely) | Drops requests whose deadline has passed |
| **Resource Cost** | Kernel socket memory (\`SO_RCVBUF\`) | Rejects immediately with HTTP 429 / 503 |
| **Failure Mode** | Thread starvation, head-of-line blocking | Predictable p99 latency for accepted traffic |
| **Recovery Time** | Slow (requires draining saturated queues) | Instantaneous once ingress burst recedes |

When you rely exclusively on transport-layer backpressure, you pay the cost of **Bufferbloat**. Packets sit inside OS buffers for 4,000 milliseconds. Meanwhile, the client timed out after 1,000 milliseconds and sent a retry. Your servers are now burning 100% CPU processing requests that the client has already abandoned.

---

## Cascading Buffer Saturation

Let's examine what happens inside an asynchronous runtime when backpressure isn't paired with hard timeouts. Below is a simplified Go snippet demonstrating how unbounded channel backpressure consumes heap until an OOM panic occurs:

\`\`\`go
// ANTI-PATTERN: Unbounded worker pool relying on channel blocking
type RequestHandler struct {
    inboundChan chan Request
}

func (h *RequestHandler) Submit(req Request) {
    // If inboundChan is full, this goroutine blocks.
    // If thousands of HTTP handlers block here, runtime scheduler
    // allocates hundreds of thousands of goroutine stacks.
    h.inboundChan <- req 
}
\`\`\`

If each goroutine stack starts at 2KB–8KB, having 150,000 blocked requests allocates over 1.2 GB of raw stack memory alone, triggering garbage collector thrashing and catastrophic CPU starvation.

---

## Load Shedding vs. Backpressure

The only true overload policy is **deliberate, aggressive load shedding**. When capacity is exhausted, the service must drop or reject excess requests immediately at the front door with negligible compute overhead.

> **The First Law of Overload Engineering:**  
> A degraded response served in 1ms is infinitely better than a successful response served in 15 seconds. If you cannot process a request before its deadline, rejecting it at t=0 saves 100% of the downstream work.

There are three primary mechanisms for load shedding:
1. **LIFO Queues under Overload:** When queues back up, drop or process requests in Last-In, First-Out order. The newest requests are most likely to still have valid client deadlines.
2. **CoDel (Controlled Delay):** Track the minimum time requests sit in queue. If the queue delay exceeds 15ms for more than 100ms, shed incoming traffic.
3. **Adaptive Concurrency Limits:** Measure latency gradients (e.g., Netflix's Vegas or gradient algorithms) to calculate in-flight request capacity dynamically without hardcoded limits.

---

## Implementing Adaptive Concurrency in Go

Below is a production-grade implementation of an adaptive concurrency limiter inspired by TCP Vegas and Little's Law:

\`\`\`go
package limiter

import (
    "sync"
    "sync/atomic"
    "time"
)

type VegasLimiter struct {
    mu             sync.Mutex
    currentLimit   int64
    inFlight       int64
    rttMin         time.Duration
    sampleRTT      time.Duration
    alpha          float64 // Min queue threshold
    beta           float64 // Max queue threshold
}

func NewVegasLimiter(initialLimit int64) *VegasLimiter {
    return &VegasLimiter{
        currentLimit: initialLimit,
        alpha:        3.0,
        beta:         6.0,
    }
}

// TryAcquire attempts to enter the critical section.
// Rejects immediately (O(1)) if limit is reached.
func (v *VegasLimiter) TryAcquire() bool {
    inFlight := atomic.AddInt64(&v.inFlight, 1)
    limit := atomic.LoadInt64(&v.currentLimit)
    if inFlight > limit {
        atomic.AddInt64(&v.inFlight, -1)
        return false // Load shed! Return HTTP 429 / gRPC ResourceExhausted
    }
    return true
}

func (v *VegasLimiter) Release(duration time.Duration) {
    atomic.AddInt64(&v.inFlight, -1)
    
    v.mu.Lock()
    defer v.mu.Unlock()

    if v.rttMin == 0 || duration < v.rttMin {
        v.rttMin = duration
    }

    // Adjust limit dynamically based on queue gradient
    expected := float64(v.currentLimit) * (float64(v.rttMin) / float64(duration))
    queue := float64(v.currentLimit) - expected

    if queue < v.alpha {
        v.currentLimit++
    } else if queue > v.beta && v.currentLimit > 2 {
        v.currentLimit--
    }
}
\`\`\`

---

## Architectural Recommendations

1. **Never use unbounded buffers** anywhere in your network path or memory queues.
2. **Propagate client deadlines (gRPC headers)** across every hop: \`grpc-timeout: 250m\`. If a downstream service receives an RPC with only 5ms remaining on its deadline, abort execution immediately.
3. **Fail fast at the edge:** Return \`codes.ResourceExhausted\` before worker threads block on locked mutexes.
4. **Decouple backpressure from durability:** If background tasks must not be lost, write them to an append-only distributed log (like Kafka or Redpanda) with consumer lag alerts, rather than holding synchronous RPC connections open.
    `
  },
  {
    slug: 'understanding-grpc-flow-control',
    title: 'Understanding gRPC Flow Control: HTTP/2 Windows and Stream Starvation',
    description: 'An architectural dive into HTTP/2 connection-level vs. stream-level window updates, bufferbloat in gRPC multiplexers, and how high-bandwidth RPCs choke latency-critical unary calls.',
    date: '2026-10-24',
    topic: 'backend-engineering',
    tags: ['grpc', 'http2', 'performance', 'networking', 'backend-engineering'],
    featured: false,
    draft: false,
    githubUrl: 'https://github.com/underhood/grpc-window-benchmarks',
    toc: [
      { id: 'the-anatomy-of-http2-multiplexing', title: 'The Anatomy of HTTP/2 Multiplexing', level: 2 },
      { id: 'connection-vs-stream-windows', title: 'Connection vs. Stream Windows', level: 2 },
      { id: 'head-of-line-blocking-at-l4', title: 'Head-of-Line Blocking at Layer 4', level: 2 },
      { id: 'tuning-grpc-flow-control-parameters', title: 'Tuning gRPC Flow Control Parameters', level: 2 },
      { id: 'production-takeaways', title: 'Production Takeaways', level: 2 }
    ],
    relatedSlugs: ['backpressure-is-not-an-overload-policy', 'what-happens-when-a-queue-grows-without-bounds'],
    content: `
gRPC owes much of its efficiency to HTTP/2. By multiplexing hundreds of concurrent logical streams over a single long-lived TCP connection, it eliminates the expensive three-way handshake, TLS negotiation overhead, and socket proliferation common in HTTP/1.1 pools.

However, multiplexing introduces a subtle class of performance hazards: **stream window starvation** and **transport head-of-line blocking**.

---

## The Anatomy of HTTP/2 Multiplexing

In HTTP/2, every logical request/response pair is assigned a unique 31-bit stream identifier. Frames from different streams are interleaved across the single physical TCP byte stream.

\`\`\`
Stream 1 (Unary RPC: GetUser):      [ HEADERS ] ────────────> [ DATA ] ──> [ TRAILERS ]
Stream 3 (Streaming: ExportMetrics):  [ DATA ] ─── [ DATA ] ─── [ DATA ] ─── [ DATA ]
Stream 5 (Heartbeat: Ping):                     [ HEADERS ] ──> [ TRAILERS ]
                                         │            │            │
                                         ▼            ▼            ▼
Single TCP Socket:                  [S1:HDR][S3:DAT][S5:HDR][S1:DAT][S3:DAT]
\`\`\`

If Stream 3 is streaming a 50MB telemetry dump while Stream 1 is an urgent 120-byte authentication RPC, what prevents Stream 3 from hogging the entire socket?

The answer is **HTTP/2 Flow Control**.

---

## Connection vs. Stream Windows

HTTP/2 implements credit-based flow control independently at two distinct levels:
1. **Connection-level window:** Dictates how many bytes the peer can send across *all* active streams combined.
2. **Stream-level window:** Dictates how many bytes the peer can send on *one specific stream*.

Both client and server maintain independent credit balances. When a sender transmits a \`DATA\` frame with an $N$-byte payload, both its stream credit and connection credit decrease by $N$. Once credits reach zero, the sender must stop transmitting until it receives a \`WINDOW_UPDATE\` frame.

\`\`\`rust
// Rust pseudo-representation of HTTP/2 flow control state
struct Http2FlowController {
    connection_window: i32,
    stream_windows: HashMap<u32, i32>,
}

impl Http2FlowController {
    fn can_send(&self, stream_id: u32, bytes: i32) -> bool {
        let stream_win = self.stream_windows.get(&stream_id).copied().unwrap_or(0);
        self.connection_window >= bytes && stream_win >= bytes
    }

    fn consume_window(&mut self, stream_id: u32, bytes: i32) {
        self.connection_window -= bytes;
        if let Some(w) = self.stream_windows.get_mut(&stream_id) {
            *w -= bytes;
        }
    }
}
\`\`\`

### The Default Window Trap

The HTTP/2 specification (RFC 7540) sets the initial flow control window to **65,535 bytes (64 KB)**. In a low-latency local datacenter (RTT < 0.5ms), a 64 KB window allows reasonable throughput. 

However, in a cross-datacenter or multi-region topology where RTT is 40ms:
$$\\text{Max Throughput} = \\frac{\\text{Window Size}}{\\text{RTT}} = \\frac{65,536 \\times 8 \\text{ bits}}{0.040 \\text{ s}} \\approx 13.1 \\text{ Mbps}$$

Regardless of whether you have a 10 Gbps fiber interconnect, your streaming RPC will be hard-capped at 13.1 Mbps because the sender spends 90% of its time stalled waiting for round-trip \`WINDOW_UPDATE\` frames!

---

## Head-of-Line Blocking at Layer 4

While HTTP/2 solves HTTP/1.1 application-level head-of-line blocking, it introduces **TCP-level head-of-line blocking**.

Because all 100 gRPC streams share a single TCP sequence number space, if a single IP packet is dropped by an intermediate switch, the Linux kernel holds *all* subsequent packets in its TCP reassembly queue until the missing packet is retransmitted.

During packet loss events (even as low as 1%), latency on latency-critical unary calls spikes by 200–500ms simply because they are queued behind unrelated bulk transfers sharing the same connection.

---

## Tuning gRPC Flow Control Parameters

To mitigate stream starvation and maximize throughput without ballooning memory usage, configure your gRPC channel options carefully:

\`\`\`go
// Go gRPC Server Configuration for High-Throughput & Low Latency
server := grpc.NewServer(
    // Increase initial stream window from 64KB to 1MB
    grpc.InitialWindowSize(1024 * 1024),
    // Increase connection window to 8MB
    grpc.InitialConnWindowSize(8 * 1024 * 1024),
    // Keepalive enforcement to detect broken half-open sockets
    grpc.KeepaliveParams(keepalive.ServerParameters{
        Time:    30 * time.Second,
        Timeout: 5 * time.Second,
    }),
    // Enforce max concurrent streams per single connection
    grpc.MaxConcurrentStreams(250),
)
\`\`\`

---

## Production Takeaways

1. **Separate Bulk Streams from Unary RPCs:** Never multiplex 100MB batch export streams on the same gRPC channel used for sub-5ms user authentication or metadata lookups. Maintain isolated connection pools.
2. **Monitor Window Stalls:** Track \`grpc.client.stream.flow_control_window_available\` in Prometheus. If this value regularly drops to zero, your client processing loop is too slow or your network bandwidth-delay product is exceeding the window.
3. **Embrace HTTP/3 (QUIC) for Multi-Region:** QUIC replaces TCP with UDP and provides independent stream reassembly, eliminating cross-stream head-of-line blocking on packet loss.
    `
  },
  {
    slug: 'what-happens-when-a-queue-grows-without-bounds',
    title: 'What Happens When a Queue Grows Without Bounds?',
    description: 'The mathematics of Bufferbloat, Little’s Law, GC pressure, and memory layout failures when internal queues lack strict capacity boundaries.',
    date: '2026-09-15',
    topic: 'performance',
    tags: ['performance', 'queues', 'algorithms', 'distributed-systems', 'memory'],
    featured: false,
    draft: false,
    githubUrl: 'https://github.com/underhood/bounded-queue-lab',
    toc: [
      { id: 'the-comfort-of-infinite-buffers', title: 'The False Comfort of Infinite Buffers', level: 2 },
      { id: 'littles-law-and-queue-delay', title: 'Little’s Law and Queue Delay', level: 2 },
      { id: 'the-memory-and-gc-avalanche', title: 'The Memory and Garbage Collection Avalanche', level: 2 },
      { id: 'drop-tail-vs-codel', title: 'Drop-Tail vs. Controlled Delay (CoDel)', level: 2 },
      { id: 'benchmarking-queue-depth-under-load', title: 'Benchmarking Queue Depth Under Load', level: 2 }
    ],
    relatedSlugs: ['backpressure-is-not-an-overload-policy', 'understanding-grpc-flow-control'],
    content: `
Every software engineer has at some point written code like this:
\`\`\`java
Queue<Task> workQueue = new LinkedBlockingQueue<>(); // Default: Integer.MAX_VALUE
\`\`\`
Or in Go:
\`\`\`go
tasks := make(chan Task, 1000000) // "Plenty of room"
\`\`\`

It feels responsible. You want to ensure that when traffic surges, no client request is dropped. You tell yourself: *"The queue will absorb the spike, and the workers will catch up once the storm passes."*

In this article, we dissect the exact sequence of physical and algorithmic failures that occur when a queue grows without bounds.

---

## The False Comfort of Infinite Buffers

A queue does not create capacity; it merely **defers the decision to fail**. 

When arrival rate $\\lambda$ exceeds service rate $\\mu$, queue length $L$ does not stabilize—it grows linearly towards infinity:
$$\\frac{dL}{dt} = \\lambda - \\mu$$

If $\\lambda = 1,200 \\text{ req/sec}$ and $\\mu = 1,000 \\text{ req/sec}$, your queue accumulates **200 requests every single second**. In just five minutes, there are 60,000 requests queued up.

---

## Little’s Law and Queue Delay

The fundamental theorem of queuing theory, **Little's Law**, states:
$$L = \\lambda \\times W$$
Where $L$ is the average number of items in the system, $\\lambda$ is the arrival rate, and $W$ is the average wait time spent in the system.

Rearranging for wait time:
$$W = \\frac{L}{\\lambda}$$

If your queue contains 60,000 items and your service processes 1,000 items/sec, a newly arriving request will spend **60 seconds sitting idle in the queue** before a single CPU cycle is spent executing its business logic!

\`\`\`
Client Request -> [ Q Q Q Q Q Q Q Q Q Q Q Q Q Q Q Q ] -> Worker Execution
                     └──────── Wait: 60s ────────┘      └─ Exec: 5ms ─┘
\`\`\`

If the client's timeout is set to 2 seconds, the client gave up 58 seconds ago. The worker is literally burning electricity executing requests whose results will be thrown into the garbage upon completion.

---

## The Memory and Garbage Collection Avalanche

Long queues do not merely delay requests; they destroy the memory layout of modern runtimes:

1. **Pointer Chasing:** A linked queue (\`LinkedList\` or \`chan\`) allocates heap nodes dynamically. As the queue grows to millions of elements, these nodes fragment memory across the heap, destroying L1/L2 CPU cache prefetching.
2. **Generational Garbage Collection Promotion:** In runtimes like the JVM or Go, objects that survive multiple GC cycles are promoted to the **Old Generation** / tenured heap. Tenured objects require expensive, non-concurrent Full GC sweeps to reclaim.
3. **Mark Phase Overhead:** The garbage collector must traverse every live pointer. Scanning 500,000 queued items causes Stop-The-World (STW) pauses to escalate from 2ms to 800ms.
4. **The Death Spiral:** The longer the GC pause, the fewer requests the worker processes (reducing $\\mu$). Reduced $\\mu$ causes the queue to grow even faster, triggering more frequent GC pauses until the process runs out of memory (\`OOMKilled\`).

---

## Drop-Tail vs. Controlled Delay (CoDel)

When implementing bounded queues, how should you discard excess work?

### Strategy 1: Drop-Tail (FIFO Rejection)
When the queue reaches max capacity $C$, reject any new incoming request.
- **Problem:** When the queue is 100% full, the requests already inside have the highest wait times, while newly rejected requests were freshest. You are prioritizing the oldest, most likely expired work.

### Strategy 2: Drop-Head (LIFO Eviction)
When the queue is full, evict the item at the *head* (the oldest item) and enqueue the new one.
- **Advantage:** Preserves freshness. The system always works on requests that just arrived.

### Strategy 3: CoDel (Controlled Delay)
Instead of bounding by queue count, track **queue residence time (sojourn time)**. If the minimum delay experienced by requests in the queue exceeds 10ms over a 100ms window, the queue enters dropping mode and sheds traffic until latency recovers.

---

## Benchmarking Queue Depth Under Load

Here is a Rust benchmark comparing throughput and p99 latency between an unbounded queue and a bounded CoDel queue under a $2\\times$ overload burst:

\`\`\`rust
// Comparative metrics under 200% overload
// Unbounded Queue:
// - p50 Latency: 14,200 ms
// - p99 Latency: 48,900 ms
// - Useful Work Done: 8% (92% timed out on client)
// - Memory Usage: 3.4 GB

// Bounded CoDel Queue:
// - p50 Latency: 6.2 ms
// - p99 Latency: 18.4 ms
// - Useful Work Done: 100% of admitted requests
// - Memory Usage: 42 MB
\`\`\`

By enforcing a hard boundary on queue depth, the service stayed healthy, protected its memory footprint, and completed 100% of admitted requests within valid SLA boundaries.
    `
  },
  {
    slug: 'inside-a-distributed-system-failure',
    title: 'Inside a Distributed System Failure: Cascading Retries and Herd Geometry',
    description: 'Post-mortem reconstruction of a multi-hour outage: how a 50ms database lock escalation sparked a thundering retry storm that flattened three independent availability zones.',
    date: '2026-08-02',
    topic: 'lessons-learned',
    tags: ['lessons-learned', 'distributed-systems', 'incident-response', 'circuit-breaker', 'reliability'],
    featured: false,
    draft: false,
    githubUrl: 'https://github.com/underhood/cascading-retry-simulation',
    toc: [
      { id: 'the-spark', title: 'The Spark: A 50ms Lock Escalation', level: 2 },
      { id: 'the-amplification-factor', title: 'The Amplification Factor: Retries as a Weapon', level: 2 },
      { id: 'connection-pool-starvation', title: 'Connection Pool Starvation', level: 2 },
      { id: 'the-circuit-breaker-that-failed', title: 'The Circuit Breaker That Failed', level: 2 },
      { id: 'how-we-fixed-it-permanently', title: 'How We Fixed It Permanently', level: 2 }
    ],
    relatedSlugs: ['backpressure-is-not-an-overload-policy', 'what-happens-when-a-queue-grows-without-bounds'],
    content: `
At 14:22 UTC on a Tuesday, an innocuous database query held an exclusive row lock for 54 milliseconds instead of its typical 1.2 milliseconds.

By 14:27 UTC, all 42 microservices in the payment path had crashed. API gateways across three AWS availability zones were returning 100% HTTP 504 Gateway Timeouts. The incident lasted four hours and thirty-eight minutes.

This is the architectural post-mortem of how our own resilience mechanisms combined into an engine of self-destruction.

---

## The Spark: A 50ms Lock Escalation

The root cause was simple: a background reconciliation worker executed an \`UPDATE\` statement without an indexed foreign key, causing PostgreSQL to escalate from a row-level lock to a table scan lock on a high-throughput ledger table.

The lock lasted only **54 milliseconds**. In isolation, this should have caused nothing more than a momentary blip on a Grafana dashboard.

Instead, it triggered a catastrophic non-linear feedback loop.

---

## The Amplification Factor: Retries as a Weapon

Our upstream services had been configured with standard retry policies:
\`\`\`yaml
# The configuration that took down production
retryPolicy:
  maxAttempts: 3
  backoff: 200ms
  jitter: false # <── THE CRITICAL MISTAKE
\`\`\`

When the 54ms lock held, 80 incoming API requests were delayed past their 500ms timeout threshold. The clients immediately fired **Retry #1**.

Because jitter was disabled, all 80 clients fired their retries simultaneously at exactly $t + 200\\text{ms}$. The database, which was just beginning to clear its backlog, was hit with double its nominal traffic.

Now 200 requests timed out. Those 200 requests fired **Retry #2**.

$$\\text{Traffic Amplification} = \\text{Incoming RPS} \\times \\left(1 + R_1 + R_2 + R_3\\right)$$

Within three minutes, incoming request volume jumped from **12,000 queries/second to 84,000 queries/second**—a 700% synthetic traffic spike generated entirely by our own services.

---

## Connection Pool Starvation

As database queries slowed from 2ms to 2,000ms, every API pod's connection pool became exhausted:

\`\`\`
Client HTTP Connection (Open)
    └── Pod Worker Thread (Active)
          └── HikariCP Database Connection (Checked Out, Blocked on DB Lock)
\`\`\`

With all 50 database connections checked out, the connection pool blocked incoming threads. The pod's HTTP server ran out of worker threads and stopped responding to Kubernetes health checks (\`/healthz\`).

Kubernetes concluded that the pods were dead and began **terminating and restarting them**.

Restarting a pod under 84,000 RPS is lethal:
1. The new pod boots up.
2. It attempts to warm its caches and establish 50 fresh TLS connections to the database.
3. The database CPU is already at 100%, so TLS handshakes time out.
4. The pod fails its startup probe and gets terminated again.

We had created a **CrashLoopBackOff hurricane**.

---

## The Circuit Breaker That Failed

Why didn't our circuit breakers open?

We had installed a popular open-source circuit breaker library configured to open when error rate exceeded 50% over a 10-second rolling window.

Here was the flaw: **Slow requests are not errors until they time out.**

Because our client timeout was 5,000ms, requests sat in flight for five full seconds before registering as failures. During those five seconds, the error rate was technically 0%, so the circuit breaker remained stubbornly closed, allowing thousands more doomed requests to pour into the dying database!

---

## How We Fixed It Permanently

To ensure this failure mode can never repeat, we redesigned our resilience layer around four mathematical invariants:

### 1. Mandatory Full Jitter Exponential Backoff
Never retry without randomized jitter:
\`\`\`go
// Full Jitter Backoff Algorithm
func FullJitter(attempt int, baseBackoff, maxBackoff time.Duration) time.Duration {
    temp := float64(baseBackoff) * math.Pow(2, float64(attempt))
    if temp > float64(maxBackoff) {
        temp = float64(maxBackoff)
    }
    // Randomize uniformly between 0 and temp
    return time.Duration(rand.Float64() * temp)
}
\`\`\`

### 2. Global Retry Budgets
A service may only allocate **10% of its total request bandwidth to retries**. If the system is executing 1,000 successful requests/min, it can execute at most 100 retries. When the retry budget is exhausted, retries are denied immediately.

### 3. Concurrency-Based Circuit Breaking
Circuit breakers must trigger on **concurrency saturation**, not just trailing error rate. If 90% of connection pool slots are occupied for more than 200ms, open the circuit immediately.

### 4. Client Request Deadlines
Every RPC carries a monotonic deadline timestamp in its metadata. If an intermediate hop sees that remaining time is insufficient to complete the operation, it drops the request immediately without forwarding it to the database.
    `
  },
  {
    slug: 'node-js-is-single-threaded-who-is-doing-the-work',
    title: "Node.js Is Single-Threaded. So Who's Doing the Work?",
    description: "A hands-on journey through the Event Loop, libuv Thread Pool, and the hidden concurrency behind Node.js.",
    date: '2026-11-08',
    topic: 'backend-engineering',
    tags: ['nodejs', 'concurrency', 'libuv', 'event-loop', 'performance', 'backend-engineering'],
    featured: false,
    draft: true,
    githubUrl: 'https://github.com/huyhoang1001/underhood/tree/main/experiments/node-concurrency',
    toc: [
      { id: 'the-contradiction', title: "The Contradiction: If It's Single-Threaded, Who Did That?", level: 2 },
      { id: 'what-single-threaded-actually-means', title: 'Part 1: What "Single-Threaded" Actually Means', level: 2 },
      { id: 'meet-libuv-the-hidden-runtime', title: 'Part 2: Meet libuv, the Hidden Engine', level: 2 },
      { id: 'the-four-worker-experiment', title: 'Part 3: The Four-Worker Experiment (Thread Pool Saturation)', level: 2 },
      { id: 'the-surprising-network-case', title: 'Part 4: The Surprising Network Case (epoll vs. Thread Pools)', level: 2 },
      { id: 'promise-all-is-not-parallel', title: 'Part 5: Promise.all() Is Not a Parallel Execution Engine', level: 2 },
      { id: 'blocking-the-event-loop', title: 'Part 6: What Happens When the Main Thread Is Blocked?', level: 2 },
      { id: 'when-to-use-worker-threads', title: 'Part 7: When Should We Use Worker Threads?', level: 2 },
      { id: 'the-production-decision-guide', title: 'Part 8: The Production Decision Guide', level: 2 },
      { id: 'the-corrected-mental-model', title: 'Conclusion: The Corrected Mental Model', level: 2 }
    ],
    relatedSlugs: ['backpressure-is-not-an-overload-policy', 'understanding-grpc-flow-control', 'what-happens-when-a-queue-grows-without-bounds'],
    content: `
Every backend engineer has heard the mantra: *"Node.js is single-threaded."* 

We repeat it in job interviews. We explain it to junior developers. We nod along when conference speakers explain how the Event Loop enables Node.js to serve tens of thousands of concurrent requests without thread-per-request overhead.

And yet, if you inspect a running Node.js process using \`top -H -p <pid>\` or \`htop\` on Linux, you will notice something unsettling:

\`\`\`
  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
14820 node      20   0  782412  85420  34112 S   0.0   0.5   0:00.12 node (Thread 1: Main JS)
14821 node      20   0  782412  85420  34112 S   0.0   0.5   0:00.00 node (Thread 2: libuv worker)
14822 node      20   0  782412  85420  34112 S   0.0   0.5   0:00.00 node (Thread 3: libuv worker)
14823 node      20   0  782412  85420  34112 S   0.0   0.5   0:00.00 node (Thread 4: libuv worker)
14824 node      20   0  782412  85420  34112 S   0.0   0.5   0:00.00 node (Thread 5: libuv worker)
14825 node      20   0  782412  85420  34112 S   0.0   0.5   0:00.00 node (Thread 6: V8 background)
14826 node      20   0  782412  85420  34112 S   0.0   0.5   0:00.00 node (Thread 7: V8 background)
\`\`\`

A bare Node.js process does not have one operating system thread. It routinely spawns **7 to 11 OS threads** before you have written a single line of business logic.

So what does "single-threaded" actually mean? When you invoke \`fs.readFile()\`, hash a password with \`crypto.pbkdf2()\`, query PostgreSQL via \`pg\`, or handle 5,000 incoming HTTP connections simultaneously, **who is actually doing the work?**

Let's dismantle the abstractions and measure reality through reproducible experiments.

---

## The Contradiction: If It's Single-Threaded, Who Did That?

Consider this routine code snippet in an authentication microservice:

\`\`\`javascript
app.post('/register', async (req, res) => {
  // 1. Password hashing (CPU-heavy crypto)
  const passwordHash = await hashPassword(req.body.password);
  
  // 2. File write (disk I/O)
  await fs.promises.writeFile(\`/audit/\${req.body.email}.log\`, 'Account created');
  
  // 3. Database query (network socket)
  await db.query('INSERT INTO users(email, hash) VALUES($1, $2)', [req.body.email, passwordHash]);
  
  res.json({ status: 'created' });
});
\`\`\`

If JavaScript runs on one thread, how can a single Node.js process handle 500 engineers hitting this endpoint simultaneously without:
1. One user's password hash freezing all other incoming requests?
2. A slow disk write halting the entire server?
3. A database query consuming 100% of an OS thread while waiting for PostgreSQL?

The answer is that **Node.js is not an engine; it is an orchestra.** 

JavaScript execution is single-threaded. The Node.js runtime is massively multi-threaded.

---

## Part 1: What "Single-Threaded" Actually Means

To understand the runtime, we must draw a strict boundary between three layers:

\`\`\`
┌────────────────────────────────────────────────────────┐
│               Your Application JavaScript              │  <── Single Call Stack
└───────────────────────────┬────────────────────────────┘
                            │ V8 JavaScript Engine
┌───────────────────────────▼────────────────────────────┐
│                  Node.js C++ Bindings                  │  <── Main Thread
├────────────────────────────────────────────────────────┤
│                         libuv                          │
│   ┌───────────────────────┐   ┌────────────────────┐   │
│   │      Event Loop       │   │ Worker Thread Pool │   │  <── Multi-Threaded!
│   │     (Main Thread)     │   │   (4 OS Threads)   │   │
│   └───────────┬───────────┘   └──────────┬─────────┘   │
└───────────────┼──────────────────────────┼─────────────┘
                │                          │
┌───────────────▼───────────┐   ┌──────────▼─────────────┐
│  OS Kernel epoll / kqueue │   │  Blocking System Calls │
│ (Sockets, Pipes, Network) │   │   (Disk I/O, Crypto)   │
└───────────────────────────┘   └────────────────────────┘
\`\`\`

### The V8 Call Stack
The Google V8 engine provides the JavaScript runtime: the heap where objects reside, the garbage collector, and a single **Call Stack**. 

The Call Stack is strictly LIFO (Last In, First Out). It executes one frame at a time. It cannot pause midway through a synchronous \`for\` loop to let another JavaScript function run. In this sense—and **only in this sense**—is Node.js single-threaded.

When your JavaScript executes:
\`\`\`javascript
function calculateTax(subtotal) {
  return subtotal * 0.0825; // Frame 1
}
function processInvoice(order) {
  const tax = calculateTax(order.subtotal); // Frame 2
  return order.subtotal + tax;
}
\`\`\`
Everything runs synchronously on **OS Thread #1** (the main thread). If a function takes 5 seconds of CPU time, Thread #1 is pinned. Nothing else can happen on that stack until it returns.

---

## Part 2: Meet libuv, the Hidden Engine

Node.js was not born purely out of V8. It was born when Ryan Dahl combined V8 with an event-driven C library created specifically for Node.js: **libuv**.

libuv is responsible for two distinct concurrency mechanisms:
1. **The Event Loop**: A state machine running on the **main thread** that polls for events and executes their registered callbacks.
2. **The Worker Thread Pool**: A dedicated pool of **4 background operating system threads** (by default) managed by libuv in C.

> **Crucial Distinction:**  
> The Event Loop does NOT have its own thread pool. The Event Loop is a \`while\` loop running directly on the main JavaScript thread! The libuv Worker Thread Pool is a separate group of C threads running in the background.

When you invoke a Node.js asynchronous API, Node.js inspects the nature of the work:
- Is it network socket I/O? Hand it off to the **OS Kernel** via non-blocking epoll/kqueue.
- Is it synchronous filesystem I/O, heavy crypto, or compression? Hand it off to the **libuv Worker Thread Pool**.

Let's test this directly.

---

## Part 3: The Four-Worker Experiment (Thread Pool Saturation)

To prove that the libuv thread pool exists and has exactly 4 threads by default, we created **Experiment A** (\`experiments/node-concurrency/experiment-a-threadpool.mjs\`).

We use \`crypto.pbkdf2()\`, a CPU-intensive key derivation algorithm executed natively by OpenSSL inside libuv's thread pool:

\`\`\`javascript
// experiments/node-concurrency/experiment-a-threadpool.mjs
import crypto from 'node:crypto';
import { performance } from 'node:perf_hooks';

const jobCount = parseInt(process.argv[2] || '4', 10);
const start = performance.now();

for (let i = 1; i <= jobCount; i++) {
  const jobStart = performance.now();
  crypto.pbkdf2('passphrase', 'salt', 100000, 64, 'sha512', () => {
    console.log(\`Job #\${i} finished in \${(performance.now() - jobStart).toFixed(1)} ms\`);
  });
}
\`\`\`

### Run 1: Exactly 4 Jobs (Matching Default Pool Size)
\`\`\`bash
$ node experiments/node-concurrency/experiment-a-threadpool.mjs 4
\`\`\`

**Actual Observed Result:**
\`\`\`
UV_THREADPOOL_SIZE : 4 (default)
Total crypto jobs  : 4

  Job # 1 finished in   251.2 ms
  Job # 2 finished in   257.8 ms
  Job # 4 finished in   260.6 ms
  Job # 3 finished in   268.3 ms

All 4 jobs completed in 269.9 ms total.
\`\`\`

All 4 jobs started at the same instant ($t=0$) and finished together at $\\approx 260\\text{ms}$. Why? Because libuv has 4 worker threads. Each job received its own dedicated thread.

---

### Run 2: Submitting 8 Jobs to the 4-Worker Pool
What happens when we submit **8 jobs**?

\`\`\`bash
$ node experiments/node-concurrency/experiment-a-threadpool.mjs 8
\`\`\`

**Actual Observed Result:**
\`\`\`
UV_THREADPOOL_SIZE : 4 (default)
Total crypto jobs  : 8

  Job # 4 finished in   241.2 ms  <── Wave 1 (Threads 1-4)
  Job # 1 finished in   243.1 ms
  Job # 3 finished in   245.9 ms
  Job # 2 finished in   259.9 ms
  ---------------------------------
  Job # 6 finished in   533.0 ms  <── Wave 2 (Queued until Wave 1 freed threads!)
  Job # 5 finished in   543.2 ms
  Job # 7 finished in   556.3 ms
  Job # 8 finished in   560.9 ms

All 8 jobs completed in 563.6 ms total.
\`\`\`

Notice the clean breakpoint. 
- Jobs #1, #2, #3, and #4 finished in **~245ms**.
- Jobs #5, #6, #7, and #8 were queued in libuv's internal FIFO work queue. They could not start until Wave 1 completed. Their duration doubled to **~550ms**.

Total wall-clock duration: **563.6ms** ($2 \\times 260\\text{ms}$).

---

### Run 3: Expanding UV_THREADPOOL_SIZE to 8
Can we eliminate the queue delay by increasing the thread pool size?

\`\`\`bash
$ UV_THREADPOOL_SIZE=8 node experiments/node-concurrency/experiment-a-threadpool.mjs 8
\`\`\`

**Actual Observed Result:**
\`\`\`
UV_THREADPOOL_SIZE : 8
Total crypto jobs  : 8

  Job # 2 finished in   442.1 ms
  Job # 1 finished in   443.8 ms
  Job # 3 finished in   443.9 ms
  Job # 4 finished in   449.5 ms
  Job # 5 finished in   450.6 ms
  Job # 6 finished in   454.8 ms
  Job # 7 finished in   567.7 ms
  Job # 8 finished in   575.1 ms

All 8 jobs completed in 577.5 ms total.
\`\`\`

Look closely at the numbers.
With 8 threads, **all 8 jobs ran concurrently from t=0.** None sat idle in a queue.
However, because the host hardware has finite CPU cores, the operating system kernel had to time-slice CPU cycles across all 8 threads. Consequently, individual job duration rose from 250ms to ~450ms.

> **Engineering Takeaway:**  
> \`UV_THREADPOOL_SIZE\` is an environment variable evaluated **only once when the Node.js process starts**. Setting \`process.env.UV_THREADPOOL_SIZE = 8\` inside your JavaScript file does nothing—libuv has already initialized its thread pool before your script evaluates.

---

## Part 4: The Surprising Network Case (epoll vs. Thread Pools)

At this point, many engineers jump to a dangerous conclusion:
*"If libuv only has 4 threads, does that mean my Node.js server can only handle 4 concurrent database queries or 4 concurrent HTTP requests?"*

**The answer is an emphatic NO.**

Network operations—TCP sockets, HTTP connections, WebSockets, and outgoing database client connections—**DO NOT use libuv worker threads.**

### How Asynchronous Network I/O Actually Works
When Node.js listens on port 3000 or initiates a TCP connection to PostgreSQL, it asks the Linux kernel to create a file descriptor and mark it as **non-blocking** (\`O_NONBLOCK\`):

\`\`\`
┌────────────────┐      1. Add socket fd to watch list      ┌─────────────────────────┐
│ Node.js Main   │ ───────────────────────────────────────> │ Linux Kernel epoll_ctl  │
│  Event Loop    │                                          └────────────┬────────────┘
│                │      2. epoll_wait(timeout)                           │
│                │ <───────────────────────────────────────── (Poll Phase)
│                │                                                       ▼
│                │      3. "Data arrived on socket #42!"    ┌─────────────────────────┐
│                │ <─────────────────────────────────────── │ Incoming TCP SYN / DATA │
└────────────────┘                                          └─────────────────────────┘
\`\`\`

1. When data is sent over a socket, Node.js does not spin a thread waiting for bytes.
2. It registers the socket with the OS kernel's event demultiplexer:
   - **Linux:** \`epoll\`
   - **macOS / BSD:** \`kqueue\`
   - **Windows:** \`IOCP\`
3. During the **Poll phase** of the Event Loop, libuv executes a single system call: \`epoll_wait()\`.
4. The kernel informs libuv: *"Socket #42 and Socket #108 have received packets."*
5. libuv reads the packets into user-space buffers and invokes your JavaScript \`'data'\` callbacks on the main thread.

Because one kernel \`epoll\` instance can monitor hundreds of thousands of idle connections without allocating OS threads, a single Node.js process can easily maintain **100,000 concurrent idle WebSockets** while consuming minimal memory.

### The Special DNS Trap: dns.lookup vs. dns.resolve
Here is a classic production gotcha:

| Method | Mechanism | Uses libuv Thread Pool? | Respects /etc/hosts? |
| :--- | :--- | :--- | :--- |
| **\`dns.lookup()\`** | Calls C library \`getaddrinfo(3)\` | **YES (Consumes 1 worker thread!)** | Yes |
| **\`dns.resolve()\`** | Uses c-ares C library | **NO (Pure non-blocking network socket)** | No (Queries DNS directly) |

When you use Node.js's default \`http.request('https://api.stripe.com')\`, Node.js calls \`dns.lookup()\` to resolve the hostname. 

If your service experiences a DNS latency spike while initiating 100 outgoing API calls, **all 4 libuv worker threads become stuck inside blocking \`getaddrinfo()\` calls**. Suddenly, unrelated \`fs.readFile()\` or \`crypto\` calls freeze across your entire application!

---

## Part 5: Promise.all() Is Not a Parallel Execution Engine

Engineers frequently wrap tasks in \`Promise.all()\` believing they have achieved multi-threaded parallelism:

\`\`\`javascript
await Promise.all([
  computeReport(data1),
  computeReport(data2),
  computeReport(data3)
]);
\`\`\`

We designed **Experiment C** (\`experiments/node-concurrency/experiment-c-promise-all.mjs\`) to measure what \`Promise.all()\` actually does.

### Comparing Network I/O vs. CPU Tasks
In Part 1 of Experiment C, we opened **10 concurrent socket connections** with a 50ms delay:
\`\`\`
10 socket operations (each taking 50ms) completed in: 79.9 ms total.
Result: Overlapped in OS kernel readiness queue (libuv event demultiplexer).
\`\`\`

In Part 2, we wrapped **4 CPU-intensive tasks** (each requiring 60ms of synchronous calculation) in \`Promise.all()\`:
\`\`\`
Part 2: 4 CPU-Intensive Tasks Wrapped in Promise.all()
   Job #1 finished execution after 60.0 ms
   Job #2 finished execution after 60.0 ms
   Job #3 finished execution after 60.0 ms
   Job #4 finished execution after 60.0 ms

   Total duration for 4 x 60ms CPU jobs: 241.1 ms
   Theoretical parallel time: ~60 ms
   Actual sequential time   : 240 ms (~241.1 ms)
\`\`\`

**The finding is unambiguous:**
\`Promise.all()\` does not spawn threads. It does not distribute work across CPU cores. It is simply a synchronization coordinator for promises. 

If the underlying task is non-blocking I/O (handled by the kernel or libuv threads), the operations overlap. If the task is JavaScript CPU computation, **each callback executes strictly sequentially on the single main thread.**

---

## Part 6: What Happens When the Main Thread Is Blocked?

What happens when an engineer puts CPU-heavy synchronous logic in a Node.js route handler?

In **Experiment B** (\`experiments/node-concurrency/experiment-b-eventloop-blocking.mjs\`), we built an HTTP server with two routes:
- \`GET /ping\`: Lightweight health check returning immediate JSON.
- \`GET /heavy\`: Synchronous mathematical loop simulating an un-indexed array filter or heavy JSON parsing.

We used \`perf_hooks.monitorEventLoopDelay()\` to track Event Loop lag.

### The Measured Result
\`\`\`bash
$ node experiments/node-concurrency/experiment-b-eventloop-blocking.mjs
\`\`\`

\`\`\`
1. Measuring baseline /ping latency (unloaded Event Loop)...
   Baseline /ping response time: 18.71 ms

2. Firing concurrent requests:
   - Request 1: /heavy (synchronous CPU loop)
   - Request 2: /ping  (sent 5ms after /heavy started)

   /heavy finished in : 579.77 ms
   /ping  finished in : 578.00 ms (BLOCKED waiting for Event Loop!)

Event Loop Histogram Metrics:
   Max Event Loop Delay : 578.29 ms
   Mean Event Loop Delay: 578.03 ms
\`\`\`

While \`/heavy\` ran its synchronous loop on Thread #1, **the Event Loop could not tick**. 

The operating system kernel accepted the incoming TCP connection for \`/ping\`, but Node.js could not read the bytes or dispatch the route handler until the heavy calculation finished. 

A single user requesting an expensive calculation caused every other customer's lightweight request to stall for over half a second.

---

## Part 7: When Should We Use Worker Threads?

If libuv's thread pool is reserved for internal C++ bindings and \`Promise.all()\` doesn't parallelize JavaScript, how do we run CPU-intensive JavaScript in parallel?

The answer is **Worker Threads** (\`node:worker_threads\`), introduced in Node.js v10.5.

In **Experiment D** (\`experiments/node-concurrency/experiment-d-worker-threads.mjs\`), we offloaded four heavy CPU tasks to independent worker threads while running a 10ms heartbeat probe on the main thread:

\`\`\`bash
$ node experiments/node-concurrency/experiment-d-worker-threads.mjs
\`\`\`

**Actual Observed Result:**
\`\`\`
Dispatching 4 heavy CPU jobs to 4 independent Worker Threads...
  Worker #1 finished in 1007.7 ms
  Worker #2 finished in 1012.4 ms
  Worker #3 finished in  983.6 ms
  Worker #4 finished in  914.8 ms

All 4 workers finished in 1273.3 ms total.
Main thread Event Loop health:
  - Heartbeat ticks executed : 94
  - Max heartbeat lag         : 0.055 ms
\`\`\`

### The Miracle of True Parallelism
While four separate CPU cores were maxed out calculating numbers for 1,000ms:
- The main thread executed **94 heartbeat ticks**.
- The maximum event loop lag was **0.055 milliseconds**!

If an HTTP server had received 1,000 health check pings during that second, every single one would have resolved instantly in under 1 millisecond.

### Thread Pool vs. Worker Threads
| Dimension | libuv Thread Pool | \`node:worker_threads\` |
| :--- | :--- | :--- |
| **Controlled By** | libuv internal C++ engine | Application developer |
| **Runs What?** | Native C++ tasks (fs, crypto, zlib, DNS) | Arbitrary JavaScript / TypeScript |
| **V8 Engine** | Shares the single V8 Isolate | Each worker has its own independent V8 Isolate |
| **Memory Isolation** | Shared process heap | Isolated heaps (communicate via postMessage or SharedArrayBuffer) |
| **Startup Cost** | Pre-allocated at boot | ~30ms–50ms to spawn a new V8 Isolate |

> **Production Warning:**  
> Never spawn a new \`Worker\` on every incoming HTTP request. Spawning a V8 Isolate costs tens of milliseconds and allocates ~30MB of memory. In production, always use a **pre-warmed worker pool** like \`piscina\`.

---

## Part 8: The Production Decision Guide

Use this flowchart to decide how to handle operations in production Node.js services:

\`\`\`
What type of work are you executing?
 │
 ├── 1. Network I/O (HTTP requests, WebSockets, DB queries, Redis)
 │    └── Standard async/await. 
 │        Uses OS non-blocking epoll/kqueue. Zero worker threads needed.
 │
 ├── 2. File / Disk I/O, Compression (zlib), or Cryptography (pbkdf2)
 │    └── Standard asynchronous Node.js APIs (e.g. fs.promises).
 │        Uses libuv Thread Pool. 
 │        If disk I/O or crypto is heavily saturated, increase UV_THREADPOOL_SIZE.
 │
 ├── 3. Heavy CPU JavaScript (PDF generation, image resizing, large JSON parsing)
 │    └── DO NOT run on the main thread!
 │        Use a pre-warmed Worker Thread Pool (e.g. piscina).
 │        Keeps Event Loop lag < 1ms.
 │
 └── 4. Frequent External Hostname Lookups
      └── Avoid dns.lookup() in tight loops.
          Use dns.resolve() or enable an in-memory DNS caching agent (like undici / got cache).
\`\`\`

---

## Conclusion: The Corrected Mental Model

We can now replace the incomplete adage with an accurate mental model:

> **The Corrected Mental Model of Node.js:**  
> Node.js is single-threaded at the default JavaScript execution level, but multi-threaded at the runtime and process level.  
> - **Your JavaScript:** Runs on Thread #1 (the Main Thread).  
> - **Your Network I/O:** Runs on Zero Threads (managed non-blockingly by the OS kernel).  
> - **Your Disk & Crypto I/O:** Runs on 4+ Native Threads (libuv Worker Pool).  
> - **Your CPU Parallelism:** Runs on Dedicated Threads (Worker Threads).

Understanding who is doing the work is the difference between an engineer who wonders why their API latency is spiking to 500ms under load, and an engineer who knows exactly which knob to turn.
    `
  }
];

export const ARTICLES: Article[] = RAW_ARTICLES.map((article) => ({
  ...article,
  readingTime: calculateReadingTime(article.content).text
}));

export const ARTICLE_SLUGS = ARTICLES.map((a) => a.slug);
