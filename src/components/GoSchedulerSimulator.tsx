import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Zap, Cpu } from 'lucide-react';

// --- Types ---

interface Goroutine {
  id: number;
  type: 'compute' | 'health';
  arrivalTick: number;
  progress: number; // 0–5 (5 ticks = 100 ms)
  assignedP: number; // which P index, -1 = worker pool
  state: 'queued' | 'running' | 'completed' | 'parked';
  completedTick?: number;
}

interface PSlot {
  id: number;
  current: Goroutine | null;
  queue: Goroutine[];
}

interface WorkerSlot {
  id: number;
  current: Goroutine | null;
}

interface SimState {
  tick: number;
  nextId: number;
  ps: PSlot[];
  workers: WorkerSlot[];
  jobChannel: Goroutine[]; // waiting to enter worker pool
  completed: Goroutine[];
  healthLatencies: number[];
  computeCompleted: number;
  healthCompleted: number;
}

const TICK_MS = 50; // each tick = 50ms simulated
const GOROUTINE_TICKS = 5; // 5 ticks = 250ms execution (a bit faster for visual)
const HEALTH_INTERVAL = 15; // health goroutine every 15 ticks (~750ms)
const COMPUTE_INTERVAL = 2; // new compute goroutine every 2 ticks (~100ms)

function createInitialState(gomaxprocs: number): SimState {
  return {
    tick: 0,
    nextId: 1,
    ps: Array.from({ length: gomaxprocs }, (_, i) => ({ id: i, current: null, queue: [] })),
    workers: Array.from({ length: 4 }, (_, i) => ({ id: i, current: null })),
    jobChannel: [],
    completed: [],
    healthLatencies: [],
    computeCompleted: 0,
    healthCompleted: 0,
  };
}

