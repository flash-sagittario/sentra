import { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// Spacing is a flex column with gaps (no margins), so title, text and buttons can never
// collapse into each other. Phone sizes (below 450px) come from the max-xs variant.
export default function ConfirmDialog({ title, body, confirmLabel, onConfirm, onCancel }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.preventDefault()
      onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return createPortal(
    <div
      className="fixed inset-0 z-60 grid place-items-center p-5 max-xs:p-4 bg-black/55 font-ui text-sm leading-normal text-app-text antialiased"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-120 flex flex-col gap-5 max-xs:gap-4 p-8 max-xs:p-5 bg-app-card border border-app-border rounded-[20px] max-xs:rounded-2xl shadow-card"
      >
        <div className="flex flex-col gap-3 max-xs:gap-2">
          <h4 className="text-xl max-xs:text-base font-bold leading-tight">{title}</h4>
          <p className="text-lead max-xs:text-label leading-relaxed text-app-text-dim">{body}</p>
        </div>
        <div className="flex justify-end gap-3 max-xs:gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="h-11 max-xs:h-10 px-5.5 max-xs:px-4 rounded-full border border-app-border text-label font-semibold cursor-pointer hover:bg-app-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 max-xs:h-10 px-5.5 max-xs:px-4 rounded-full border border-app-error bg-transparent text-app-error text-label font-semibold cursor-pointer hover:bg-app-error/14 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-text"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
