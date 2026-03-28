"use client"

import { useEffect, useRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const el = ref.current
    let cancelled = false

    import("mermaid").then(({ default: mermaid }) => {
      if (cancelled) return
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "loose",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      })
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`
      mermaid.render(id, code).then(({ svg }) => {
        if (!cancelled && el) el.innerHTML = svg
      }).catch(() => {
        if (!cancelled && el) el.innerHTML = `<pre class="text-red-500 text-xs p-2">Error al renderizar diagrama Mermaid</pre>`
      })
    })

    return () => { cancelled = true }
  }, [code])

  return <div ref={ref} className="my-4 flex justify-center overflow-x-auto" />
}

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
      components={{
        code({ className, children, ...rest }: any) {
          if (/language-mermaid/.test(className || "")) {
            return <MermaidBlock code={String(children).trim()} />
          }
          return (
            <code className={className} {...rest}>
              {children}
            </code>
          )
        },
        pre({ children }: any) {
          return <>{children}</>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
