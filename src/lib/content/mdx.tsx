import React from 'react';
import { CodeBlock } from '../../components/CodeBlock';
import { Callout } from '../../components/Callout';
import { NodeProcessDiagram } from '../../components/NodeProcessDiagram';
import { NodeThreadpoolVisualizer } from '../../components/NodeThreadpoolVisualizer';

// Explicit Registry of allowed custom MDX components
export const MDX_COMPONENTS: Record<string, React.ComponentType<any>> = {
  NodeProcessDiagram,
  NodeThreadpoolVisualizer,
  ThreadPoolVisualizer: NodeThreadpoolVisualizer,
  Callout,
  CodeBlock,
  ExperimentResult: ({ title, children }: { title?: string; children: React.ReactNode }) => (
    <div className="my-6 p-4 rounded-lg border border-sky-200 dark:border-sky-900/60 bg-sky-50/40 dark:bg-sky-950/20 text-xs sm:text-sm">
      <div className="font-mono text-[11px] uppercase tracking-wider font-semibold text-sky-700 dark:text-sky-300 mb-1">
        {title || 'Empirical Finding'}
      </div>
      <div className="text-[#1c1917] dark:text-[#f0f6fc] leading-relaxed">{children}</div>
    </div>
  )
};

type Block =
  | { type: 'h1'; content: string; id: string }
  | { type: 'h2'; content: string; id: string }
  | { type: 'h3'; content: string; id: string }
  | { type: 'code'; language: string; content: string; filename?: string }
  | { type: 'blockquote'; content: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'list'; items: string[] }
  | { type: 'olist'; items: string[] }
  | { type: 'component'; name: string; props: Record<string, any> }
  | { type: 'p'; content: string };

