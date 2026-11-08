import React, { useState } from 'react';
import { Sliders, Activity, Clock, Cpu, CheckCircle2 } from 'lucide-react';

export const NodeThreadpoolVisualizer: React.FC = () => {
  const [threadpoolSize, setThreadpoolSize] = useState<number>(4);
  const [jobCount, setJobCount] = useState<number>(8);
  const [perJobTimeMs, setPerJobTimeMs] = useState<number>(250);

  // Batches calculation
  const batches = Math.ceil(jobCount / threadpoolSize);
  const totalDuration = batches * perJobTimeMs;

  // Generate job cards
  const jobs = Array.from({ length: jobCount }, (_, i) => {
    const jobNum = i + 1;
    const batchIndex = Math.floor(i / threadpoolSize);
    const assignedThread = (i % threadpoolSize) + 1;
    const waitTime = batchIndex * perJobTimeMs;
    const finishTime = waitTime + perJobTimeMs;
    return {
      id: jobNum,
      batch: batchIndex + 1,
      thread: assignedThread,
      waitTime,
      finishTime
    };
  });

  return (
    <div className="my-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee] dark:bg-[#0d1117]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
          <Activity className="w-4 h-4 text-sky-500" />
          <span>Interactive libuv Thread Pool Simulation: Job Dispatch & Queueing</span>
        </div>
        <span className="text-[11px] font-mono text-[#78716c] dark:text-[#8b949e]">
          UV_THREADPOOL_SIZE={threadpoolSize}
        </span>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Sliders & Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-[#e7e3da] dark:border-[#30363d]">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-[#44403c] dark:text-[#c9d1d9]">UV_THREADPOOL_SIZE</span>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold">
                {threadpoolSize} worker threads
              </span>
            </div>
            <div className="flex gap-2">
              {[2, 4, 8, 16].map((size) => (
                <button
                  key={size}
                  onClick={() => setThreadpoolSize(size)}
                  className={`flex-1 py-1 text-xs font-mono rounded transition-colors ${
                    threadpoolSize === size
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'bg-[#f2ede4] dark:bg-[#0d1117] text-[#78716c] dark:text-[#8b949e] border border-[#e7e3da] dark:border-[#30363d]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-[#44403c] dark:text-[#c9d1d9]">Total Crypto Jobs</span>
              <span className="font-mono text-[#78716c] dark:text-[#8b949e] font-semibold">
                {jobCount} jobs
              </span>
            </div>
            <div className="flex gap-2">
              {[4, 8, 12, 16].map((count) => (
                <button
                  key={count}
                  onClick={() => setJobCount(count)}
                  className={`flex-1 py-1 text-xs font-mono rounded transition-colors ${
                    jobCount === count
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'bg-[#f2ede4] dark:bg-[#0d1117] text-[#78716c] dark:text-[#8b949e] border border-[#e7e3da] dark:border-[#30363d]'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <span className="text-[#44403c] dark:text-[#c9d1d9]">Job Compute Time</span>
              <span className="font-mono text-[#78716c] dark:text-[#8b949e] font-semibold">
                {perJobTimeMs} ms
              </span>
            </div>
            <input
              type="range"
              min={100}
              max={500}
              step={50}
              value={perJobTimeMs}
              onChange={(e) => setPerJobTimeMs(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer mt-1"
            />
          </div>
        </div>

        {/* Telemetry Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
              Concurrent Capacity
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1c1917] dark:text-[#f0f6fc] mt-0.5">
              {threadpoolSize} <span className="text-xs font-normal text-[#a8a29e] dark:text-[#6e7681]">threads</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
              Execution Waves
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-0.5">
              {batches} <span className="text-xs font-normal text-[#a8a29e] dark:text-[#6e7681]">batches</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
              Queue Wait (Max)
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1c1917] dark:text-[#f0f6fc] mt-0.5">
              {((batches - 1) * perJobTimeMs).toFixed(0)} <span className="text-xs font-normal">ms</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
              Total Wall Clock Time
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#1c1917] dark:text-[#f0f6fc] mt-0.5">
              {totalDuration.toFixed(0)} <span className="text-xs font-normal">ms</span>
            </div>
          </div>
        </div>

        {/* Dispatch Timeline Visualizer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#78716c] dark:text-[#8b949e]">
            <span>libuv Worker Thread Dispatch & Queue Schedule</span>
            <span>Batch 1 (t=0) vs. Queued Batches</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {jobs.map((job) => {
              const isQueued = job.waitTime > 0;
              return (
                <div
                  key={job.id}
                  className={`p-3 rounded-lg border text-xs font-mono space-y-1 transition-all ${
                    isQueued
                      ? 'bg-[#f7f4ee] dark:bg-[#0d1117] border-[#e7e3da] dark:border-[#30363d] opacity-90'
                      : 'bg-[#ffffff] dark:bg-[#1c2128] border-sky-400 dark:border-sky-700/60 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#1c1917] dark:text-[#f0f6fc]">
                      Job #{job.id}
                    </span>
                    <span
                      className={`text-[10px] px-1 rounded ${
                        isQueued
                          ? 'text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/30'
                          : 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/30'
                      }`}
                    >
                      Batch {job.batch}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#78716c] dark:text-[#8b949e]">
                    Thread: <strong>uv_worker_{job.thread}</strong>
                  </div>
                  <div className="text-[10px] text-[#a8a29e] dark:text-[#6e7681]">
                    Wait: {job.waitTime}ms · Done: {job.finishTime}ms
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d] text-xs leading-relaxed text-[#44403c] dark:text-[#c9d1d9]">
          {batches > 1 ? (
            <span>
              <strong>Thread Pool Saturation in effect:</strong> Because {jobCount} jobs were submitted to a pool of {threadpoolSize} threads, the first {threadpoolSize} jobs claim all worker threads immediately. Jobs {threadpoolSize + 1} through {jobCount} sit waiting in libuv&apos;s internal FIFO queue for {perJobTimeMs}ms before a worker is released.
            </span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              Optimal thread capacity: All {jobCount} jobs fit within the active {threadpoolSize} threads, executing simultaneously with 0ms queue delay.
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
