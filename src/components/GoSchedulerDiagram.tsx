import React, { useState } from 'react';
import { Cpu } from 'lucide-react';

interface SchedulerLayer {
  id: string;
  title: string;
  subtitle: string;
  threadModel: string;
  operations: string[];
  blockingRisk: string;
  description: string;
  codeSnippet: string;
}

export const GoSchedulerDiagram: React.FC = () => {
  const [selectedLayerId, setSelectedLayerId] = useState<string>('logical-processor');

  const layers: SchedulerLayer[] = [
    {
      id: 'goroutine',
      title: 'Goroutine (G)',
      subtitle: 'Lightweight Execution Unit',
      threadModel: 'Goroutine stack: starts at 2–8 KB, grows on demand',
      operations: ['go func(){}()', 'runtime.Gosched()', 'goroutine park/unpark', 'channel block/unblock', 'sync.WaitGroup'],
      blockingRisk:
        'ZERO — goroutines waiting on I/O or channels consume no M thread while parked.',
      description:
        'A goroutine is a lightweight execution unit managed entirely by the Go runtime. Unlike OS threads (which start with an 8 MB fixed stack), goroutines start with a 2–8 KB stack that grows as needed. You can run a million of them. The Go scheduler, not the OS, decides when each goroutine runs.',
      codeSnippet: `// Spawns a lightweight goroutine — not an OS thread
go func() {
    doWork() // runs concurrently, scheduled by Go runtime
}()`,
    },
    {
      id: 'logical-processor',
      title: 'Logical Processor (P)',
      subtitle: 'Goroutine Run Queue Holder',
      threadModel: 'GOMAXPROCS Ps (default: runtime.NumCPU())',
      operations: ['local run queue', 'GOMAXPROCS', 'goroutine scheduling', 'work-stealing victim', 'runtime.GOMAXPROCS(n)'],
      blockingRisk:
        'CRITICAL — A CPU-bound goroutine with no yield points holds the P it runs on, preventing all other goroutines in its local queue from progressing.',
      description:
        'A P is a resource that an M (OS thread) must hold before it can run goroutines. Each P has its own local run queue. GOMAXPROCS determines how many Ps exist, which determines how many goroutines can truly run in parallel. With GOMAXPROCS=1, all goroutines share one P and run on one OS thread at a time.',
      codeSnippet: `// GOMAXPROCS sets the number of Ps — true parallelism ceiling
runtime.GOMAXPROCS(runtime.NumCPU())
// With GOMAXPROCS=1, all goroutines share a single P`,
    },
    {
      id: 'os-thread',
      title: 'OS Thread (M)',
      subtitle: 'Machine Thread Executor',
      threadModel: 'One OS thread per active goroutine; count varies',
      operations: ['OS thread creation/parking', 'syscall hand-off', 'runtime.LockOSThread()', 'P hand-off on syscall'],
      blockingRisk:
        'HIGH when blocked on syscall — the Go runtime spins up a new M to keep the P running, but thread proliferation has OS-level costs.',
      description:
        "An M is a real OS thread. The Go runtime maintains a pool of Ms and assigns them to Ps. When a goroutine makes a blocking syscall (e.g. a file read on a system without async support), the Go runtime automatically parks the P with the remaining goroutines on a new M, preventing the syscall from starving other goroutines. This is the key mechanism that makes Go's approach different from Node.js.",
      codeSnippet: `// The runtime hands off the P to a new M when a goroutine
// makes a blocking syscall, keeping other goroutines running
fd, err := os.Open("large_file.bin") // may block M
// runtime detaches P, spins up new M, P keeps scheduling`,
    },
    {
      id: 'network-poller',
      title: 'Network Poller',
      subtitle: 'Non-blocking I/O Watcher',
      threadModel: 'Zero M threads held while waiting (epoll/kqueue)',
      operations: ['net.Conn.Read()', 'http.Get()', 'goroutine park on I/O', 'kernel event arrival', 'goroutine unpark'],
      blockingRisk:
        'ZERO — network I/O goroutines are parked and do not hold an M or a P while waiting for data.',
      description:
        'The Go network poller integrates epoll (Linux) or kqueue (macOS) directly into the runtime. When a goroutine reads from a net.Conn or sends an HTTP request, it does not block an OS thread. The goroutine parks itself, and the network poller watches for readiness events. When the kernel signals that data arrived, the poller unparks the goroutine and puts it back in the run queue.',
      codeSnippet: `// No M is held while waiting for the client to send data
resp, err := http.Get("https://example.com")
// goroutine parks here — network poller watches epoll/kqueue
// when data arrives, goroutine is rescheduled — zero M held`,
    },
    {
      id: 'work-stealing',
      title: 'Work Stealing Scheduler',
      subtitle: 'Cross-P Task Balancing',
      threadModel: "All Ps share; idle P steals from busy P's queue",
      operations: ['local queue push/pop', 'global run queue poll', 'go keyword task placement', 'idle P steal', '61-tick global poll'],
      blockingRisk:
        'LOW — the scheduler is lock-free; risk only arises when all Ps are saturated by CPU-bound goroutines with no yield points.',
      description:
        "Each P has its own local run queue of goroutines. When a P runs out of work, it steals half the goroutines from another P's queue. There is also a global run queue that Ps check periodically. This keeps all Ps busy under load without a central dispatch bottleneck. The global queue is checked every 61 scheduling ticks to prevent starvation of globally-queued goroutines.",
      codeSnippet: `// 'go' pushes to the current P's local queue
for i := 0; i < 100; i++ {
    go doWork(i) // distributes across Ps via work stealing
}
// idle Ps steal from busy Ps' local queues`,
    },
  ];

  const active = layers.find((l) => l.id === selectedLayerId) || layers[1];

  return (
    <div className="my-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee] dark:bg-[#0d1117]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
          <Cpu className="w-4 h-4 text-sky-500" />
          <span>Interactive Architectural Map: Who Does the Work in Go?</span>
        </div>
        <span className="text-[11px] font-mono text-[#78716c] dark:text-[#8b949e]">
          Click any component to inspect
        </span>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Top: 5 Interactive Architectural Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
          {layers.map((l, idx) => {
            const isSelected = l.id === selectedLayerId;
            return (
              <button
                key={l.id}
                onClick={() => setSelectedLayerId(l.id)}
                className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between min-h-[120px] ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 ring-1 ring-sky-500'
                    : 'border-[#e7e3da] dark:border-[#30363d] bg-[#ffffff] dark:bg-[#1c2128] hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#78716c] dark:text-[#8b949e]">
                    Layer 0{idx + 1}
                  </div>
                  <div className="text-xs font-bold text-[#1c1917] dark:text-[#f0f6fc] mt-1 leading-snug">
                    {l.title}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 truncate pt-2 border-t border-[#e7e3da]/60 dark:border-[#30363d]/60">
                  {l.threadModel.split('(')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Detailed Inspector Drawer */}
        <div className="p-4 sm:p-5 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#e7e3da] dark:border-[#30363d]">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1c1917] dark:text-[#f0f6fc]">
                  {active.title}
                </span>
                <span className="text-[#a8a29e] dark:text-[#6e7681]">·</span>
                <span className="text-xs font-medium text-[#78716c] dark:text-[#8b949e]">
                  {active.subtitle}
                </span>
              </div>
              <div className="text-xs font-mono text-sky-600 dark:text-sky-400 mt-0.5">
                Thread Context: <strong>{active.threadModel}</strong>
              </div>
            </div>

            <div className="text-[11px] font-mono px-2 py-1 rounded bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 max-w-sm">
              {active.blockingRisk}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#44403c] dark:text-[#c9d1d9] leading-relaxed">
            {active.description}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-2">
            {/* Typical Operations */}
            <div className="md:col-span-5 space-y-1.5">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#78716c] dark:text-[#8b949e]">
                Operations Executed Here:
              </div>
              <ul className="space-y-1 text-xs font-mono text-[#24292f] dark:text-[#e6edf3]">
                {active.operations.map((op, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-sky-500" />
                    <span>{op}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Representative Code */}
            <div className="md:col-span-7">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#78716c] dark:text-[#8b949e] mb-1.5">
                Runtime Execution Pattern:
              </div>
              <pre className="p-3 rounded bg-[#ffffff] dark:bg-[#161b22] border border-[#e7e3da] dark:border-[#30363d] font-mono text-xs text-[#24292f] dark:text-[#e6edf3] overflow-x-auto leading-relaxed">
                <code>{active.codeSnippet}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
