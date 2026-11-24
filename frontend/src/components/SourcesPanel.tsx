import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import FileName from './FileName'
import Icon from './Icon'
import { fileMeta, filterFiles, filterRefs, SOURCES_PANEL_ID, type SourceRef } from '../lib/sources'

type Page = { name: 'main' } | { name: 'files' } | { name: 'file'; filename: string }

const MAIN: Page = { name: 'main' }
const FILES: Page = { name: 'files' }

// Widths of the grey lines in the file preview placeholder, in percent. 0 is a gap between paragraphs.
const PREVIEW_LINES = [52, 100, 94, 100, 78, 0, 100, 90, 97, 64, 0, 100, 86]

const COMING_SOON = 'Coming soon'

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-text'
// Buttons inside the scrolling list and the bar draw their focus ring inwards, so it is not clipped.
const FOCUS_IN = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-text'

const BAR_BUTTON = `inline-flex h-7 cursor-pointer items-center rounded-lg px-2 text-xs hover:bg-app-hover hover:text-app-text ${FOCUS_IN}`
// Download buttons have no backend yet, so they are shown but disabled.
const DOWNLOAD_BUTTON = 'disabled:cursor-not-allowed disabled:opacity-50'

const FILE_ICON_BOX = 'grid size-10 flex-none place-items-center rounded-[10px] bg-app-primary/14 text-app-primary'

interface Props {
  refs: SourceRef[]
  open: boolean
  /** changes when the open chat changes, which resets the panel's own state */
  chatKey: string | number
  /** set when an answer's "N references" button is clicked; a new object for every click */
  reveal: { messageId: string } | null
  /** the navbar button, so focus goes back to it when the panel closes from inside */
  toggleRef: RefObject<HTMLButtonElement | null>
  /** a question was clicked: scroll the chat to it */
  onJump: (messageId: string) => void
  onClose: () => void
}

