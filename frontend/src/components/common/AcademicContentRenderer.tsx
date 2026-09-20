import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface AcademicContentRendererProps {
  content: string;
  className?: string;
  compact?: boolean;
}

function preprocessLatex(raw: string): string {
  if (!raw) return '';
  // Normalize display math \[ ... \] to $$ ... $$
  let processed = raw.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$1$$$');
  // Normalize inline math \( ... \) to $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$');
  return processed;
}

/**
 * Universal Academic Content & Mathematical Notation Renderer.
 * Correctly renders:
 * - Mathematical notation (inline `$F = ma$` and block `$$\int ...$$`) via KaTeX
 * - Standard Markdown (headings, lists, bold, italics, links)
 * - Academic tables and structured matrices
 * - Fenced code blocks and algorithmic pseudo-code
 * - Socratic blockquotes and scholarly callouts
 */
export const AcademicContentRenderer: React.FC<AcademicContentRendererProps> = ({
  content,
  className = '',
  compact = false,
}) => {
  if (!content) return null;

  const processedContent = preprocessLatex(content);

  return (
    <div className={`academic-content-renderer ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ node, ...props }) => (
            <h1
              className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-6 mb-3 pb-2 border-b border-nexora-border/60"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-5 mb-2.5 pb-1.5 border-b border-nexora-border/40"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-lg sm:text-xl font-semibold text-white mt-4 mb-2"
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4
              className="text-base font-semibold text-indigo-300 mt-3 mb-1.5"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p
              className={`${
                compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
              } text-nexora-subtext leading-relaxed my-2`}
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-outside pl-5 space-y-1.5 my-3 text-nexora-subtext text-sm sm:text-base" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-outside pl-5 space-y-1.5 my-3 text-nexora-subtext text-sm sm:text-base" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-nexora-primary bg-nexora-elevated/40 pl-4 py-2 my-4 rounded-r-xl italic text-nexora-subtext text-sm"
              {...props}
            />
          ),
          code: ({ node, inline, className: codeClass, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-nexora-elevated border border-nexora-border/70 font-mono text-xs sm:text-sm text-cyan-300 font-semibold"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <pre className="p-4 rounded-xl bg-nexora-bg/95 border border-nexora-border/80 font-mono text-xs sm:text-sm text-emerald-300 overflow-x-auto my-4 shadow-inner">
                <code {...props}>{children}</code>
              </pre>
            );
          },
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-nexora-border/70">
              <table className="min-w-full divide-y divide-nexora-border text-left text-xs sm:text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-nexora-elevated text-white font-semibold" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-nexora-border/50 bg-nexora-surface/60" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-nexora-elevated/40 transition-colors" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-3 font-semibold text-white tracking-wider" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-2.5 text-nexora-subtext" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-6 border-nexora-border/60" {...props} />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
