import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import Icon from './Icon'
import type { ModelId } from '../types/chat'

const OPTIONS: { id: ModelId; name: string; note: string }[] = [
  { id: 'A', name: 'No access control', note: 'Dev only, leaks restricted chunks' },
  { id: 'B', name: 'Application layer', note: 'Role check in FastAPI after retrieval' },
  { id: 'C', name: 'Retrieval layer', note: 'Row-Level Security, default' },
]

interface Props {
  model: ModelId
  onChange: (model: ModelId) => void
  /** true while the composer is centred on the page: the list opens below instead of above */
  opensDown: boolean
}

// Visual only for now: the choice is not sent to the backend (the server reads ACCESS_MODEL).
export default function ModelPicker({ model, onChange, opensDown }: Props) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    list.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.preventDefault()
      setOpen(false)
      trigger.current?.focus()
    }
    function onClick(e: MouseEvent) {
      const t = e.target as Node
      if (list.current?.contains(t) || trigger.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick, true)
    }
  }, [open])

  function onListKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]'))
    const i = items.indexOf(e.target as HTMLElement)
    if (e.key === 'ArrowDown') items[(i + 1) % items.length]?.focus()
    else if (e.key === 'ArrowUp') items[(i - 1 + items.length) % items.length]?.focus()
    else return
    e.preventDefault()
  }

  return (
    <div className="relative">
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-7.5 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-label text-app-text-dim hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none"
      >
        <span>
          Model <b className="font-normal">{model}</b>
        </span>
        <Icon name="chevD" size={14} />
      </button>

      {open && (
        <>
          <div
            ref={list}
            role="menu"
            aria-label="Access model"
            onKeyDown={onListKey}
            className={`absolute right-0 z-40 flex w-[min(360px,90vw)] flex-col gap-1 rounded-[14px] border border-app-border bg-app-card p-2 shadow-popup max-xs:fixed max-xs:inset-x-0 max-xs:top-auto max-xs:bottom-0 max-xs:w-auto max-xs:animate-sheet-up max-xs:rounded-t-2xl max-xs:rounded-b-none max-xs:border-x-0 max-xs:border-b-0 max-xs:px-2 max-xs:pt-6 max-xs:pb-[calc(12px+env(safe-area-inset-bottom,0px))] max-xs:shadow-sheet max-xs:before:absolute max-xs:before:top-2 max-xs:before:left-1/2 max-xs:before:h-1 max-xs:before:w-9 max-xs:before:-ml-[18px] max-xs:before:rounded-sm max-xs:before:bg-app-border-strong motion-reduce:animate-none ${
              opensDown ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]'
            }`}
          >
            {OPTIONS.map((o) => {
              const on = o.id === model
              return (
                <button
                  key={o.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  onClick={() => {
                    onChange(o.id)
                    setOpen(false)
                    trigger.current?.focus()
                  }}
                  className={`inline-flex w-full cursor-pointer items-start gap-3 rounded-[10px] p-3 text-left hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none ${
                    on ? 'bg-app-hover' : ''
                  }`}
                >
                  <span
                    className={`grid size-8 flex-none place-items-center rounded-lg font-mono text-label ${
                      on ? 'bg-app-primary font-bold text-app-bg' : 'bg-app-raised text-app-text-dim'
                    }`}
                  >
                    {o.id}
                  </span>
                  <span className="min-w-0 flex-1 leading-[normal]">
                    <span className="block truncate font-semibold">{o.name}</span>
                    <span className="mt-0.75 block truncate text-xs leading-[normal] text-app-text-dim">{o.note}</span>
                  </span>
                  {on && <Icon name="check" size={16} className="self-center" />}
                </button>
              )
            })}
          </div>
          <div className="fixed inset-0 z-30 bg-black/55 xs:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
        </>
      )}
    </div>
  )
}
