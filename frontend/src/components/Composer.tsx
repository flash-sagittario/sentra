import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import Icon from './Icon'
import ModelPicker from './ModelPicker'
import useIsDock from '../hooks/useIsDock'
import type { ModelId } from '../types/chat'

const ROW_PX = 24 // one line of text
const MAX_PX = 200

// Longest question the backend accepts (MAX_QUERY_CHARS in backend/config.py). Keep both in sync.
const MAX_QUERY_CHARS = 2000
// Safety net only, far above the limit: stops a huge paste from freezing the box. The counter
// and the notice, not this cap, tell the person their text is too long.
const HARD_CAP_CHARS = MAX_QUERY_CHARS * 5
const NOTICE_MS = 6000

// Counts characters the way the backend does (Python len), so an emoji counts once.
function countChars(text: string) {
  return Array.from(text.trim()).length
}

interface Props {
  busy: boolean
  model: ModelId
  onModelChange: (model: ModelId) => void
  onSend: (text: string) => void
  /** true while the composer is centred on the page */
  centered: boolean
  /** changes when the open chat changes; focuses the box on desktop */
  focusKey: string | number
}

function fit(el: HTMLTextAreaElement) {
  el.style.height = `${ROW_PX}px`
  el.style.height = `${Math.min(el.scrollHeight, MAX_PX)}px`
}

export default function Composer({ busy, model, onModelChange, onSend, centered, focusKey }: Props) {
  const box = useRef<HTMLTextAreaElement>(null)
  const [value, setValue] = useState('')
  // Once the text needs a second line the controls drop to their own row, and they stay
  // there until the box is empty again (avoids flipping back and forth at the wrap point).
  const [multi, setMulti] = useState(false)
  const [noticeOpen, setNoticeOpen] = useState(false)
  const isDock = useIsDock()

  const length = countChars(value)
  const over = length > MAX_QUERY_CHARS
  const showNotice = over && noticeOpen

  // The notice closes by itself after a few seconds, or with its X.
  useEffect(() => {
    if (!showNotice) return
    const timer = window.setTimeout(() => setNoticeOpen(false), NOTICE_MS)
    return () => window.clearTimeout(timer)
  }, [showNotice])

  // Focus the box when the person opens another chat (desktop only, so phones do not pop
  // the keyboard). Not on first load, which keeps the page calm like the mockup.
  const firstFocus = useRef(true)
  useEffect(() => {
    if (firstFocus.current) {
      firstFocus.current = false
      return
    }
    if (isDock) box.current?.focus()
  }, [focusKey, isDock])

  // Re-fit when the width changes (rotation, sidebar open/close) or the layout switches.
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    fit(el)
    const observer = new ResizeObserver(() => fit(el))
    observer.observe(el)
    return () => observer.disconnect()
  }, [multi])

  function onChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    setValue(el.value)
    fit(el)
    if (el.scrollHeight > ROW_PX + 4) setMulti(true)
    // Open the notice at the moment the text crosses the limit (typing or pasting).
    if (countChars(el.value) > MAX_QUERY_CHARS && !over) setNoticeOpen(true)
  }

  function submit() {
    const text = value.trim()
    if (!text || busy) return
    if (over) {
      setNoticeOpen(true)
      return
    }
    onSend(text)
    setValue('')
    setMulti(false)
    setNoticeOpen(false)
    if (box.current) box.current.style.height = `${ROW_PX}px`
    box.current?.focus()
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
    e.preventDefault()
    submit()
  }

  return (
    <div className="relative">
      {showNotice && (
        <div
          role="alert"
          className="absolute inset-x-0 bottom-full mb-2 flex items-start gap-2 rounded-xl border border-app-border-strong bg-app-raised py-2.5 pr-2 pl-3.5 text-label text-app-text shadow-popup"
        >
          <p className="m-0 min-w-0 flex-1 py-1">
            Question is too long: {length} characters, the limit is {MAX_QUERY_CHARS}.
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setNoticeOpen(false)}
            className="inline-flex size-7 flex-none cursor-pointer items-center justify-center rounded-lg text-app-text-dim hover:bg-app-hover hover:text-app-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-text"
          >
            <Icon name="x" />
          </button>
        </div>
      )}
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 rounded-2xl border border-app-border-input bg-app-raised py-[9px] pr-[9px] pl-4 shadow-composer inset-shadow-[0_0_0_0.5px] inset-shadow-app-border-input focus-within:border-app-primary focus-within:inset-shadow-app-primary focus-within:ring-3 focus-within:ring-app-primary/25 max-xs:pt-3 ${
        multi ? 'pt-3' : ''
      }`}
    >
      <textarea
        ref={box}
        rows={1}
        maxLength={HARD_CAP_CHARS}
        value={value}
        placeholder="Ask about your documents"
        aria-label="Message"
        onChange={onChange}
        onKeyDown={onKeyDown}
        className={`block h-6 max-h-50 w-full min-w-0 resize-none overflow-y-auto border-0 bg-transparent py-0.5 font-ui text-sm leading-5 text-app-text outline-none [scrollbar-width:none] placeholder:text-app-muted [&::-webkit-scrollbar]:hidden max-xs:col-span-2 max-xs:row-start-1 ${
          multi ? 'col-span-2 row-start-1' : 'col-start-1 row-start-1'
        }`}
      />
      {over && (
        <span aria-live="polite" className="col-start-1 row-start-2 self-center font-mono text-label text-app-error">
          {length} / {MAX_QUERY_CHARS}
        </span>
      )}
      <div
        className={`col-start-2 flex items-center justify-end gap-1.5 max-xs:row-start-2 ${
          multi ? 'row-start-2' : 'row-start-1'
        }`}
      >
        <ModelPicker model={model} onChange={onModelChange} opensDown={centered} />
        <button
          type="button"
          aria-label="Send"
          disabled={busy || over}
          onClick={submit}
          className={`inline-flex size-7.5 cursor-pointer items-center justify-center rounded-full bg-app-primary text-app-bg hover:bg-app-primary-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-text ${over ? 'disabled:cursor-not-allowed' : 'disabled:cursor-progress'} disabled:opacity-40 disabled:hover:bg-app-primary`}
        >
          <Icon name="up" />
        </button>
      </div>
    </div>
    </div>
  )
}
