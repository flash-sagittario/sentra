import { useLayoutEffect, useRef } from 'react'
import { splitFilename } from '../lib/sources'

// A file name on one line. The extension always stays visible and the name before it is cut at
// a whole character (never half a letter), like the mockup. The full name is the tooltip and
// what screen readers read.
export default function FileName({ name }: { name: string }) {
  const { stem, ext } = splitFilename(name)
  const row = useRef<HTMLSpanElement>(null)
  const head = useRef<HTMLSpanElement>(null)
  const tail = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const box = row.current
    const start = head.current
    const end = tail.current
    if (!box || !start || !end) return

    // The stem span has no React children, so setting its text here is safe.
    const fit = () => {
      start.textContent = stem
      const room = box.clientWidth - end.offsetWidth
      if (room <= 0 || start.scrollWidth <= room + 0.5) return
      let low = 0
      let high = stem.length
      while (low < high) {
        const mid = (low + high + 1) >> 1
        start.textContent = stem.slice(0, mid)
        if (start.scrollWidth <= room + 0.5) low = mid
        else high = mid - 1
      }
      start.textContent = stem.slice(0, low)
    }

    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(box)
    void document.fonts?.ready.then(fit)
    return () => observer.disconnect()
  }, [stem])

  return (
    <span ref={row} title={name} className="flex w-full min-w-0 justify-start text-sm font-semibold">
      <span ref={head} aria-hidden="true" className="min-w-0 overflow-hidden whitespace-nowrap" />
      <span ref={tail} aria-hidden="true" className="flex-none">
        {ext}
      </span>
      <span className="sr-only">{name}</span>
    </span>
  )
}