export const GoSchedulerSimulator: React.FC = () => {
  const [gomaxprocs, setGomaxprocs] = useState(1);
  const [strategy, setStrategy] = useState<'goroutine' | 'workerpool'>('goroutine');
  const [running, setRunning] = useState(false);
  const [, forceRender] = useState(0);
  const simRef = useRef<SimState>(createInitialState(1));
  const lastHealthSpawn = useRef(0);
  const lastComputeSpawn = useRef(0);

  // Reset simulation when gomaxprocs or strategy changes
  const reset = useCallback(() => {
    simRef.current = createInitialState(gomaxprocs);
    lastHealthSpawn.current = 0;
    lastComputeSpawn.current = 0;
    setRunning(false);
    forceRender((n) => n + 1);
  }, [gomaxprocs]);

  useEffect(() => {
    // re-init on gomaxprocs change
    simRef.current = createInitialState(gomaxprocs);
    lastHealthSpawn.current = 0;
    lastComputeSpawn.current = 0;
    forceRender((n) => n + 1);
  }, [gomaxprocs, strategy]);

  // Main simulation loop
  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      const sim = simRef.current;
      sim.tick++;

      // --- 1. Spawn new goroutines ---
      // Compute goroutines arrive based on rate
      if (sim.tick - lastComputeSpawn.current >= COMPUTE_INTERVAL) {
        lastComputeSpawn.current = sim.tick;
        const g: Goroutine = {
          id: sim.nextId++,
          type: 'compute',
          arrivalTick: sim.tick,
          progress: 0,
          assignedP: -1,
          state: 'queued',
        };
        if (strategy === 'workerpool') {
          // Send to job channel (buffered, cap 20)
          if (sim.jobChannel.length < 20) {
            sim.jobChannel.push(g);
          }
          // Excess goroutines get dropped (simulating 503)
        } else {
          // Direct goroutine: distribute round-robin to P queues
          const pIdx = sim.tick % gomaxprocs;
          sim.ps[pIdx].queue.push(g);
        }
      }

      // Health goroutine arrives periodically
      if (sim.tick - lastHealthSpawn.current >= HEALTH_INTERVAL) {
        lastHealthSpawn.current = sim.tick;
        const g: Goroutine = {
          id: sim.nextId++,
          type: 'health',
          arrivalTick: sim.tick,
          progress: 0,
          assignedP: -1,
          state: 'queued',
        };
        // Health goroutine always goes to a P queue (never worker pool)
        // Find the P with the shortest queue
        let minQueueP = 0;
        for (let i = 1; i < sim.ps.length; i++) {
          if (sim.ps[i].queue.length < sim.ps[minQueueP].queue.length) {
            minQueueP = i;
          }
        }
        sim.ps[minQueueP].queue.push(g);
      }

      // --- 2. Process worker pool (workerpool strategy only) ---
      if (strategy === 'workerpool') {
        for (const worker of sim.workers) {
          if (worker.current) {
            worker.current.progress++;
            if (worker.current.progress >= GOROUTINE_TICKS) {
              worker.current.state = 'completed';
              worker.current.completedTick = sim.tick;
              sim.completed.push(worker.current);
              sim.computeCompleted++;
              worker.current = null;
            }
          }
          // Pick up from job channel
          if (!worker.current && sim.jobChannel.length > 0) {
            const g = sim.jobChannel.shift()!;
            g.state = 'running';
            g.assignedP = -1;
            worker.current = g;
          }
        }
      }

      // --- 3. Process Ps ---
      for (const p of sim.ps) {
        // Advance current goroutine
        if (p.current) {
          p.current.progress++;
          if (p.current.progress >= GOROUTINE_TICKS) {
            p.current.state = 'completed';
            p.current.completedTick = sim.tick;
            if (p.current.type === 'health') {
              sim.healthLatencies.push(sim.tick - p.current.arrivalTick);
              if (sim.healthLatencies.length > 30) sim.healthLatencies.shift();
              sim.healthCompleted++;
            } else {
              sim.computeCompleted++;
            }
            sim.completed.push(p.current);
            p.current = null;
          }
        }
        // Pick up next from queue
        if (!p.current && p.queue.length > 0) {
          p.current = p.queue.shift()!;
          p.current.state = 'running';
          p.current.assignedP = p.id;
        }
      }

      // --- 4. Work stealing (every 3 ticks) ---
      if (sim.tick % 3 === 0 && gomaxprocs > 1) {
        for (const p of sim.ps) {
          if (!p.current && p.queue.length === 0) {
            // This P is idle — try to steal
            let busiestP: PSlot | null = null;
            for (const other of sim.ps) {
              if (other.id !== p.id && other.queue.length > 1) {
                if (!busiestP || other.queue.length > busiestP.queue.length) {
                  busiestP = other;
                }
              }
            }
            if (busiestP) {
              const stealCount = Math.floor(busiestP.queue.length / 2);
              for (let i = 0; i < stealCount; i++) {
                p.queue.push(busiestP.queue.shift()!);
              }
            }
          }
        }
      }

      // Prune completed list (keep last 50)
      if (sim.completed.length > 50) {
        sim.completed = sim.completed.slice(-50);
      }

      forceRender((n) => n + 1);
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [running, gomaxprocs, strategy]);

  const sim = simRef.current;

  // --- Metrics ---
  const healthP50 = sim.healthLatencies.length > 0
    ? [...sim.healthLatencies].sort((a, b) => a - b)[Math.floor(sim.healthLatencies.length * 0.5)]
    : 0;
  const healthP99 = sim.healthLatencies.length > 0
    ? [...sim.healthLatencies].sort((a, b) => a - b)[Math.floor(sim.healthLatencies.length * 0.99)]
    : 0;
  const totalCompleted = sim.computeCompleted + sim.healthCompleted;

  // --- Goroutine chip color ---
  const goroutineColor = (g: Goroutine) => {
    if (g.type === 'health') return 'emerald';
    return 'sky';
  };

  // --- Goroutine chip ---
  const GoroutineChip: React.FC<{ g: Goroutine; compact?: boolean }> = ({ g, compact }) => {
    const isHealth = g.type === 'health';
    const progressPct = (g.progress / GOROUTINE_TICKS) * 100;
    return (
      <div
        className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[10px] font-mono ${
          isHealth
            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
            : 'bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-900/60'
        } ${compact ? 'w-fit' : 'w-full'} transition-all`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${isHealth ? 'bg-emerald-500' : 'bg-sky-500'}`} />
        <span className="font-semibold">G{g.id}</span>
        <span className="text-[9px] opacity-70">{isHealth ? 'H' : 'C'}</span>
        {g.state === 'running' && (
          <div className="flex-1 ml-1 h-1 rounded-full bg-current/20 overflow-hidden">
            <div
              className="h-full bg-current rounded-full transition-all duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="my-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] overflow-hidden shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee] dark:bg-[#0d1117]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
          <Zap className="w-4 h-4 text-sky-500" />
          <span>Go Scheduler Simulator: Watch Starvation Happen in Real Time</span>
        </div>
        <span className="text-[11px] font-mono text-[#78716c] dark:text-[#8b949e]">
          tick {sim.tick} · {strategy === 'workerpool' ? 'worker pool' : 'direct goroutine'}
        </span>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-[#e7e3da] dark:border-[#30363d]">
          {/* GOMAXPROCS */}
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-[#44403c] dark:text-[#c9d1d9]">GOMAXPROCS</span>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">
                {gomaxprocs} P{gomaxprocs > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 4, 8].map((n) => (
                <button
                  key={n}
                  onClick={() => { setGomaxprocs(n); setRunning(false); }}
                  className={`flex-1 py-1 text-xs font-mono rounded transition-colors ${
                    gomaxprocs === n
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'bg-[#f2ede4] dark:bg-[#0d1117] text-[#78716c] dark:text-[#8b949e] border border-[#e7e3da] dark:border-[#30363d] hover:border-slate-400'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Strategy */}
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-[#44403c] dark:text-[#c9d1d9]">Strategy</span>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">
                {strategy === 'goroutine' ? 'direct goroutine' : 'worker pool (4)'}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => { setStrategy('goroutine'); setRunning(false); }}
                className={`flex-1 py-1 text-xs font-mono rounded transition-colors ${
                  strategy === 'goroutine'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'bg-[#f2ede4] dark:bg-[#0d1117] text-[#78716c] dark:text-[#8b949e] border border-[#e7e3da] dark:border-[#30363d] hover:border-slate-400'
                }`}
              >
                goroutine
              </button>
              <button
                onClick={() => { setStrategy('workerpool'); setRunning(false); }}
                className={`flex-1 py-1 text-xs font-mono rounded transition-colors ${
                  strategy === 'workerpool'
                    ? 'bg-sky-600 text-white font-semibold'
                    : 'bg-[#f2ede4] dark:bg-[#0d1117] text-[#78716c] dark:text-[#8b949e] border border-[#e7e3da] dark:border-[#30363d] hover:border-slate-400'
                }`}
              >
                workerpool
              </button>
            </div>
          </div>

          {/* Play/Pause/Reset */}
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-[#44403c] dark:text-[#c9d1d9]">Simulation</span>
              <span className="font-mono text-[#78716c] dark:text-[#8b949e] font-semibold">
                {running ? 'running' : 'paused'}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => setRunning((r) => !r)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-mono rounded transition-colors ${
                  running
                    ? 'bg-amber-500 text-white font-semibold'
                    : 'bg-emerald-600 text-white font-semibold'
                }`}
              >
                {running ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {running ? 'Pause' : 'Play'}
              </button>
              <button
                onClick={reset}
                className="px-3 py-1.5 text-xs font-mono rounded bg-[#f2ede4] dark:bg-[#0d1117] text-[#78716c] dark:text-[#8b949e] border border-[#e7e3da] dark:border-[#30363d] hover:border-slate-400 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">/health p50</div>
            <div className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
              healthP50 > 10 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {(healthP50 * TICK_MS).toFixed(0)}<span className="text-xs font-normal text-[#a8a29e] dark:text-[#6e7681]"> ms</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">/health p99</div>
            <div className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
              healthP99 > 10 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {(healthP99 * TICK_MS).toFixed(0)}<span className="text-xs font-normal text-[#a8a29e] dark:text-[#6e7681]"> ms</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">Completed</div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1c1917] dark:text-[#f0f6fc] mt-0.5">
              {totalCompleted}<span className="text-xs font-normal text-[#a8a29e] dark:text-[#6e7681]"> reqs</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">Queue Depth</div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1c1917] dark:text-[#f0f6fc] mt-0.5">
              {strategy === 'workerpool'
                ? sim.jobChannel.length
                : sim.ps.reduce((sum, p) => sum + p.queue.length, 0)
              }<span className="text-xs font-normal text-[#a8a29e] dark:text-[#6e7681]"> waiting</span>
            </div>
          </div>
        </div>

        {/* P Row */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#78716c] dark:text-[#8b949e]">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-sky-500" />
              Logical Processors (P) — GOMAXPROCS={gomaxprocs}
            </span>
            <span className="text-[10px]">
              {strategy === 'workerpool' ? 'only /health runs here' : 'all goroutines compete here'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {sim.ps.map((p) => (
              <div
                key={p.id}
                className={`p-3 rounded-lg border transition-all ${
                  p.current
                    ? 'border-sky-400 dark:border-sky-700/60 bg-sky-50/30 dark:bg-sky-950/20'
                    : 'border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee] dark:bg-[#0d1117]'
                }`}
              >
                {/* P header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-bold text-[#1c1917] dark:text-[#f0f6fc]">
                    P{p.id}
                  </span>
                  <span className={`text-[9px] font-mono ${p.current ? 'text-sky-500' : 'text-[#a8a29e] dark:text-[#6e7681]'}`}>
                    {p.current ? 'busy' : 'idle'}
                  </span>
                </div>
                {/* Current goroutine */}
                <div className="min-h-[28px] mb-2">
                  {p.current ? (
                    <GoroutineChip g={p.current} />
                  ) : (
                    <div className="text-[10px] font-mono text-[#a8a29e] dark:text-[#6e7681] italic">— idle —</div>
                  )}
                </div>
                {/* Queue */}
                <div className="space-y-1">
                  {p.queue.length > 0 ? (
                    <>
                      <div className="text-[9px] font-mono text-[#78716c] dark:text-[#8b949e]">
                        queue ({p.queue.length}):
                      </div>
                      {p.queue.slice(0, 4).map((g) => (
                        <GoroutineChip key={g.id} g={g} compact />
                      ))}
                      {p.queue.length > 4 && (
                        <div className="text-[9px] font-mono text-[#78716c] dark:text-[#8b949e] pl-1">
                          +{p.queue.length - 4} more...
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-[9px] font-mono text-[#a8a29e] dark:text-[#6e7681]">queue empty</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worker Pool (only for workerpool strategy) */}
        {strategy === 'workerpool' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#78716c] dark:text-[#8b949e]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                Worker Pool — 4 goroutines drain job channel (cap 20)
              </span>
              <span className="text-[10px]">CPU-bound work isolated from Ps</span>
            </div>
            {/* Job channel */}
            <div className="p-2.5 rounded-lg border border-violet-200 dark:border-violet-900/60 bg-violet-50/30 dark:bg-violet-950/20">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-semibold text-violet-700 dark:text-violet-300">
                  job channel ({sim.jobChannel.length}/20)
                </span>
                <span className="text-[9px] font-mono text-[#78716c] dark:text-[#8b949e]">
                  buffered channel
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {sim.jobChannel.length === 0 ? (
                  <span className="text-[10px] font-mono text-[#a8a29e] dark:text-[#6e7681] italic">empty</span>
                ) : (
                  sim.jobChannel.slice(0, 15).map((g) => (
                    <div
                      key={g.id}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-mono bg-violet-100 dark:bg-violet-950/40 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-900/60"
                    >
                      <span className="w-1 h-1 rounded-full bg-violet-500" />
                      G{g.id}
                    </div>
                  ))
                )}
                {sim.jobChannel.length > 15 && (
                  <span className="text-[10px] font-mono text-[#78716c] dark:text-[#8b949e]">
                    +{sim.jobChannel.length - 15}
                  </span>
                )}
              </div>
            </div>
            {/* Worker cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sim.workers.map((w) => (
                <div
                  key={w.id}
                  className={`p-2.5 rounded-lg border transition-all ${
                    w.current
                      ? 'border-violet-400 dark:border-violet-700/60 bg-violet-50/30 dark:bg-violet-950/20'
                      : 'border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee] dark:bg-[#0d1117]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-violet-700 dark:text-violet-300">
                      Worker {w.id}
                    </span>
                    <span className={`text-[9px] font-mono ${w.current ? 'text-violet-500' : 'text-[#a8a29e] dark:text-[#6e7681]'}`}>
                      {w.current ? 'running' : 'idle'}
                    </span>
                  </div>
                  <div className="min-h-[24px]">
                    {w.current ? (
                      <GoroutineChip g={w.current} />
                    ) : (
                      <div className="text-[10px] font-mono text-[#a8a29e] dark:text-[#6e7681] italic">— idle —</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health Latency Chart */}
        {sim.healthLatencies.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-mono text-[#78716c] dark:text-[#8b949e]">
              /health Latency History (ms) — {sim.healthLatencies.length} samples
            </div>
            <div className="flex items-end gap-0.5 h-16">
              {sim.healthLatencies.slice(-30).map((lat, i) => {
                const heightPct = Math.min(100, (lat / Math.max(...sim.healthLatencies.slice(-30), 1)) * 100);
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm transition-all ${
                      lat > 10 ? 'bg-red-400 dark:bg-red-500/60' : 'bg-emerald-400 dark:bg-emerald-500/60'
                    }`}
                    style={{ height: `${heightPct}%` }}
                    title={`${(lat * TICK_MS).toFixed(0)}ms`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-[#a8a29e] dark:text-[#6e7681]">
              <span>oldest</span>
              <span className="text-emerald-500">≤10ms = healthy</span>
              <span>newest</span>
            </div>
          </div>
        )}

        {/* Legend / Explainer */}
        <div className="p-3.5 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d] text-xs leading-relaxed text-[#44403c] dark:text-[#c9d1d9] space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500" /> compute goroutine
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> /health goroutine
            </span>
            {strategy === 'workerpool' && (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-violet-500" /> worker pool channel
              </span>
            )}
          </div>
          <div>
            {gomaxprocs === 1 && strategy === 'goroutine' && (
              <span>
                <strong className="text-red-600 dark:text-red-400">Starvation mode:</strong> GOMAXPROCS=1 means one P.
                Every compute goroutine blocks the P for 100ms. The /health goroutine waits in the queue behind
                all of them. Watch the latency chart turn red.
              </span>
            )}
            {gomaxprocs > 1 && strategy === 'goroutine' && (
              <span>
                <strong className="text-sky-600 dark:text-sky-400">Parallel mode:</strong> {gomaxprocs} Ps share the load.
                Work stealing distributes goroutines across Ps. /health usually finds a free P — unless all are busy.
              </span>
            )}
            {strategy === 'workerpool' && (
              <span>
                <strong className="text-emerald-600 dark:text-emerald-400">Isolated mode:</strong> Compute work goes
                to the worker pool, not the Ps. The Ps stay free for /health. Watch the latency chart stay green
                regardless of GOMAXPROCS.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
