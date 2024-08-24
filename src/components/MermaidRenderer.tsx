"use client"

import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: true })

interface MermaidRendererProps {
  code: string
}

export default function MermaidRenderer({ code }: MermaidRendererProps) {
  const mermaidRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mermaidRef.current) {
      mermaid.render('mermaid-graph', code).then((result) => {
        mermaidRef.current!.innerHTML = result.svg
      })
    }
  }, [code])

  return <div ref={mermaidRef} className="border p-4" />
}