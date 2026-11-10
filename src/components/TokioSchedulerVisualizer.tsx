import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Cpu, Heart } from 'lucide-react';

type Strategy = 'blocking' | 'spawn_blocking' | 'bounded';

interface WorkerSlot {
  id: number;
  busy: boolean;
  taskId: number | null;
  label: string; // 'async worker' or 'blocking pool'
}

interface HealthSample {
  t: number;
  latencyMs: number;
}

const WORKER_COUNT = 8;
const BLOCKING_POOL_SHOWN = 4; // show first 4 blocking pool slots
const TASK_DURATION_MS = 800; // scaled-up 100ms → 800ms for visibility
const HEALTH_INTERVAL_MS = 400; // how often health probes fire
const SEMAPHORE_LIMIT = 4;

function useSimulator(strategy: Strategy, concurrency: number, running: boolean) {
  const [workerSlots, setWorkerSlots] = useState<WorkerSlot[]>(
    Array.from({ length: WORKER_COUNT }, (_, i) => ({
      id: i,
      busy: false,
      taskId: null,
      label: 'async worker',
    }))
  );
  const [blockingSlots, setBlockingSlots] = useState<WorkerSlot[]>(
    Array.from({ length: BLOCKING_POOL_SHOWN }, (_, i) => ({
      id: i,
      busy: false,
      taskId: null,
      label: 'blocking pool',
    }))
  );
  const [healthSamples, setHealthSamples] = useState<HealthSample[]>([]);
  const [taskCounter, setTaskCounter] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [droppedCount, setDroppedCount] = useState(0);

  // Refs so callbacks always see fresh values
  const workerRef = useRef(workerSlots);
  const blockingRef = useRef(blockingSlots);
  const semaphoreRef = useRef(0); // current permits in use
  const taskCounterRef = useRef(0);
  const queuedRef = useRef(0);
  const droppedRef = useRef(0);
  const tRef = useRef(0);

  workerRef.current = workerSlots;
  blockingRef.current = blockingSlots;

  const reset = useCallback(() => {
    setWorkerSlots(Array.from({ length: WORKER_COUNT }, (_, i) => ({ id: i, busy: false, taskId: null, label: 'async worker' })));
    setBlockingSlots(Array.from({ length: BLOCKING_POOL_SHOWN }, (_, i) => ({ id: i, busy: false, taskId: null, label: 'blocking pool' })));
    setHealthSamples([]);
    setTaskCounter(0);
    setQueuedCount(0);
    setDroppedCount(0);
    semaphoreRef.current = 0;
    taskCounterRef.current = 0;
    queuedRef.current = 0;
    droppedRef.current = 0;
    tRef.current = 0;
  }, []);

  const occupyWorker = useCallback((taskId: number): number | null => {
    const slots = workerRef.current;
    const free = slots.findIndex(s => !s.busy);
    if (free === -1) return null;
    setWorkerSlots(prev => prev.map(s => s.id === free ? { ...s, busy: true, taskId } : s));
    return free;
  }, []);

  const freeWorker = useCallback((slotId: number) => {
    setWorkerSlots(prev => prev.map(s => s.id === slotId ? { ...s, busy: false, taskId: null } : s));
  }, []);

  const occupyBlocking = useCallback((taskId: number): number | null => {
    const slots = blockingRef.current;
    const free = slots.findIndex(s => !s.busy);
    if (free === -1) return null;
    setBlockingSlots(prev => prev.map(s => s.id === free ? { ...s, busy: true, taskId } : s));
    return free;
  }, []);

  const freeBlocking = useCallback((slotId: number) => {
    setBlockingSlots(prev => prev.map(s => s.id === slotId ? { ...s, busy: false, taskId: null } : s));
  }, []);

  // Fire a compute request
  const fireRequest = useCallback(() => {
    const taskId = ++taskCounterRef.current;
    setTaskCounter(taskId);
    const t = tRef.current;

    if (strategy === 'blocking') {
      // Occupies async worker for full TASK_DURATION_MS
      const workerSlot = occupyWorker(taskId);
      if (workerSlot === null) {
        // All workers busy — request queues in OS accept backlog, health latency spikes
        queuedRef.current++;
        setQueuedCount(queuedRef.current);
        // simulate queued request executing after a worker frees
        setTimeout(() => {
          const slot = occupyWorker(taskId);
          if (slot !== null) {
            setTimeout(() => freeWorker(slot), TASK_DURATION_MS);
          }
        }, TASK_DURATION_MS);
      } else {
        setTimeout(() => freeWorker(workerSlot), TASK_DURATION_MS);
      }
    } else if (strategy === 'spawn_blocking') {
      // Worker is occupied only briefly (yield + dispatch), then frees
      const workerSlot = occupyWorker(taskId);
      if (workerSlot === null) return;
      // Worker frees almost immediately (just the .await dispatch overhead)
      setTimeout(() => {
        freeWorker(workerSlot);
        // Blocking pool thread picks up the work
        const bSlot = occupyBlocking(taskId);
        if (bSlot !== null) {
          setTimeout(() => freeBlocking(bSlot), TASK_DURATION_MS);
        }
      }, 60);
    } else {
      // bounded: semaphore(4) gates blocking pool
      if (semaphoreRef.current >= SEMAPHORE_LIMIT) {
        // Semaphore full → 503
        droppedRef.current++;
        setDroppedCount(droppedRef.current);
        return;
      }
      semaphoreRef.current++;
      const workerSlot = occupyWorker(taskId);
      if (workerSlot === null) {
        semaphoreRef.current--;
        return;
      }
      setTimeout(() => {
        freeWorker(workerSlot);
        const bSlot = occupyBlocking(taskId);
        if (bSlot !== null) {
          setTimeout(() => {
            freeBlocking(bSlot);
            semaphoreRef.current = Math.max(0, semaphoreRef.current - 1);
          }, TASK_DURATION_MS);
        } else {
          semaphoreRef.current = Math.max(0, semaphoreRef.current - 1);
        }
      }, 60);
    }
  }, [strategy, occupyWorker, freeWorker, occupyBlocking, freeBlocking]);

  // Health probe: measure how many worker slots are free → maps to latency
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      tRef.current += HEALTH_INTERVAL_MS;
      const busyWorkers = workerRef.current.filter(s => s.busy).length;
      // If all workers busy → health waits in queue → high latency
      // latency scales: 0 busy = 2ms, all busy = 350ms
      const fraction = busyWorkers / WORKER_COUNT;
      const latencyMs = Math.round(2 + fraction * fraction * 350);
      setHealthSamples(prev => {
        const next = [...prev, { t: tRef.current, latencyMs }];
        return next.slice(-20); // keep last 20 samples
      });
    }, HEALTH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [running]);

  // Fire concurrent requests on an interval
  useEffect(() => {
    if (!running) return;
    const interval = Math.round(TASK_DURATION_MS / concurrency);
    const id = setInterval(fireRequest, interval);
    return () => clearInterval(id);
  }, [running, concurrency, fireRequest]);

  return { workerSlots, blockingSlots, healthSamples, taskCounter, queuedCount, droppedCount, reset };
}

