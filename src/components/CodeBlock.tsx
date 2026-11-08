import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  filename,
  showLineNumbers = true
}) => {
  const [copied, setCopied] = useState(false);

  const cleanCode = code.trim();
  const lines = cleanCode.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="my-6 rounded-lg overflow-hidden border border-[#e7e3da] dark:border-[#30363d] bg-[#fdfdfc] dark:bg-[#0e1319] text-[#1c1917] dark:text-[#e6edf3] font-mono text-xs sm:text-[13px] leading-relaxed shadow-xs">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#e7e3da] dark:border-[#30363d] bg-[#f7f4ee] dark:bg-[#161b22]">
        <div className="flex items-center gap-2 text-[#78716c] dark:text-[#8b949e]">
          <Terminal className="w-3.5 h-3.5" />
          <span className="font-semibold text-xs tracking-wide">
            {filename || language.toUpperCase()}
          </span>
          {filename && (
            <span className="text-[11px] opacity-75 font-normal">
              ({language})
            </span>
          )}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-[#78716c] dark:text-[#8b949e] hover:text-[#1c1917] dark:hover:text-[#f0f6fc] hover:bg-[#e7e3da] dark:hover:bg-[#21262d] rounded transition-colors"
          title="Copy code to clipboard"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code contents with line numbers */}
      <div className="overflow-x-auto p-4">
        <pre className="flex">
          {showLineNumbers && (
            <div
              className="select-none text-right pr-4 text-[#a8a29e] dark:text-[#484f58] border-r border-[#e7e3da] dark:border-[#21262d] mr-4 shrink-0 font-mono text-xs"
              aria-hidden="true"
            >
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          )}
          <code className="block flex-1 whitespace-pre font-mono text-[#24292f] dark:text-[#e6edf3]">
            {lines.map((line, i) => (
              <div key={i} className="min-h-[1.5em]">
                {renderSyntaxLine(line, language)}
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

// Lightweight syntax renderer for common keywords & comments
function renderSyntaxLine(line: string, language: string): React.ReactNode {
  // Comments
  if (line.trim().startsWith('//') || line.trim().startsWith('#')) {
    return <span className="text-[#656d76] dark:text-[#8b949e] italic">{line}</span>;
  }

  // Simple token regex highlighting keywords, strings, types, and numbers
  const tokens = line.split(/(\b(?:func|type|struct|impl|fn|pub|let|mut|const|return|if|else|switch|case|package|import|for|range|select|default|defer|go|var|interface|class|public|private|protected|static|throw|catch|try)\b|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b\d+\b|\b(?:int64|int32|int|i32|i64|u32|u64|float64|bool|string|time\.Duration|Queue|Task|Vec|Option|Result|Error)\b)/g);

  return tokens.map((token, index) => {
    if (!token) return null;

    if (
      /^(func|type|struct|impl|fn|pub|let|mut|const|return|if|else|switch|case|package|import|for|range|select|default|defer|go|var|interface|class|public|private|protected|static|throw|catch|try)$/.test(
        token
      )
    ) {
      return (
        <span key={index} className="text-[#cf222e] dark:text-[#ff7b72] font-semibold">
          {token}
        </span>
      );
    }

    if (
      /^(int64|int32|int|i32|i64|u32|u64|float64|bool|string|time\.Duration|Queue|Task|Vec|Option|Result|Error)$/.test(
        token
      )
    ) {
      return (
        <span key={index} className="text-[#0550ae] dark:text-[#79c0ff]">
          {token}
        </span>
      );
    }

    if (token.startsWith('"') || token.startsWith("'")) {
      return (
        <span key={index} className="text-[#0a3069] dark:text-[#a5d6ff]">
          {token}
        </span>
      );
    }

    if (/^\d+$/.test(token)) {
      return (
        <span key={index} className="text-[#953800] dark:text-[#d2a8ff]">
          {token}
        </span>
      );
    }

    return token;
  });
}
