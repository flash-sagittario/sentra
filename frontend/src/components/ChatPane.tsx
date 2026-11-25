import { useLayoutEffect, useRef } from 'react'
import Composer from './Composer'
import EmptyChat from './EmptyChat'
import MessageList from './MessageList'
import useIsDock from '../hooks/useIsDock'
import { HATCH, HATCH_BEFORE, LIFT_TRANSITION } from '../lib/ui'
import type { ChatMessage, ModelId } from '../types/chat'

interface Props {
  messages: ChatMessage[]
  scope: string
  busy: boolean
  model: ModelId
  onModelChange: (model: ModelId) => void
  onSend: (text: string) => void
  /** changes when the open chat changes */
  chatKey: string | number
  /** true while the page navbar is hidden: adds top space, as in the mockup */
  navHidden?: boolean
  /** the answer to outline after a jump from the sources panel */
  highlightId: string | null
  /** an answer's "N sources" button was clicked */
  onShowSources: (messageId: string) => void
}

// Renders the scrolling message area and the composer as two children of the page's
// positioned panel: the composer is absolutely placed at the bottom of that panel.
export default function ChatPane({ messages, scope, busy, model, onModelChange, onSend, chatKey, navHidden = false, highlightId, onShowSources }: Props) {
  const isDock = useIsDock()
  const empty = messages.length === 0
  const centered = empty && isDock
  const scroller = useRef<HTMLDivElement>(null)
  const composer = useRef<HTMLDivElement>(null)
  const firstRun = useRef(true)

  // Keep three measurements in CSS variables:
  //   --cph  composer height, so the last message is never hidden behind it
  //   --sbw  scrollbar width, so the composer does not cover the scrollbar
  //   --ctry how far to lift the composer to sit at the vertical centre of the panel
  useLayoutEffect(() => {
    const ms = scroller.current
    const cp = composer.current
    if (!ms || !cp) return
    const panel = cp.offsetParent as HTMLElement | null
    function sync() {
      if (!ms || !cp) return
      const atBottom = ms.scrollHeight - ms.scrollTop - ms.clientHeight < 8
      ms.style.setProperty('--cph', `${cp.offsetHeight}px`)
      cp.style.setProperty('--sbw', `${ms.offsetWidth - ms.clientWidth}px`)
      if (panel) {
        cp.style.setProperty('--ctry', `${Math.max(0, Math.round(panel.clientHeight / 2 - cp.offsetHeight + 8))}px`)
      }
      if (atBottom) ms.scrollTop = ms.scrollHeight
    }
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(ms)
    observer.observe(cp)
    if (panel) observer.observe(panel)
    return () => observer.disconnect()
  }, [])

  // Slide the composer between centre and bottom, but only when the chat actually changes
  // state (not on first paint, and not while it is resized by typing).
  useLayoutEffect(() => {
    const cp = composer.current
    if (!cp) return
    if (firstRun.current) {
      firstRun.current = false
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const classes = LIFT_TRANSITION.split(' ')
    cp.classList.add(...classes)
    const timer = setTimeout(() => cp.classList.remove(...classes), 450)
    return () => clearTimeout(timer)
  }, [centered])

  const last = messages[messages.length - 1]
  const lastAnswer = last?.answer
  useLayoutEffect(() => {
    const ms = scroller.current
    if (ms) ms.scrollTop = ms.scrollHeight
  }, [chatKey, messages.length, lastAnswer])

  return (
    <>
      <div
        ref={scroller}
        className={`flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3.5 pb-[calc(16px+var(--cph,0px))] [scrollbar-color:var(--color-app-raised)_transparent] [scrollbar-width:thin] dock:px-8 ${
          navHidden ? 'pt-15' : 'pt-6'
        }`}
      >
        {empty ? <EmptyChat /> : <MessageList messages={messages} scope={scope} highlightId={highlightId} onShowSources={onShowSources} />}
      </div>

      <div
        ref={composer}
        className={`absolute right-[var(--sbw,0px)] bottom-0 left-0 z-10 mx-auto w-full max-w-197 bg-app-bg bg-fixed px-3.5 pt-2 pb-4 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-7 before:bg-app-bg before:bg-fixed before:[mask-image:linear-gradient(transparent,black)] dock:max-w-206 dock:px-8 ${HATCH} ${HATCH_BEFORE} ${
          centered ? 'translate-y-[calc(var(--ctry,0px)*-1)]' : ''
        }`}
      >
        <Composer
          busy={busy}
          model={model}
          onModelChange={onModelChange}
          onSend={onSend}
          centered={centered}
          focusKey={chatKey}
        />
      </div>
    </>
  )
}
