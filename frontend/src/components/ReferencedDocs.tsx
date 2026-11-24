import type { Ref } from 'react'
import { SOURCES_PANEL_ID } from '../lib/sources'
import Icon from './Icon'

interface Props {
  /** true while the references panel is open */
  open: boolean
  /** number of documents the open chat's answers relied on, read out by screen readers */
  count: number
  onToggle: () => void
  /** lets the panel hand focus back here when it closes from inside */
  buttonRef?: Ref<HTMLButtonElement>
}

const LABEL = 'Referenced Documents'

// The navbar's documents button. It only opens and closes the right-hand SourcesPanel, which
// Chat.tsx renders next to the chat. Orange while the panel is open, as in the mockup.
export default function ReferencedDocs({ open, count, onToggle, buttonRef }: Props) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={count > 0 ? `${LABEL} (${count})` : LABEL}
      title={LABEL}
      aria-pressed={open}
      aria-expanded={open}
      aria-controls={SOURCES_PANEL_ID}
      onClick={onToggle}
      className={`ml-1 inline-flex size-9 flex-none cursor-pointer items-center justify-center rounded-[10px] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-text ${
        open ? 'bg-app-primary/14 text-app-primary hover:bg-app-primary/22' : 'hover:bg-app-hover'
      }`}
    >
      <Icon name="file" />
    </button>
  )
}
