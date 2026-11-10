import React, { useEffect, useRef, useState } from 'react';

interface Props {
  chart: string;
}

export const MermaidDiagram: React.FC<Props> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    const render = async () => {
      try {
        const mermaid = (await import('mermaid')).default;

        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
          fontFamily: 'JetBrains Mono, monospace',
          themeVariables: {
            // Dark theme overrides to match site palette
            darkMode: document.documentElement.classList.contains('dark'),
            background: '#0d1117',
            primaryColor: '#1c2128',
            primaryTextColor: '#e6edf3',
            primaryBorderColor: '#30363d',
            lineColor: '#8b949e',
            secondaryColor: '#161b22',
            tertiaryColor: '#0d1117',
          },
        });

        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg: rendered } = await mermaid.render(id, chart.trim());

        if (!cancelled) setSvg(rendered);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    };

    render();
    return () => { cancelled = true; };
  }, [chart]);

  if (error) {
    return (
      <pre className="p-4 rounded bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-xs overflow-x-auto">
        {chart}
      </pre>
    );
  }

  if (!svg) {
    return (
      <div className="my-6 flex items-center justify-center h-24 rounded border border-[#e7e3da] dark:border-[#30363d] text-xs text-[#78716c] dark:text-[#8b949e]">
        Loading diagram…
      </div>
    );
  }

  return (
    <div
      className="my-6 overflow-x-auto rounded border border-[#e7e3da] dark:border-[#30363d] p-4 bg-[#fdfdfc] dark:bg-[#161b22]"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
};
