import React, { useState, useId } from 'react';
import { Sliders, Activity, Zap, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ExperimentVisualizerProps {
  type: 'queue-backpressure' | 'grpc-multiplex' | 'cache-invalidation';
}

export const ExperimentVisualizer: React.FC<ExperimentVisualizerProps> = ({ type }) => {
  if (type === 'queue-backpressure') {
    return <QueueBackpressureVisualizer />;
  }
  if (type === 'grpc-multiplex') {
    return <GrpcMultiplexVisualizer />;
  }
  return <CacheStampedeVisualizer />;
};

/* ------------------------------------------------------------------ */
/* 1. Queue Backpressure & Bufferbloat Simulation                      */
/* ------------------------------------------------------------------ */
function QueueBackpressureVisualizer() {
  const [arrivalRate, setArrivalRate] = useState(2400); // rps
  const [serviceRate, setServiceRate] = useState(1200); // rps
  const [queueLimit, setQueueLimit] = useState(400); // capacity
  const [strategy, setStrategy] = useState<'drop-tail' | 'drop-head' | 'codel'>('codel');
  const arrivalInputId = useId();
  const serviceInputId = useId();
  const queueLimitInputId = useId();

  // Theoretical dynamics based on M/M/1 queuing & Little's Law
  const isOverloaded = arrivalRate > serviceRate;
  const queueDepth = isOverloaded ? queueLimit : Math.round((arrivalRate / (serviceRate - arrivalRate + 0.001)) * 5);
  const effectiveQueue = Math.min(queueLimit, Math.max(0, queueDepth));

  // Sojourn wait time in queue (Little's Law: W = L / mu)
  const waitTimeMs = (effectiveQueue / serviceRate) * 1000;
  const clientTimeoutMs = 150; // SLA boundary

  // Tail metrics based on strategy
  let p50Latency = 1.2;
  let p99Latency = 3.5;
  let dropRatePct = 0;
  let deadlineBreachPct = 0;

  if (isOverloaded) {
    const excessRps = arrivalRate - serviceRate;
    dropRatePct = Math.min(100, Math.round((excessRps / arrivalRate) * 100));

    if (strategy === 'drop-tail') {
      // Old items wait full buffer duration; newly arriving items dropped
      p50Latency = waitTimeMs * 0.7;
      p99Latency = waitTimeMs * 1.4;
      deadlineBreachPct = waitTimeMs > clientTimeoutMs ? 86 : 14;
    } else if (strategy === 'drop-head') {
      // Head evicted; newest admitted items served quickly
      p50Latency = 4.2;
      p99Latency = 16.8;
      deadlineBreachPct = 1.2;
    } else {
      // CoDel: controlled delay sheds work early when sojourn > 15ms
      p50Latency = 2.8;
      p99Latency = 12.4;
      deadlineBreachPct = 0.4;
    }
  }

  return (
    <div className="my-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee] dark:bg-[#0d1117]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
          <Activity className="w-4 h-4 text-sky-500" />
          <span>Interactive Test Harness: Queue Dynamics & Drop Policy</span>
        </div>
        <span className="text-[11px] font-mono text-[#78716c] dark:text-[#8b949e]">
          Little&apos;s Law: L = λW
        </span>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <label htmlFor={arrivalInputId} className="text-[#44403c] dark:text-[#c9d1d9]">Ingress Arrival Rate (λ)</label>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold tabular-nums">
                {arrivalRate.toLocaleString()} rps
              </span>
            </div>
            <input
              id={arrivalInputId}
              type="range"
              min={600}
              max={3600}
              step={100}
              value={arrivalRate}
              onChange={(e) => setArrivalRate(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <label htmlFor={serviceInputId} className="text-[#44403c] dark:text-[#c9d1d9]">Worker Service Capacity (μ)</label>
              <span className="font-mono text-[#78716c] dark:text-[#8b949e] font-semibold tabular-nums">
                {serviceRate.toLocaleString()} rps
              </span>
            </div>
            <input
              id={serviceInputId}
              type="range"
              min={600}
              max={2400}
              step={100}
              value={serviceRate}
              onChange={(e) => setServiceRate(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <label htmlFor={queueLimitInputId} className="text-[#44403c] dark:text-[#c9d1d9]">Queue Capacity Bound</label>
              <span className="font-mono text-[#78716c] dark:text-[#8b949e] font-semibold tabular-nums">
                {queueLimit} slots
              </span>
            </div>
            <input
              id={queueLimitInputId}
              type="range"
              min={50}
              max={1000}
              step={50}
              value={queueLimit}
              onChange={(e) => setQueueLimit(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* Strategy segmented buttons */}
          <div>
            <div className="text-xs font-medium text-[#44403c] dark:text-[#c9d1d9] mb-1.5">
              Queue Drop Policy
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#f2ede4] dark:bg-[#0d1117] rounded-lg border border-[#e7e3da] dark:border-[#30363d]">
              <button
                onClick={() => setStrategy('drop-tail')}
                className={`py-1.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                  strategy === 'drop-tail'
                    ? 'bg-[#ffffff] dark:bg-[#21262d] text-[#1c1917] dark:text-[#f0f6fc] shadow-xs'
                    : 'text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917]'
                }`}
              >
                Drop-Tail
              </button>
              <button
                onClick={() => setStrategy('drop-head')}
                className={`py-1.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                  strategy === 'drop-head'
                    ? 'bg-[#ffffff] dark:bg-[#21262d] text-[#1c1917] dark:text-[#f0f6fc] shadow-xs'
                    : 'text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917]'
                }`}
              >
                Drop-Head
              </button>
              <button
                onClick={() => setStrategy('codel')}
                className={`py-1.5 text-[11px] font-medium rounded transition-colors whitespace-nowrap ${
                  strategy === 'codel'
                    ? 'bg-[#ffffff] dark:bg-[#21262d] text-[#1c1917] dark:text-[#f0f6fc] shadow-xs'
                    : 'text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917]'
                }`}
              >
                CoDel
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Telemetry Cards (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
              <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
                Queue Depth
              </div>
              <div className="text-lg font-bold font-mono tabular-nums text-[#1c1917] dark:text-[#f0f6fc] mt-0.5">
                {effectiveQueue}
                <span className="text-xs font-normal text-[#a8a29e] dark:text-[#6e7681]"> / {queueLimit}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
              <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
                Sojourn Delay
              </div>
              <div
                className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                  waitTimeMs > 100 ? 'text-rose-500' : 'text-sky-600 dark:text-sky-400'
                }`}
              >
                {waitTimeMs.toFixed(1)}ms
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
              <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
                p99 Latency
              </div>
              <div
                className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                  p99Latency > 100 ? 'text-rose-500' : 'text-[#1c1917] dark:text-[#f0f6fc]'
                }`}
              >
                {p99Latency.toFixed(1)}ms
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
              <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
                Timeout Rate
              </div>
              <div
                className={`text-lg font-bold font-mono tabular-nums mt-0.5 ${
                  deadlineBreachPct > 10 ? 'text-rose-500' : 'text-emerald-500'
                }`}
              >
                {deadlineBreachPct}%
              </div>
            </div>
          </div>

          {/* SVG Buffer Visualizer */}
          <div className="p-3.5 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
            <div className="flex items-center justify-between text-xs font-mono text-[#78716c] dark:text-[#8b949e] mb-2">
              <span>Memory Queue Buffer Fill Rate</span>
              <span>{Math.round((effectiveQueue / queueLimit) * 100)}% Occupied</span>
            </div>
            <div className="w-full bg-[#e7e3da] dark:bg-[#21262d] h-4 rounded-full overflow-hidden flex">
              <div
                className={`transition-all duration-200 ${
                  effectiveQueue / queueLimit > 0.8
                    ? 'bg-rose-500'
                    : effectiveQueue / queueLimit > 0.5
                    ? 'bg-amber-500'
                    : 'bg-sky-500'
                }`}
                style={{ width: `${(effectiveQueue / queueLimit) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#78716c] dark:text-[#8b949e] mt-2">
              <span>Arrival: {arrivalRate} rps</span>
              <span>Shed / Drop: {dropRatePct}%</span>
              <span>Service: {serviceRate} rps</span>
            </div>
          </div>

          <div className="text-xs text-[#78716c] dark:text-[#8b949e] leading-relaxed">
            {strategy === 'drop-tail' && (
              <span className="text-rose-600 dark:text-rose-400">
                Warning: Drop-tail keeps expired requests waiting in the queue, exhausting client timeouts before execution starts.
              </span>
            )}
            {strategy === 'drop-head' && (
              <span className="text-sky-600 dark:text-sky-400">
                Drop-head evicts stale entries from the head, ensuring executed requests are always fresh and within deadline.
              </span>
            )}
            {strategy === 'codel' && (
              <span className="text-emerald-600 dark:text-emerald-400">
                Controlled Delay (CoDel) tracks sojourn time windowing, preventing bufferbloat while minimizing packet drops during brief bursts.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. gRPC HTTP/2 Flow Control Multiplexing Visualizer                 */
/* ------------------------------------------------------------------ */
function GrpcMultiplexVisualizer() {
  const [rttMs, setRttMs] = useState(35); // ms
  const [windowSizeKb, setWindowSizeKb] = useState(64); // KB
  const [lossRatePct, setLossRatePct] = useState(0.5); // %
  const rttInputId = useId();
  const windowInputId = useId();
  const lossInputId = useId();

  // Max throughput = Window Size / RTT
  const windowBytes = windowSizeKb * 1024;
  const rttSeconds = rttMs / 1000;
  const maxThroughputBps = windowBytes / rttSeconds;
  const maxThroughputMbps = (maxThroughputBps * 8) / (1024 * 1024);

  // Unary RPC latency inflation due to TCP head-of-line blocking on loss
  const unaryBaseMs = 2.0;
  const holBlockingMs = lossRatePct > 0 ? (rttMs * 2.5 * lossRatePct).toFixed(1) : '0.0';
  const unaryP99 = (unaryBaseMs + parseFloat(holBlockingMs)).toFixed(1);

  return (
    <div className="my-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee] dark:bg-[#0d1117]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
          <Zap className="w-4 h-4 text-sky-500" />
          <span>Interactive Test Harness: HTTP/2 Stream Window Bandwidth-Delay Product</span>
        </div>
        <span className="text-[11px] font-mono text-[#78716c] dark:text-[#8b949e]">
          BDP = Bandwidth × Delay
        </span>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <label htmlFor={rttInputId} className="text-[#44403c] dark:text-[#c9d1d9]">Network Round-Trip Time (RTT)</label>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold tabular-nums">
                {rttMs} ms
              </span>
            </div>
            <input
              id={rttInputId}
              type="range"
              min={1}
              max={100}
              step={1}
              value={rttMs}
              onChange={(e) => setRttMs(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <label htmlFor={windowInputId} className="text-[#44403c] dark:text-[#c9d1d9]">HTTP/2 Stream Window Size</label>
              <span className="font-mono text-[#78716c] dark:text-[#8b949e] font-semibold tabular-nums">
                {windowSizeKb >= 1024 ? `${(windowSizeKb / 1024).toFixed(1)} MB` : `${windowSizeKb} KB`}
              </span>
            </div>
            <input
              id={windowInputId}
              type="range"
              min={16}
              max={2048}
              step={16}
              value={windowSizeKb}
              onChange={(e) => setWindowSizeKb(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <label htmlFor={lossInputId} className="text-[#44403c] dark:text-[#c9d1d9]">TCP Packet Loss Rate</label>
              <span className="font-mono text-[#78716c] dark:text-[#8b949e] font-semibold tabular-nums">
                {lossRatePct.toFixed(1)}%
              </span>
            </div>
            <input
              id={lossInputId}
              type="range"
              min={0}
              max={3}
              step={0.1}
              value={lossRatePct}
              onChange={(e) => setLossRatePct(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
              <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
                Max Stream Throughput
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-0.5">
                {maxThroughputMbps.toFixed(1)} <span className="text-xs font-normal">Mbps</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
              <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
                Unary p99 Latency
              </div>
              <div
                className={`text-xl font-bold font-mono tabular-nums mt-0.5 ${
                  parseFloat(unaryP99) > 20 ? 'text-rose-500' : 'text-[#1c1917] dark:text-[#f0f6fc]'
                }`}
              >
                {unaryP99} <span className="text-xs font-normal">ms</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
              <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
                TCP HoL Delay
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-[#1c1917] dark:text-[#f0f6fc] mt-0.5">
                +{holBlockingMs} <span className="text-xs font-normal">ms</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d] text-xs leading-relaxed text-[#44403c] dark:text-[#c9d1d9]">
            {windowSizeKb <= 64 && rttMs >= 30 ? (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Default 64KB window limits throughput to only {maxThroughputMbps.toFixed(1)} Mbps over {rttMs}ms RTT due to sender stalls waiting for WINDOW_UPDATE round-trips.
              </span>
            ) : (
              <span>
                Configured window capacity accommodates high bandwidth-delay products. However, packet loss on the shared TCP connection continues to block concurrent unary calls until retransmission completes.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Cache Stampede & XFetch Visualizer                               */
/* ------------------------------------------------------------------ */
function CacheStampedeVisualizer() {
  const [ttlSec, setTtlSec] = useState(60);
  const [deltaMs, setDeltaMs] = useState(120); // computation time
  const [beta, setBeta] = useState(1.0); // aggressiveness
  const ttlInputId = useId();
  const deltaInputId = useId();
  const betaInputId = useId();

  // XFetch early recomputation window: -beta * delta * ln(U)
  const earlyWindowSec = ((beta * deltaMs) / 1000) * 2.3; // representative 90th percentile
  const stampedeRiskPct = beta < 0.5 ? 68 : beta < 1.0 ? 12 : 0.5;

  return (
    <div className="my-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee] dark:bg-[#0d1117]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
          <ShieldAlert className="w-4 h-4 text-sky-500" />
          <span>Interactive Test Harness: Probabilistic Early Expiration (XFetch)</span>
        </div>
        <span className="text-[11px] font-mono text-[#78716c] dark:text-[#8b949e]">
          XFetch: -β × δ × ln(rand())
        </span>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <label htmlFor={ttlInputId} className="text-[#44403c] dark:text-[#c9d1d9]">Cache TTL</label>
              <span className="font-mono text-[#78716c] dark:text-[#8b949e] font-semibold tabular-nums">
                {ttlSec} seconds
              </span>
            </div>
            <input
              id={ttlInputId}
              type="range"
              min={15}
              max={180}
              step={5}
              value={ttlSec}
              onChange={(e) => setTtlSec(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <label htmlFor={deltaInputId} className="text-[#44403c] dark:text-[#c9d1d9]">Recomputation Cost (δ)</label>
              <span className="font-mono text-[#78716c] dark:text-[#8b949e] font-semibold tabular-nums">
                {deltaMs} ms
              </span>
            </div>
            <input
              id={deltaInputId}
              type="range"
              min={20}
              max={500}
              step={20}
              value={deltaMs}
              onChange={(e) => setDeltaMs(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium mb-1">
              <label htmlFor={betaInputId} className="text-[#44403c] dark:text-[#c9d1d9]">XFetch Beta Factor (β)</label>
              <span className="font-mono text-sky-600 dark:text-sky-400 font-semibold tabular-nums">
                {beta.toFixed(1)}
              </span>
            </div>
            <input
              id={betaInputId}
              type="range"
              min={0.2}
              max={2.5}
              step={0.1}
              value={beta}
              onChange={(e) => setBeta(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
              <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
                Early Refresh Window
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-sky-600 dark:text-sky-400 mt-0.5">
                {earlyWindowSec.toFixed(2)}s <span className="text-xs font-normal">prior</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
              <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
                Stampede Risk
              </div>
              <div
                className={`text-xl font-bold font-mono tabular-nums mt-0.5 ${
                  stampedeRiskPct > 20 ? 'text-rose-500' : 'text-emerald-500'
                }`}
              >
                {stampedeRiskPct}%
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d]">
              <div className="text-[10px] uppercase font-mono text-[#78716c] dark:text-[#8b949e]">
                DB Hit Reduction
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-emerald-500 mt-0.5">
                {(100 - stampedeRiskPct).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d] text-xs leading-relaxed text-[#44403c] dark:text-[#c9d1d9]">
            {beta >= 1.0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Optimal protection: With β = {beta.toFixed(1)}, cache values are recomputed in the background {earlyWindowSec.toFixed(2)}s before TTL expiration. Read callers experience zero stampede spikes.
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                Low beta setting increases likelihood that all callers hit an expired cache simultaneously, triggering thousands of concurrent database queries.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