export function MdxRenderer({ content }: { content: string }) {
  const blocks = parseMdxBlocks(content);

  return (
    <div className="space-y-6 text-[#24292f] dark:text-[#c9d1d9] text-[15px] sm:text-base leading-[1.8] font-normal">
      {blocks.map((block, idx) => {
        if (block.type === 'component') {
          const Comp = MDX_COMPONENTS[block.name];
          if (Comp) {
            return <Comp key={idx} {...block.props} />;
          }
          return null;
        }

        if (block.type === 'h1' || block.type === 'h2') {
          return (
            <h2
              key={idx}
              id={block.id}
              className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc] pt-8 pb-1 border-b border-[#e7e3da] dark:border-[#30363d] scroll-mt-24"
            >
              {block.content}
            </h2>
          );
        }

        if (block.type === 'h3') {
          return (
            <h3
              key={idx}
              id={block.id}
              className="text-xl font-bold tracking-tight text-[#1c1917] dark:text-[#f0f6fc] pt-4 scroll-mt-24"
            >
              {block.content}
            </h3>
          );
        }

        if (block.type === 'code') {
          return (
            <CodeBlock
              key={idx}
              code={block.content}
              language={block.language}
              filename={block.filename}
            />
          );
        }

        if (block.type === 'blockquote') {
          return (
            <Callout key={idx} type="principle" title="Architectural Takeaway">
              <p>{block.content}</p>
            </Callout>
          );
        }

        if (block.type === 'table') {
          return (
            <div
              key={idx}
              className="my-6 overflow-x-auto rounded-lg border border-[#e7e3da] dark:border-[#30363d]"
            >
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#f7f4ee] dark:bg-[#161b22] text-[#1c1917] dark:text-[#f0f6fc] border-b border-[#e7e3da] dark:border-[#30363d]">
                  <tr>
                    {block.headers.map((h, hIdx) => (
                      <th key={hIdx} className="p-3 font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e3da] dark:divide-[#30363d] font-mono text-xs">
                  {block.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-[#f2ede4]/50 dark:hover:bg-[#1c2128]/50"
                    >
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="p-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.type === 'list') {
          return (
            <ul
              key={idx}
              className="list-disc pl-5 space-y-2 text-[#44403c] dark:text-[#c9d1d9]"
            >
              {block.items.map((item, iIdx) => (
                <li key={iIdx}>{renderInlineMarkdown(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === 'olist') {
          return (
            <ol
              key={idx}
              className="list-decimal pl-5 space-y-2 text-[#44403c] dark:text-[#c9d1d9]"
            >
              {block.items.map((item, iIdx) => (
                <li key={iIdx}>{renderInlineMarkdown(item)}</li>
              ))}
            </ol>
          );
        }

        return (
          <p key={idx} className="leading-relaxed">
            {renderInlineMarkdown(block.content)}
          </p>
        );
      })}
    </div>
  );
}

// Inline formatting helper
function renderInlineMarkdown(text: string): React.ReactNode {
  // Regex for code, bold, italic, links, images
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|!\[[^\]]*\]\([^)]+\))/g);

  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 text-xs font-mono rounded bg-[#f2ede4] dark:bg-[#161b22] text-sky-700 dark:text-sky-300 border border-[#e7e3da] dark:border-[#30363d]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-[#1c1917] dark:text-[#f0f6fc]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('[') && part.includes('](')) {
      const match = part.match(/\[(.*?)\]\((.*?)\)/);
      if (match) {
        const [, label, url] = match;
        const isExternal = url.startsWith('http');
        return (
          <a
            key={index}
            href={url}
            target={isExternal ? '_blank' : undefined}
            rel={isExternal ? 'noreferrer' : undefined}
            className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
          >
            {label}
          </a>
        );
      }
    }
    return part;
  });
}

// Block parser handling MDX components & markdown blocks
function parseMdxBlocks(raw: string): Block[] {
  const blocks: Block[] = [];
  const lines = raw.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim() || line.trim() === '---') {
      i++;
      continue;
    }

    // Check for custom MDX Component tags: <NodeProcessDiagram />, <NodeThreadpoolVisualizer />, etc.
    const customComponentMatch = line.trim().match(/^<([A-Z][a-zA-Z0-9]+)\s*(\/?>|.*?>)/);
    if (customComponentMatch) {
      const componentName = customComponentMatch[1];
      blocks.push({
        type: 'component',
        name: componentName,
        props: {}
      });
      i++;
      continue;
    }

    // Fenced Code blocks
    if (line.trim().startsWith('```')) {
      const lang = line.trim().replace(/^```/, '').trim();
      let codeContent = '';
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeContent += lines[i] + '\n';
        i++;
      }
      i++;
      blocks.push({
        type: 'code',
        language: lang || 'text',
        content: codeContent
      });
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      const title = line.replace(/^#\s+/, '').trim();
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      blocks.push({ type: 'h1', content: title, id });
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      const title = line.replace(/^##\s+/, '').trim();
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      blocks.push({ type: 'h2', content: title, id });
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      const title = line.replace(/^###\s+/, '').trim();
      const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      blocks.push({ type: 'h3', content: title, id });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      let bqContent = line.replace(/^>\s*/, '');
      i++;
      while (i < lines.length && lines[i].startsWith('> ')) {
        bqContent += ' ' + lines[i].replace(/^>\s*/, '');
        i++;
      }
      blocks.push({ type: 'blockquote', content: bqContent });
      continue;
    }

    // Markdown Table
    if (line.startsWith('|') && line.endsWith('|')) {
      const headers = line
        .split('|')
        .slice(1, -1)
        .map((h) => h.trim());
      i++;
      if (i < lines.length && lines[i].includes('---')) {
        i++;
      }
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        const row = lines[i]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        rows.push(row);
        i++;
      }
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Lists
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, '').trim());
        i++;
      }
      blocks.push({ type: 'olist', items });
      continue;
    }

    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].replace(/^- /, '').trim());
        i++;
      }
      blocks.push({ type: 'list', items });
      continue;
    }

    // Paragraph
    let paragraph = line;
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('> ') &&
      !lines[i].startsWith('|') &&
      !lines[i].startsWith('- ') &&
      !lines[i].trim().startsWith('<') &&
      !/^\d+\.\s/.test(lines[i])
    ) {
      paragraph += ' ' + lines[i].trim();
      i++;
    }
    blocks.push({ type: 'p', content: paragraph });
  }

  return blocks;
}