// Right-hand panel with the documents the open chat's answers relied on. Three pages: the main
// list (documents with the questions they helped answer), the Files list, and one file.
// It is always mounted so it can slide; while closed it is inert.
export default function SourcesPanel({ refs, open, chatKey, reveal, toggleRef, onJump, onClose }: Props) {
  const panel = useRef<HTMLElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const filterInput = useRef<HTMLInputElement>(null)
  const focusNext = useRef<string | null>(null)

  const [page, setPage] = useState<Page>(MAIN)
  const [filter, setFilter] = useState('')
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [seenChat, setSeenChat] = useState(chatKey)
  const [wasOpen, setWasOpen] = useState(open)
  const [seenReveal, setSeenReveal] = useState(reveal)

  // Another chat: start from scratch.
  if (seenChat !== chatKey) {
    setSeenChat(chatKey)
    setPage(MAIN)
    setFilter('')
    setCollapsed(new Set())
    setCurrentId(null)
  }

  // Opening always starts on the main page (it is reset on open, so nothing changes while it slides out).
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) setPage(MAIN)
  }

  // An answer's references button: main page, no filter, that question marked and its document expanded.
  if (seenReveal !== reveal) {
    setSeenReveal(reveal)
    if (reveal) {
      setPage(MAIN)
      setFilter('')
      setCurrentId(reveal.messageId)
      setCollapsed((prev) => {
        const next = new Set(prev)
        for (const ref of refs) {
          if (ref.questions.some((q) => q.messageId === reveal.messageId)) next.delete(ref.filename)
        }
        return next
      })
    }
  }

  // A page whose content is gone falls back to the one before it.
  let view: Page = page
  if (view.name !== 'main' && refs.length === 0) view = MAIN
  else if (view.name === 'file') {
    const filename = view.filename
    if (!refs.some((r) => r.filename === filename)) view = FILES
  }

  const term = filter.trim()
  const hasRefs = refs.length > 0
  const pageKey = view.name === 'file' ? `file:${view.filename}` : view.name

  function go(next: Page, focus: string) {
    setFilter('')
    setPage(next)
    focusNext.current = focus
  }

  function goBack() {
    if (view.name === 'file') go(FILES, `file:${view.filename}`)
    else if (view.name === 'files') go(MAIN, 'files')
  }

  function close() {
    const inside = panel.current?.contains(document.activeElement) ?? false
    onClose()
    if (inside) toggleRef.current?.focus({ preventScroll: true })
  }

  function toggleGroup(filename: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (!next.delete(filename)) next.add(filename)
      return next
    })
  }

  function toggleAll() {
    setCollapsed((prev) => (refs.every((r) => prev.has(r.filename)) ? new Set() : new Set(refs.map((r) => r.filename))))
  }

  function pick(messageId: string) {
    setCurrentId(messageId)
    onJump(messageId)
  }

  // Page changed: back to the top, and put focus where the mockup does.
  useLayoutEffect(() => {
    if (list.current) list.current.scrollTop = 0
    const key = focusNext.current
    focusNext.current = null
    if (!key) return
    panel.current?.querySelector<HTMLElement>(`[data-focus="${CSS.escape(key)}"]`)?.focus({ preventScroll: true })
  }, [pageKey])

  // Opened: focus the panel itself.
  useEffect(() => {
    if (open) panel.current?.focus({ preventScroll: true })
  }, [open])

  // From an answer's references button: centre that question in the list and focus it.
  useEffect(() => {
    const box = list.current
    if (!reveal || !box) return
    const row = box.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(reveal.messageId)}"]`)
    if (!row) return
    box.scrollTop += row.getBoundingClientRect().top - box.getBoundingClientRect().top - (box.clientHeight - row.offsetHeight) / 2
    row.focus({ preventScroll: true })
  }, [reveal])

  // Esc clears the filter first, then goes back one page, then closes the panel. Menus, dialogs and
  // other text boxes (like the rename box) handle their own Esc. Runs after every render so it
  // always sees the current state.
  useEffect(() => {
    if (!open) return
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('[role="menu"],[role="dialog"]')) return
      const target = e.target as HTMLElement | null
      const inFilter = target === filterInput.current
      if (!inFilter && target?.closest('input')) return
      e.preventDefault()
      if (inFilter && filter) setFilter('')
      else if (view.name !== 'main') goBack()
      else close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  // Arrow keys, Home and End move between the filter, the bar buttons, documents, questions and files.
  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const { key } = e
    if (key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Home' && key !== 'End') return
    if (e.target === filterInput.current && (key === 'Home' || key === 'End')) return
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[data-nav]')]
    if (items.length === 0) return
    e.preventDefault()
    const at = items.indexOf(document.activeElement as HTMLElement)
    const next = key === 'Home' ? 0 : key === 'End' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, at + (key === 'ArrowDown' ? 1 : -1)))
    items[next].focus()
  }

  const noMatch = (
    <p className="px-3 py-6 text-center text-label text-app-muted [overflow-wrap:anywhere]">
      {view.name === 'files' ? 'No files match' : 'Nothing matches'} {`\u201C${term}\u201D`}.
    </p>
  )

  const backButton = (
    <button type="button" data-nav data-focus="back" onClick={goBack} className={`${BAR_BUTTON} -ml-2 gap-1.5 text-app-text-dim`}>
      <Icon name="arrowL" size={16} />
      Back
    </button>
  )

  function downloadButton(label: string) {
    return (
      <button
        type="button"
        data-nav
        disabled
        title={COMING_SOON}
        className={`${BAR_BUTTON} -mr-1 gap-1.5 text-app-text-dim ${DOWNLOAD_BUTTON}`}
      >
        <Icon name="download" size={16} />
        {label}
      </button>
    )
  }

  let bar: ReactNode = null
  let body: ReactNode = null

  if (!hasRefs) {
    body = (
      <div className="flex flex-col items-center gap-1.5 px-6 py-14 text-center text-app-text-dim">
        <span className="mb-1.5 grid size-11 place-items-center rounded-full bg-app-raised text-app-text-dim">
          <Icon name="file" size={22} />
        </span>
        <b className="text-sm text-app-text">No references in this chat</b>
        <p className="max-w-60 text-label leading-normal">When an answer cites a document, the file shows up here with the questions it helped answer.</p>
      </div>
    )
  } else if (view.name === 'files') {
    const rows = filterFiles(refs, term)
    bar = (
      <>
        {backButton}
        {downloadButton('Download all')}
      </>
    )
    body =
      rows.length === 0 ? (
        noMatch
      ) : (
        <div className="flex animate-panel-page flex-col gap-2 px-1 pt-1 motion-reduce:animate-none">
          {rows.map((r) => (
            <div
              key={r.filename}
              className="flex items-center gap-1 rounded-xl border border-transparent bg-app-hover py-1.5 pr-1.5 transition-colors hover:border-app-border hover:bg-app-raised"
            >
              <button
                type="button"
                data-nav
                data-focus={`file:${r.filename}`}
                onClick={() => go({ name: 'file', filename: r.filename }, 'back')}
                className={`flex min-w-0 flex-1 cursor-pointer items-center justify-start gap-3 rounded-[10px] py-1.5 pr-1.5 pl-3 text-left ${FOCUS_IN}`}
              >
                <span className={FILE_ICON_BOX}>
                  <Icon name="file" size={18} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                  <FileName name={r.filename} />
                  <em className="text-xs not-italic text-app-text-dim">{fileMeta(r.filename)}</em>
                </span>
              </button>
              <button
                type="button"
                disabled
                title={COMING_SOON}
                aria-label={`Download ${r.filename}`}
                className={`inline-flex size-9 flex-none items-center justify-center rounded-lg text-app-text-dim ${DOWNLOAD_BUTTON}`}
              >
                <Icon name="download" size={18} />
              </button>
            </div>
          ))}
        </div>
      )
  } else if (view.name === 'file') {
    bar = (
      <>
        {backButton}
        {downloadButton('Download')}
      </>
    )
    body = (
      <div className="flex animate-panel-page flex-col gap-4 px-1 pt-1 motion-reduce:animate-none">
        <div className="flex items-center gap-3 px-1">
          <span className={FILE_ICON_BOX}>
            <Icon name="file" size={18} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
            <FileName name={view.filename} />
            <em className="text-xs not-italic text-app-text-dim">{fileMeta(view.filename)}</em>
          </span>
        </div>
        <div
          role="img"
          aria-label="Preview placeholder"
          className="flex aspect-[1/1.3] flex-col gap-3 overflow-hidden rounded-xl border border-app-border bg-app-hover px-6 py-7"
        >
          {PREVIEW_LINES.map((width, i) =>
            width === 0 ? (
              <span key={i} className="h-2.5 flex-none" />
            ) : (
              <span key={i} style={{ width: `${width}%` }} className={`block flex-none rounded-sm bg-app-raised ${i === 0 ? 'mb-1.5 h-3.5' : 'h-2'}`} />
            ),
          )}
        </div>
        <p className="text-center text-xs text-app-muted">Preview of this file will appear here.</p>
      </div>
    )
  } else {
    const rows = filterRefs(refs, term)
    bar = (
      <>
        <button type="button" data-nav data-focus="files" onClick={() => go(FILES, 'back')} className={`${BAR_BUTTON} -ml-2 text-app-muted`}>
          Files
        </button>
        {refs.length > 1 && !term && (
          <button type="button" data-nav onClick={toggleAll} className={`${BAR_BUTTON} text-app-text-dim`}>
            {refs.every((r) => collapsed.has(r.filename)) ? 'Expand all' : 'Collapse all'}
          </button>
        )}
      </>
    )
    body =
      rows.length === 0
        ? noMatch
        : rows.map((r) => {
            // While filtering, every match stays open.
            const folded = !term && collapsed.has(r.filename)
            return (
              <section key={r.filename} className="mb-1.5">
                <button
                  type="button"
                  data-nav
                  aria-expanded={!folded}
                  onClick={() => toggleGroup(r.filename)}
                  className={`flex w-full min-w-0 cursor-pointer items-center justify-start gap-2.5 overflow-hidden rounded-[10px] p-2 text-left hover:bg-app-hover ${FOCUS_IN}`}
                >
                  <span
                    className={`grid size-8 flex-none place-items-center rounded-lg transition-colors ${
                      folded ? 'bg-app-raised text-app-text-dim' : 'bg-app-primary/14 text-app-primary'
                    }`}
                  >
                    <Icon name="file" size={16} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col items-stretch text-left">
                    <FileName name={r.filename} />
                  </span>
                  <span className="grid size-8 flex-none place-items-center text-app-muted">
                    <Icon name={folded ? 'chevR' : 'chevD'} size={16} />
                  </span>
                </button>
                {!folded && (
                  <div className="mt-0.5 ml-5.75 flex flex-col gap-0.5 border-l border-app-border pl-2.5">
                    {r.questions.map((q) => (
                      <button
                        key={q.messageId}
                        type="button"
                        data-nav
                        data-message-id={q.messageId}
                        title={q.question}
                        onClick={() => pick(q.messageId)}
                        className={`relative flex min-h-11 w-full cursor-pointer items-start justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-label ${FOCUS_IN} ${
                          q.messageId === currentId
                            ? 'bg-app-primary/14 text-app-text before:absolute before:inset-y-2 before:-left-2.75 before:w-0.5 before:rounded-xs before:bg-app-primary hover:bg-app-primary/22'
                            : 'text-app-text-dim hover:bg-app-hover hover:text-app-text'
                        }`}
                      >
                        <span className="line-clamp-2 min-w-0 flex-1 leading-snug [overflow-wrap:anywhere]">{q.question}</span>
                        <span className="flex-none pt-0.5 font-mono text-micro text-app-muted">{q.askedAt}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )
          })
  }

  return (
    <>
      {/* Backdrop for the overlay layout (under 700px). */}
      <div
        aria-hidden="true"
        onClick={close}
        className={`absolute inset-0 z-20 bg-black/55 transition-opacity duration-200 motion-reduce:transition-none dock:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        ref={panel}
        id={SOURCES_PANEL_ID}
        aria-label="Referenced Documents"
        tabIndex={-1}
        inert={!open}
        onKeyDown={onKeyDown}
        className={`absolute inset-y-0 right-0 z-30 flex w-full overflow-hidden border-l border-app-border bg-app-card outline-none transition-[translate] duration-300 ease-lift motion-reduce:duration-0 xs:w-80 xs:max-w-[86%] dock:relative dock:z-auto dock:flex-none dock:border-l-0 dock:transition-[width] ${
          open ? 'translate-x-0 dock:w-80' : 'translate-x-full dock:w-0 dock:translate-x-0'
        }`}
      >
        <div
          className={`flex min-w-0 flex-1 flex-col dock:w-80 dock:flex-none dock:border-l dock:border-app-border dock:transition-opacity motion-reduce:duration-0 motion-reduce:delay-0 ${
            open ? 'dock:opacity-100 dock:delay-75 dock:duration-250' : 'dock:opacity-0 dock:duration-150'
          }`}
        >
          <div className="flex h-13 flex-none items-start gap-2 pt-3.5 pr-2 pl-4">
            <h3 className="m-0 min-w-0 flex-1 text-lead leading-9 font-semibold">Referenced Documents</h3>
            <button
              type="button"
              aria-label="Close panel"
              title="Close (Esc)"
              onClick={close}
              className={`inline-flex size-9 flex-none cursor-pointer items-center justify-center rounded-lg hover:bg-app-hover ${FOCUS}`}
            >
              <Icon name="x" />
            </button>
          </div>

          {hasRefs && view.name !== 'file' && (
            <div className="mx-3 mt-1.5 mb-2 flex h-9 flex-none items-center gap-2 rounded-[10px] border border-app-border-input bg-app-raised pr-1 pl-3 text-app-text-dim focus-within:border-app-primary focus-within:ring-3 focus-within:ring-app-primary/25">
              <Icon name="search" size={16} />
              <input
                ref={filterInput}
                data-nav
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder={view.name === 'files' ? 'Filter files' : 'Filter documents or questions'}
                aria-label={view.name === 'files' ? 'Filter files' : 'Filter documents'}
                autoComplete="off"
                enterKeyHint="search"
                className="min-w-0 flex-1 bg-transparent text-base text-app-text outline-none placeholder:text-app-muted dock:text-sm"
              />
              {filter && (
                <button
                  type="button"
                  aria-label="Clear filter"
                  onClick={() => {
                    setFilter('')
                    filterInput.current?.focus()
                  }}
                  className={`inline-flex size-7 flex-none cursor-pointer items-center justify-center rounded-lg text-app-text-dim hover:bg-app-hover ${FOCUS}`}
                >
                  <Icon name="x" size={16} />
                </button>
              )}
            </div>
          )}

          {hasRefs && <div className="flex flex-none items-center justify-between pr-3 pl-4 text-xs text-app-muted">{bar}</div>}

          <div
            ref={list}
            className="min-h-0 flex-1 overflow-y-auto px-2 pt-1 pb-4 [scrollbar-color:var(--color-app-raised)_transparent] [scrollbar-width:thin]"
          >
            {body}
          </div>

          {(view.name === 'files' || view.name === 'file') && (
            <p className="flex-none px-4 pb-4 text-center text-xs text-app-muted">Downloading files is coming soon.</p>
          )}
        </div>
      </aside>
    </>
  )
}
