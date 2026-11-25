import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import ChatNavbar from '../components/ChatNavbar'
import ChatPane from '../components/ChatPane'
import Sidebar from '../components/Sidebar'
import SourcesPanel from '../components/SourcesPanel'
import useIsDock, { useIsWide } from '../hooks/useIsDock'
import usePageTitle from '../hooks/usePageTitle'
import { useChatStore } from '../lib/chatStore'
import { askQuery, QueryRejectedError, REQUEST_FAILED_REPLY, splitAnswer } from '../lib/queryApi'
import { sourceRefsFrom } from '../lib/sources'
import { supabase } from '../lib/supabase'
import { clockTime, HATCH } from '../lib/ui'
import type { AppRole, ModelId, View } from '../types/chat'

const ROLES: AppRole[] = ['admin', 'hr', 'legal', 'employee']

const PAGE_NAMES: Record<Exclude<View, 'chat'>, string> = { upload: 'Upload', audit: 'Audit log', all: 'All chats' }

const TITLE_LENGTH = 30

// How long the outline stays on a question and its answer after a jump (the mockup's 1.7s).
const HIGHLIGHT_MS = 1700
// On narrow screens the panel covers the chat, so the chat scrolls only after the panel has slid away.
const PANEL_SLIDE_MS = 220

// New chats are named after their first question: 30 characters, then "..." if it was longer.
function titleFrom(question: string) {
  const flat = question.replace(/\s+/g, ' ').trim()
  return flat.length > TITLE_LENGTH ? `${flat.slice(0, TITLE_LENGTH)}...` : flat
}

// Same source the backend trusts: app_metadata.role. Unknown values get the least access.
function roleFrom(session: Session): AppRole {
  const role = session.user.app_metadata?.role
  return ROLES.includes(role) ? (role as AppRole) : 'employee'
}

function Placeholder({ title, note, large = false }: { title: string; note: string; large?: boolean }) {
  return (
    <div className="w-full max-w-[960px]">
      <h2 className={`m-0 mb-4 font-bold ${large ? 'text-page leading-tight' : 'text-section'}`}>{title}</h2>
      <p className="m-0 text-app-text-dim">{note}</p>
    </div>
  )
}