const strategyMeta: Record<Strategy, { label: string; color: string; desc: string }> = {
  blocking:       { label: 'blocking',       color: 'text-red-600 dark:text-red-400',     desc: 'Runs CPU work directly on the async worker thread' },
  spawn_blocking: { label: 'spawn_blocking', color: 'text-emerald-600 dark:text-emerald-400', desc: 'Offloads to Tokio blocking thread pool via spawn_blocking' },
  bounded:        { label: 'bounded',        color: 'text-sky-600 dark:text-sky-400',     desc: 'spawn_blocking + Semaphore(4) — returns 503 when full' },
};

export const TokioSchedulerVisualizer: React.FC = () => {
  const [strategy, setStrategy] = useState<Strategy>('blocking');
  const [concurrency, setConcurrency] = useState(6);
  const [running, setRunning] = useState(false);

  const { workerSlots, blockingSlots, healthSamples, taskCounter, queuedCount, droppedCount, reset } = useSimulator(strategy, concurrency, running);

  const latestLatency = healthSamples[healthSamples.length - 1]?.latencyMs ?? 2;
  const latencyColor = latestLatency > 100
    ? 'text-red-600 dark:text-red-400'
    : latestLatency > 20
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';

  const showBlocking = strategy === 'spawn_blocking' || strategy === 'bounded';

  return (
    <div className="my-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee] dark:bg-[#0d1117]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
          <Cpu className="w-4 h-4 text-sky-500" />
          <span>Tokio Scheduler Starvation Simulator</span>
        </div>
        <span className="text-[11px] font-mono text-[#78716c] dark:text-[#8b949e]">
          {WORKER_COUNT} worker threads
        </span>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-[#e7e3da] dark:border-[#30363d]">
          {/* Strategy */}
          <div className="sm:col-span-2">
            <div className="text-xs font-medium text-[#44403c] dark:text-[#c9d1d9] mb-1.5">Strategy</div>
            <div className="flex gap-2">
              {(['blocking', 'spawn_blocking', 'bounded'] as Strategy[]).map(s => (
                <button
                  key={s}
                  onClick={() => { setStrategy(s); setRunning(false); reset(); }}
                  className={`flex-1 py-1.5 text-[11px] font-mono rounded transition-colors ${
                    strategy === s
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'bg-[#f2ede4] dark:bg-[#0d1117] text-[#78716c] dark:text-[#8b949e] border border-[#e7e3da] dark:border-[#30363d]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className={`text-[11px] mt-1.5 font-mono ${strategyMeta[strategy].color}`}>
              {strategyMeta[strategy].desc}
            </div>
          </div>

          {/* Concurrency */}
          <div>
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="text-[#44403c] dark:text-[#c9d1d9]">Concurrent requests</span>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">{concurrency}</span>
            </div>
            <input
              type="range" min={1} max={16} step={1} value={concurrency}
              onChange={e => { setConcurrency(Number(e.target.value)); if (running) { setRunning(false); setTimeout(() => setRunning(true), 50); } }}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#a8a29e] dark:text-[#6e7681] mt-0.5">
              <span>1</span><span>8 (= num_cpus)</span><span>16</span>
            </div>
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">/health p99</div>
            <div className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${latencyColor}`}>
              {latestLatency} <span className="text-xs font-normal">ms</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">Tasks fired</div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1c1917] dark:text-[#f0f6fc] mt-0.5">{taskCounter}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">Queued</div>
            <div className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${queuedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[#1c1917] dark:text-[#f0f6fc]'}`}>
              {queuedCount}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">503 dropped</div>
            <div className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${droppedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-[#1c1917] dark:text-[#f0f6fc]'}`}>
              {droppedCount}
            </div>
          </div>
        </div>

        {/* Worker thread grid */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#78716c] dark:text-[#8b949e]">
            <Activity className="w-3 h-3" />
            <span>Tokio Worker Threads ({WORKER_COUNT})</span>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {workerSlots.map(slot => (
              <div
                key={slot.id}
                className={`p-2 rounded-lg border text-center transition-all duration-200 ${
                  slot.busy
                    ? 'bg-red-100 dark:bg-red-950/40 border-red-400 dark:border-red-700'
                    : 'bg-[#ffffff] dark:bg-[#1c2128] border-[#e7e3da] dark:border-[#30363d]'
                }`}
              >
                <div className="text-[10px] font-mono text-[#78716c] dark:text-[#8b949e]">W{slot.id + 1}</div>
                <div className={`text-[10px] font-bold mt-0.5 ${slot.busy ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {slot.busy ? 'BUSY' : 'FREE'}
                </div>
                {slot.busy && slot.taskId && (
                  <div className="text-[9px] font-mono text-red-500 dark:text-red-400 truncate">#{slot.taskId}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Blocking pool grid — only shown for spawn_blocking / bounded */}
        {showBlocking && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#78716c] dark:text-[#8b949e]">
              <Activity className="w-3 h-3" />
              <span>Blocking Thread Pool (showing {BLOCKING_POOL_SHOWN} of up to 512)</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {blockingSlots.map(slot => (
                <div
                  key={slot.id}
                  className={`p-2 rounded-lg border text-center transition-all duration-200 ${
                    slot.busy
                      ? 'bg-sky-100 dark:bg-sky-950/40 border-sky-400 dark:border-sky-700'
                      : 'bg-[#ffffff] dark:bg-[#1c2128] border-[#e7e3da] dark:border-[#30363d]'
                  }`}
                >
                  <div className="text-[10px] font-mono text-[#78716c] dark:text-[#8b949e]">B{slot.id + 1}</div>
                  <div className={`text-[10px] font-bold mt-0.5 ${slot.busy ? 'text-sky-600 dark:text-sky-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {slot.busy ? 'BUSY' : 'FREE'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health latency sparkline */}
        {healthSamples.length > 1 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#78716c] dark:text-[#8b949e]">
              <Heart className="w-3 h-3 text-sky-500" />
              <span>/health latency over time</span>
            </div>
            <div className="relative h-16 bg-[#f7f4ee] dark:bg-[#0d1117] rounded border border-[#e7e3da] dark:border-[#30363d] overflow-hidden px-2">
              <svg width="100%" height="100%" viewBox={`0 0 ${healthSamples.length} 64`} preserveAspectRatio="none">
                <polyline
                  points={healthSamples.map((s, i) => `${i},${Math.max(2, 64 - (s.latencyMs / 400) * 60)}`).join(' ')}
                  fill="none"
                  stroke={latestLatency > 100 ? '#ef4444' : latestLatency > 20 ? '#f59e0b' : '#10b981'}
                  strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <div className="absolute top-1 right-2 text-[10px] font-mono text-[#78716c] dark:text-[#8b949e]">400ms max</div>
              <div className="absolute bottom-1 right-2 text-[10px] font-mono text-[#78716c] dark:text-[#8b949e]">0ms</div>
            </div>
          </div>
        )}

        {/* Start/Stop/Reset */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => setRunning(r => !r)}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
              running
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-sky-600 hover:bg-sky-700 text-white'
            }`}
          >
            {running ? '⏹ Stop' : '▶ Run simulation'}
          </button>
          <button
            onClick={() => { setRunning(false); reset(); }}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#e7e3da] dark:border-[#30363d] text-[#78716c] dark:text-[#8b949e] hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
          >
            Reset
          </button>
          {!running && healthSamples.length === 0 && (
            <span className="self-center text-[11px] font-mono text-[#a8a29e] dark:text-[#6e7681]">
              Pick a strategy → Run → watch /health latency react
            </span>
          )}
        </div>

        {/* Insight callout */}
        {running && (
          <div className={`p-3.5 rounded-lg border text-xs leading-relaxed transition-colors ${
            strategy === 'blocking' && latestLatency > 50
              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300'
              : 'bg-[#f7f4ee] dark:bg-[#0d1117] border-[#e7e3da] dark:border-[#30363d] text-[#44403c] dark:text-[#c9d1d9]'
          }`}>
            {strategy === 'blocking' && (
              <span>
                <strong>Starvation in progress.</strong> Worker threads are occupied with 100ms CPU work.
                The /health handler is a pending task — it can't be polled until a worker frees.
                {latestLatency > 50 && <span className="font-semibold text-red-700 dark:text-red-400"> /health latency: {latestLatency}ms 🔴</span>}
              </span>
            )}
            {strategy === 'spawn_blocking' && (
              <span>
                <strong>Workers stay free.</strong> CPU work is dispatched to the blocking pool.
                Worker threads return to the scheduler immediately after the .await — /health gets polled without delay.
              </span>
            )}
            {strategy === 'bounded' && (
              <span>
                <strong>Semaphore(4) active.</strong> At most 4 blocking tasks run concurrently.
                Excess requests return 503 immediately rather than queuing indefinitely.
                {droppedCount > 0 && <span className="font-semibold text-sky-600 dark:text-sky-400"> {droppedCount} requests rejected with 503.</span>}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
