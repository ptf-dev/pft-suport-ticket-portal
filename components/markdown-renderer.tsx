'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className={`prose prose-sm dark:prose-invert max-w-none ${className}`}
      components={{
        // Headings
        h1: ({ node, ...props }) => (
          <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900 dark:text-white" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900 dark:text-white" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-lg font-bold mt-4 mb-2 text-gray-900 dark:text-white" {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className="text-base font-bold mt-3 mb-2 text-gray-900 dark:text-white" {...props} />
        ),
        h5: ({ node, ...props }) => (
          <h5 className="text-sm font-bold mt-2 mb-1 text-gray-900 dark:text-white" {...props} />
        ),
        h6: ({ node, ...props }) => (
          <h6 className="text-xs font-bold mt-2 mb-1 text-gray-900 dark:text-white" {...props} />
        ),
        
        // Paragraphs
        p: ({ node, ...props }) => (
          <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed" {...props} />
        ),
        
        // Lists
        ul: ({ node, ...props }) => (
          <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300" {...props} />
        ),
        li: ({ node, ...props }) => (
          <li className="ml-4" {...props} />
        ),
        
        // Links
        a: ({ node, ...props }) => (
          <a
            className="text-blue-600 dark:text-blue-400 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),
        
        // Code
        code: ({ node, className, children, ...props }: any) => {
          // react-markdown v9 removed the `inline` prop. Block code carries a
          // `language-*` className or spans multiple lines; everything else is inline.
          const isBlock =
            /^language-/.test(className || '') || /\n/.test(String(children))
          return isBlock ? (
            <code
              className="block p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm overflow-x-auto mb-4"
              {...props}
            >
              {children}
            </code>
          ) : (
            <code
              className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
              {...props}
            >
              {children}
            </code>
          )
        },
        
        // Pre (code blocks)
        pre: ({ node, ...props }) => (
          <pre className="mb-4 overflow-x-auto" {...props} />
        ),
        
        // Blockquotes
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 mb-4 italic text-gray-600 dark:text-gray-400"
            {...props}
          />
        ),
        
        // Tables
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto mb-4">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => (
          <thead className="bg-gray-50 dark:bg-gray-800" {...props} />
        ),
        tbody: ({ node, ...props }) => (
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700" {...props} />
        ),
        tr: ({ node, ...props }) => (
          <tr {...props} />
        ),
        th: ({ node, ...props }) => (
          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" {...props} />
        ),
        td: ({ node, ...props }) => (
          <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300" {...props} />
        ),
        
        // Horizontal rule
        hr: ({ node, ...props }) => (
          <hr className="my-6 border-gray-200 dark:border-gray-700" {...props} />
        ),
        
        // Strong/Bold
        strong: ({ node, ...props }) => (
          <strong className="font-bold text-gray-900 dark:text-white" {...props} />
        ),
        
        // Emphasis/Italic
        em: ({ node, ...props }) => (
          <em className="italic" {...props} />
        ),
        
        // Strikethrough
        del: ({ node, ...props }) => (
          <del className="line-through text-gray-500 dark:text-gray-400" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
