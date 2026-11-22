import { useEffect, useRef, useState } from 'react'

// Content taller than this (px) is collapsed behind "Show more". Shared by the question and
// answer bubbles so both use the same cap.
export const LONG_BUBBLE_PX = 300

// Applied to the text while it is collapsed: a 240px window with a fade at the bottom edge.
export const COLLAPSED_CLASS = 'max-h-60 overflow-hidden [mask-image:linear-gradient(black_calc(100%-64px),transparent)]'

// Measures the element the returned ref is attached to and reports whether it is long.
// Re-measures when the content changes (pass it as `content`) or the width changes, because
// wrapping changes the height. Attach `body` to the text wrapper, not to the bubble.
export default function useCollapsible(content: unknown) {
  const body = useRef<HTMLDivElement>(null)
  const [isLong, setIsLong] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const el = body.current
    if (!el) return
    const observer = new ResizeObserver(() => setIsLong(el.scrollHeight > LONG_BUBBLE_PX))
    observer.observe(el)
    return () => observer.disconnect()
  }, [content])

  return {
    body,
    isLong,
    expanded,
    collapsed: isLong && !expanded,
    toggle: () => setExpanded((v) => !v),
  }
}
