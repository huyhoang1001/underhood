import React, { useState } from 'react';
import { Network, Server, Database, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';

interface DiagramNode {
  id: string;
  label: string;
  sublabel: string;
  protocol: string;
  status: 'normal' | 'congested' | 'shedding';
  latency: string;
  notes: string;
}

export const ArchitectureDiagram: React.FC = () => {
  const [activeNodeId, setActiveNodeId] = useState<string>('gateway');

  const nodes: DiagramNode[] = [
    {
      id: 'ingress',
      label: 'Edge Ingress',
      sublabel: 'Cloudflare / Envoy Gateway',
      protocol: 'TLS 1.3 / HTTP/2',
      status: 'normal',
      latency: '0.8ms',
      notes: 'Monitors client request rate (50,000 rps) and enforces initial TLS handshakes.'
    },
    {
      id: 'gateway',
      label: 'API Gateway',
      sublabel: 'Authentication & Routing',
      protocol: 'gRPC Unary & Streaming',
      status: 'shedding',
      latency: '2.4ms',
      notes: 'Equipped with Adaptive Concurrency Limiter (Vegas). Detects queue gradient and sheds 12% of requests with gRPC ResourceExhausted.'
    },
    {
      id: 'worker',
      label: 'Order Processing Service',
      sublabel: 'Concurrent Worker Pool',
      protocol: 'gRPC Multiplexed Streams',
      status: 'congested',
      latency: '48.2ms',
      notes: 'Ring buffer bounded to 2,000 items. LIFO eviction active to prevent client deadline expiration.'
    },
    {
      id: 'storage',
      label: 'Transactional Database',
      sublabel: 'PostgreSQL Primary Cluster',
      protocol: 'TCP / Connection Pool (Hikari)',
      status: 'normal',
      latency: '6.1ms',
      notes: 'Connection pool fixed at 64 connections. Monitored for lock contention and query execution boundaries.'
    }
  ];

  const activeNode = nodes.find((n) => n.id === activeNodeId) || nodes[0];

  return (
    <div className="my-8 rounded-xl border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#161b22] overflow-hidden shadow-xs">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee] dark:bg-[#0d1117]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
          <Network className="w-4 h-4 text-sky-500" />
          <span>Interactive Architecture Topology: Overload & Pushback Flow</span>
        </div>
        <span className="text-[11px] text-[#78716c] dark:text-[#8b949e]">
          Click any component to inspect
        </span>
      </div>

      <div className="p-4 sm:p-6">
        {/* Topology nodes grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
          {nodes.map((node, idx) => {
            const isSelected = node.id === activeNodeId;
            return (
              <div
                key={node.id}
                onClick={() => setActiveNodeId(node.id)}
                className={`p-3.5 rounded-lg cursor-pointer transition-all border text-left flex flex-col justify-between min-h-[110px] ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/40 dark:bg-sky-950/20 ring-1 ring-sky-500'
                    : 'border-[#e7e3da] dark:border-[#30363d] bg-[#ffffff] dark:bg-[#1c2128] hover:border-slate-400 dark:hover:border-slate-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#78716c] dark:text-[#8b949e]">
                      Hop 0{idx + 1}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        node.status === 'shedding'
                          ? 'text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/30'
                          : node.status === 'congested'
                          ? 'text-rose-700 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-900/30'
                          : 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/30'
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
                    {node.label}
                  </h4>
                  <p className="text-[11px] text-[#78716c] dark:text-[#8b949e] line-clamp-1 mt-0.5">
                    {node.sublabel}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#e7e3da]/60 dark:border-[#30363d]/60 text-[10px] font-mono text-[#78716c] dark:text-[#8b949e]">
                  <span>{node.protocol}</span>
                  <span className="tabular-nums font-semibold text-sky-600 dark:text-sky-400">
                    {node.latency}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Inspector Drawer */}
        <div className="mt-4 p-4 rounded-lg bg-[#f7f4ee] dark:bg-[#0d1117] border border-[#e7e3da] dark:border-[#30363d] text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#e7e3da] dark:border-[#30363d]">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-500" />
              <span className="font-semibold text-sm text-[#1c1917] dark:text-[#f0f6fc]">
                {activeNode.label} Inspector
              </span>
              <span className="text-[#a8a29e] dark:text-[#6e7681]">·</span>
              <span className="font-mono text-[11px] text-[#78716c] dark:text-[#8b949e]">
                {activeNode.sublabel}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-[#78716c] dark:text-[#8b949e]">
                Protocol: <strong className="text-[#1c1917] dark:text-[#f0f6fc]">{activeNode.protocol}</strong>
              </span>
              <span className="text-[#78716c] dark:text-[#8b949e]">
                Latency: <strong className="text-sky-600 dark:text-sky-400 tabular-nums">{activeNode.latency}</strong>
              </span>
            </div>
          </div>
          <p className="text-[#44403c] dark:text-[#c9d1d9] leading-relaxed">
            {activeNode.notes}
          </p>
        </div>
      </div>
    </div>
  );
};
