'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { cn } from '@/lib/utils'

interface BlogMarkdownProps {
  content: string
}

export const BlogMarkdown = ({ content }: BlogMarkdownProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug, rehypeAutolinkHeadings]}
      components={{
        // Headings — skip H1 (rendered in article header)
        h1: ({ children }) => (
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-10 mb-4">
            {children}
          </h2>
        ),
        h2: ({ children }) => (
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-10 mb-4 pb-2 border-b border-white/10">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-xl font-semibold text-white mt-8 mb-3">
            {children}
          </h3>
        ),
        h4: ({ children }) => (
          <h4 className="text-lg font-semibold text-white/90 mt-6 mb-2">
            {children}
          </h4>
        ),

        // Paragraphs
        p: ({ children }) => (
          <p className="text-white/80 mb-4 leading-relaxed">{children}</p>
        ),

        // Links
        a: ({ href, children }) => (
          <a
            href={href}
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
            target={href?.startsWith('http') ? '_blank' : undefined}
            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        ),

        // Lists
        ul: ({ children }) => (
          <ul className="list-disc ml-6 space-y-1.5 text-white/80 mb-4">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal ml-6 space-y-1.5 text-white/80 mb-4">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">{children}</li>
        ),

        // Blockquotes — used for Seido CTAs and tips
        blockquote: ({ children }) => (
          <blockquote
            className={cn(
              'my-6 p-4 md:p-6 rounded-xl',
              'border-l-4 border-blue-500',
              'bg-blue-500/10 backdrop-blur-sm',
              '[&>p]:text-white/90 [&>p]:mb-0 [&>p:last-child]:mb-0'
            )}
          >
            {children}
          </blockquote>
        ),

        // Tables
        table: ({ children }) => (
          <div className="overflow-x-auto my-6 rounded-lg border border-white/10">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-white/10 text-white font-semibold">
            {children}
          </thead>
        ),
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => (
          <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
            {children}
          </tr>
        ),
        th: ({ children }) => (
          <th className="px-4 py-3 text-left text-white whitespace-nowrap">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-4 py-3 text-white/80">{children}</td>
        ),

        // Horizontal rules
        hr: () => <hr className="my-8 border-white/10" />,

        // Code
        code: ({ className, children }) => {
          const isInline = !className
          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded bg-white/10 text-blue-300 text-sm font-mono">
                {children}
              </code>
            )
          }
          return (
            <code className={cn('block text-sm font-mono', className)}>
              {children}
            </code>
          )
        },
        pre: ({ children }) => (
          <pre className="my-4 p-4 rounded-lg bg-black/40 border border-white/10 overflow-x-auto">
            {children}
          </pre>
        ),

        // Strong & emphasis
        strong: ({ children }) => (
          <strong className="font-semibold text-white">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-white/70">{children}</em>
        ),

        // Task lists (checklist)
        input: ({ checked, ...props }) => (
          <input
            type="checkbox"
            checked={checked}
            readOnly
            className="mr-2 accent-blue-500"
            {...props}
          />
        ),

        // Images
        img: ({ src, alt }) => (
          <figure className="my-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt || ''}
              className="rounded-lg border border-white/10 max-w-full"
            />
            {alt && (
              <figcaption className="mt-2 text-center text-sm text-white/50">
                {alt}
              </figcaption>
            )}
          </figure>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