export default function Chat({ session }: { session: Session }) {
  const role = roleFrom(session)
  const store = useChatStore()
  const isDock = useIsDock()
  const isWide = useIsWide()
  const [open, setOpen] = useState(isDock)
  const [prevDock, setPrevDock] = useState(isDock)
  const [view, setView] = useState<View>('chat')
  const [activeChatId, setActiveChatId] = useState<number | null>(null)
  const [model, setModel] = useState<ModelId>('C')
  const [docsOpen, setDocsOpen] = useState(false)
  const [reveal, setReveal] = useState<{ messageId: string } | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightTimer = useRef<number | undefined>(undefined)
  const jumpTimer = useRef<number | undefined>(undefined)
  const docsButton = useRef<HTMLButtonElement>(null)

  // Tab title follows the page: the chat's own title, "New chat", or the admin page name.
  const activeChat = view === 'chat' && activeChatId !== null ? store.chats.find((c) => c.id === activeChatId) : undefined
  const pageName = view === 'chat' ? (activeChat?.title ?? 'New chat') : PAGE_NAMES[view]
  usePageTitle(`${pageName} | Sentra`)

  // Like the mockup: on wide screens the navbar is hidden while the sidebar is open and no chat
  // is open, because the sidebar already shows the logo and New chat there.
  const navHidden = isDock && open && !activeChat

  // The references panel belongs to the open chat, so it only shows while a chat is open.
  const showDocs = docsOpen && activeChat !== undefined

  // Crossing the 700px breakpoint resets the sidebar to that size's default.
  if (prevDock !== isDock) {
    setPrevDock(isDock)
    setOpen(isDock)
  }

  // Below 1100px the sidebar and the panel never share the screen. Opening either one closes the
  // other (see the handlers below); this covers the window being made narrower while both are open.
  if (showDocs && open && !isWide) setOpen(false)

  // Esc closes the overlay sidebar, unless a menu or dialog is open (they handle Esc themselves).
  useEffect(() => {
    if (isDock || !open) return
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape' || document.querySelector('[role="menu"],[role="dialog"]')) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isDock, open])

  useEffect(
    () => () => {
      window.clearTimeout(highlightTimer.current)
      window.clearTimeout(jumpTimer.current)
    },
    [],
  )

  const messages = activeChatId !== null ? (store.messages[activeChatId] ?? []) : []
  const busy = messages.some((m) => m.answer === null)

  // One entry per document the answers in this chat used, in order of first use, with the
  // questions it helped answer.
  const sourceRefs = sourceRefsFrom(messages)

  // Sends the question to /query (the same call QueryTest made) and fills in the answer when
  // it arrives. The model chosen in the picker is only shown for now: the backend still reads
  // ACCESS_MODEL from its env file.
  async function send(question: string) {
    const chatId = activeChatId ?? store.createChat(titleFrom(question))
    if (activeChatId === null) setActiveChatId(chatId)
    const id = `m-${Date.now()}`
    store.addMessage(chatId, { id, question, askedAt: clockTime(), answer: null, sources: [], model })
    try {
      const result = await askQuery(question)
      const { text, sources } = splitAnswer(result.answer)
      store.updateMessage(chatId, id, { answer: text, sources, answeredAt: clockTime() })
    } catch (err) {
      const answer = err instanceof QueryRejectedError ? err.message : REQUEST_FAILED_REPLY
      store.updateMessage(chatId, id, { answer, sources: [], answeredAt: clockTime(), failed: true })
}
  }

  const closeDrawer = () => {
    if (!isDock) setOpen(false)
  }

  // Below 1100px the sidebar and the references panel never share the screen: opening one closes the other.
  function openSidebar() {
    if (!isWide) setDocsOpen(false)
    setOpen(true)
  }

  function toggleDocs() {
    setDocsOpen(!showDocs)
    if (!showDocs && !isWide) setOpen(false)
  }

  // An answer's "N references" button: open the panel with that question marked.
  function showSourcesFor(messageId: string) {
    setReveal({ messageId })
    setDocsOpen(true)
    if (!isWide) setOpen(false)
  }

  // Scrolls to the question and outlines it with its answer for a moment.
  function highlight(messageId: string) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(`question-${messageId}`)?.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' })
    setHighlightId(messageId)
    window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), HIGHLIGHT_MS)
  }

  // A question was clicked in the panel. Under 700px the panel covers the chat, so it closes first
  // and focus goes back to its button.
  function jumpTo(messageId: string) {
    if (isDock) {
      highlight(messageId)
      return
    }
    setDocsOpen(false)
    docsButton.current?.focus({ preventScroll: true })
    window.clearTimeout(jumpTimer.current)
    jumpTimer.current = window.setTimeout(() => highlight(messageId), PANEL_SLIDE_MS)
  }

  function newChat() {
    setDocsOpen(false)
    setView('chat')
    setActiveChatId(null)
    closeDrawer()
  }

  function selectChat(id: number) {
    if (id !== activeChatId) setDocsOpen(false)
    setView('chat')
    setActiveChatId(id)
    closeDrawer()
  }

  function navigate(next: 'upload' | 'audit' | 'all') {
    setDocsOpen(false)
    setView(next)
    closeDrawer()
  }

  function deleteChat(id: number) {
    store.deleteChat(id)
    if (activeChatId === id) {
      setActiveChatId(null)
      setDocsOpen(false)
    }
  }

  return (
    <div className="h-full box-border pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] bg-app-bg text-app-text font-ui text-sm antialiased scheme-dark">
      <div className="relative h-full flex overflow-hidden">
        <Sidebar
          open={open}
          role={role}
          email={session.user.email ?? ''}
          view={view}
          activeChatId={activeChatId}
          store={store}
          onClose={() => setOpen(false)}
          onNewChat={newChat}
          onSelectChat={selectChat}
          onNavigate={navigate}
          onDeleteChat={deleteChat}
          onSignOut={() => {
            void supabase.auth.signOut()
          }}
        />

        {open && <div className="absolute inset-0 z-20 bg-black/55 dock:hidden" onClick={() => setOpen(false)} aria-hidden="true" />}

        <div className={`relative flex min-h-0 min-w-0 flex-1 flex-col bg-fixed ${HATCH}`}>
          <ChatNavbar
            hidden={navHidden}
            chat={activeChat}
            docsOpen={showDocs}
            docsCount={sourceRefs.length}
            onToggleDocs={toggleDocs}
            docsButtonRef={docsButton}
            showToggle={!open}
            store={store}
            onOpenSidebar={openSidebar}
            onDeleteChat={deleteChat}
          />

          {view === 'chat' && (
            <ChatPane
              messages={messages}
              scope={role}
              busy={busy}
              model={model}
              onModelChange={setModel}
              onSend={send}
              chatKey={activeChatId ?? 'new'}
              navHidden={navHidden}
              highlightId={highlightId}
              onShowSources={showSourcesFor}
            />
          )}
          {view !== 'chat' && (
            <main className={`flex-1 min-h-0 overflow-y-auto px-3.5 pb-6 dock:px-8 ${navHidden ? 'pt-15' : 'pt-6'}`}>
              {view === 'upload' && <Placeholder title="Upload documents" note="Built in a later step. Visible to Admin only." />}
              {view === 'audit' && <Placeholder title="Audit log" note="Built in a later step. Visible to Admin only." />}
              {view === 'all' && <Placeholder large title="All chats" note="Built after the storage decision." />}
            </main>
          )}
        </div>

        <SourcesPanel
          refs={sourceRefs}
          open={showDocs}
          chatKey={activeChatId ?? 'new'}
          reveal={reveal}
          toggleRef={docsButton}
          onJump={jumpTo}
          onClose={() => setDocsOpen(false)}
        />
      </div>
    </div>
  )
}
