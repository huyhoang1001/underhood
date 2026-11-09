import React, { useState } from 'react';
import { Layers } from 'lucide-react';

interface RuntimeLayer {
  id: string;
  title: string;
  subtitle: string;
  threadModel: string;
  operations: string[];
  blockingRisk: string;
  description: string;
  codeSnippet: string;
}

export const NodeProcessDiagram: React.FC = () => {
  const [selectedLayerId, setSelectedLayerId] = useState<string>('libuv-pool');

  const layers: RuntimeLayer[] = [
    {
      id: 'v8-main',
      title: 'V8 Engine & Call Stack',
      subtitle: 'Synchronous JavaScript Execution',
      threadModel: 'Thread #1 (Main OS Thread)',
      operations: ['JSON.parse()', 'Regular Expressions', 'Array.prototype.sort()', 'Function execution', 'Garbage Collection'],
      blockingRisk: 'CRITICAL — Any loop or CPU-heavy task blocks the Event Loop from processing any other event.',
      description:
        'All standard JavaScript code executes sequentially on a single thread. When a function executes synchronously here, no timers can fire, no I/O callbacks can resolve, and no new HTTP connections can be accepted.',
      codeSnippet: `// Runs on the Main Thread (Blocks everything if heavy!)
function parseHugePayload(raw) {
  return JSON.parse(raw); // Synchronous CPU work
}`
    },
    {
      id: 'event-loop',
      title: 'The Event Loop (libuv)',
      subtitle: 'Phase Orchestration & Callbacks',
      threadModel: 'Thread #1 (Main OS Thread)',
      operations: ['Timers (setTimeout/setInterval)', 'Pending I/O Callbacks', 'Poll Phase', 'Check (setImmediate)', 'Close Callbacks'],
      blockingRisk: 'HIGH — Runs on the main thread. If a callback takes 500ms, the next phase is delayed by 500ms.',
      description:
        'The Event Loop is not a separate thread. It is a while-loop executing on the main thread that coordinates when callbacks are invoked, when the OS is polled for I/O readiness, and when microtasks (process.nextTick, Promise.then) drain.',
      codeSnippet: `// Microtasks drain immediately after current JavaScript stack
process.nextTick(() => { /* runs before Event Loop continues */ });
Promise.resolve().then(() => { /* runs in microtask queue */ });`
    },
    {
      id: 'os-io',
      title: 'OS Non-Blocking I/O',
      subtitle: 'Kernel Event Demultiplexer',
      threadModel: 'Zero Thread Pool Threads (OS Kernel epoll / kqueue / IOCP)',
      operations: ['net.Socket (TCP/UDP)', 'http.createServer()', 'fetch() / http.request()', 'Database socket streams', 'Pipes'],
      blockingRisk: 'ZERO — Handled by the OS kernel. 10,000 idle sockets consume zero threads in Node.js.',
      description:
        'Asynchronous network I/O in Node.js DOES NOT use worker threads. libuv registers file descriptors with the operating system kernel (epoll on Linux, kqueue on macOS, IOCP on Windows). The kernel notifies libuv when data is ready to be read or written.',
      codeSnippet: `// 10,000 of these do NOT allocate 10,000 threads!
const server = net.createServer((socket) => {
  socket.on('data', (buf) => socket.write('ack'));
});`
    },
    {
      id: 'libuv-pool',
      title: 'libuv Thread Pool',
      subtitle: 'Native Background Worker Threads',
      threadModel: 'UV_THREADPOOL_SIZE (Default: 4 OS Worker Threads)',
      operations: ['crypto.pbkdf2() / scrypt()', 'fs.readFile() / fs.stat()', 'zlib.gzip() / gunzip()', 'dns.lookup() (getaddrinfo)'],
      blockingRisk: 'HIGH — If 4 crypto/fs tasks run simultaneously, the 5th task is queued and must wait for a free worker.',
      description:
        'Operating systems historically lack non-blocking APIs for synchronous disk I/O, compression, and blocking DNS. libuv maintains a fixed pool of native background threads to execute these C/C++ operations asynchronously and notify the main thread on completion.',
      codeSnippet: `// Dispatched onto libuv Thread #1..#4
crypto.pbkdf2('pass', 'salt', 100000, 64, 'sha512', (err, key) => {
  // Callback returns to Main Thread when complete
});`
    },
    {
      id: 'worker-threads',
      title: 'Worker Threads',
      subtitle: 'node:worker_threads (Parallel V8 Isolates)',
      threadModel: 'Independent OS Threads (Configured by Developer)',
      operations: ['Heavy data parsing', 'Image processing / Sharp', 'Cryptography loops', 'Machine learning inference in JS'],
      blockingRisk: 'LOW — Isolated from main thread. Communicates via message passing (postMessage) or SharedArrayBuffer.',
      description:
        'When you must execute CPU-intensive JavaScript without blocking the Event Loop, you create a Worker Thread. Each worker has its own V8 Isolate, its own Event Loop, and its own libuv context, executing in true parallel across CPU cores.',
      codeSnippet: `import { Worker } from 'node:worker_threads';
// Spawns a real OS thread with its own V8 isolate
const worker = new Worker('./cpu-task.js', { workerData: payload });`
    }
  ];

  const active = layers.find((l) => l.id === selectedLayerId) || layers[3];

  return (
    <div className="my-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee] dark:bg-[#0d1117]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
          <Layers className="w-4 h-4 text-sky-500" />
          <span>Interactive Architectural Map: Who Does the Work in Node.js?</span>
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
