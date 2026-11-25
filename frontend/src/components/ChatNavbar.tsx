import { useRef, useState, type MouseEvent, type Ref } from 'react'
import ConfirmDialog from './ConfirmDialog'
import ContextMenu from './ContextMenu'
import Icon from './Icon'
import InlineInput from './InlineInput'
import ReferencedDocs from './ReferencedDocs'
import type { ChatStore } from '../lib/chatStore'
import type { ChatSummary } from '../types/chat'

const TITLE_LENGTH = 60 // navbar rename limit, as in the mockup (the sidebar rename allows 40)

interface Props {
  /** true on wide screens while the sidebar is open and no chat is open (the sidebar already shows the logo) */
  hidden: boolean
  /** the open chat, or undefined on New chat and on the other pages */
  chat: ChatSummary | undefined
  /** true while the references panel is open */
  docsOpen: boolean
  /** number of documents in the open chat's references panel */
  docsCount: number
  onToggleDocs: () => void
  /** the references button, so the panel can hand focus back to it */
  docsButtonRef: Ref<HTMLButtonElement>
  showToggle: boolean
  store: ChatStore
  onOpenSidebar: () => void
  onDeleteChat: (id: number) => void
}

const noop = () => {}

// Top bar of the chat page: sidebar toggle, the open chat's title (click for the same chat menu
// as the sidebar rows, rename happens in place) and the referenced documents button.
export default function ChatNavbar({ hidden, chat, docsOpen, docsCount, onToggleDocs, docsButtonRef, showToggle, store, onOpenSidebar, onDeleteChat }: Props) {
  const [menu, setMenu] = useState<{ id: number; trigger: HTMLElement } | null>(null)
  const [renamingId, setRenamingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const titleButton = useRef<HTMLButtonElement>(null)
  const refocusTitle = useRef(false)

  if (hidden) return null

  // Everything below is tied to the chat that is open now, so switching chats never
  // leaves a menu, rename box or dialog behind for the old one.
  const menuOpen = chat !== undefined && menu?.id === chat.id
  const renaming = chat !== undefined && renamingId === chat.id
  const deleting = chat !== undefined && deletingId === chat.id

  function toggleMenu(e: MouseEvent<HTMLButtonElement>) {
    if (!chat) return
    const trigger = e.currentTarget
    setMenu((cur) => (cur ? null : { id: chat.id, trigger }))
  }

  function closeMenu(restoreFocus: boolean) {
    const trigger = menu?.trigger
    setMenu(null)
    if (restoreFocus && trigger) requestAnimationFrame(() => trigger.focus())
  }

  // Enter and Esc hand focus back to the title button; leaving the box by clicking elsewhere does not.
  function finishRename(id: number, value: string | null) {
    setRenamingId(null)
    if (value) store.renameChat(id, value)
    if (refocusTitle.current) {
      refocusTitle.current = false
      requestAnimationFrame(() => titleButton.current?.focus())
    }
  }

  return (
    <header className="flex-none flex items-start gap-1 h-[52px] px-2 pt-3.5">
      {showToggle && (
        <button
          type="button"
          aria-label="Open sidebar"
          onClick={onOpenSidebar}
          className="size-9 flex-none inline-flex items-center justify-center rounded-lg cursor-pointer hover:bg-app-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-text"
        >
          <Icon name="panel" />
        </button>
      )}

      <div
        className="flex h-9 min-w-0 flex-1 items-center"
        onKeyDownCapture={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') refocusTitle.current = true
        }}
      >
        {chat &&
          (renaming ? (
            <InlineInput
              initial={chat.title}
              maxLength={TITLE_LENGTH}
              label="Rename chat"
              className="mx-1 h-8! w-full max-w-105 flex-none"
              onDone={(v) => finishRename(chat.id, v)}
            />
          ) : (
            <button
              ref={titleButton}
              type="button"
              title={chat.title}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={toggleMenu}
              className={`inline-flex h-9 max-w-full cursor-pointer items-center gap-1.5 rounded-[10px] pr-2 pl-3 text-sm hover:bg-app-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-text ${
                menuOpen ? 'bg-app-hover' : ''
              }`}
            >
              <span className="min-w-0 truncate">{chat.title}</span>
              <Icon name="chevD" size={16} className="text-app-text-dim" />
            </button>
          ))}
      </div>

      {chat && <ReferencedDocs open={docsOpen} count={docsCount} onToggle={onToggleDocs} buttonRef={docsButtonRef} />}

      {chat && menu && menuOpen && (
        <ContextMenu
          target={{ kind: 'chat', id: chat.id, trigger: menu.trigger }}
          chats={store.chats}
          groups={store.groups}
          onClose={closeMenu}
          onTogglePin={store.togglePin}
          onStartRename={(id) => setRenamingId(id)}
          onMove={store.moveChat}
          onMoveToNewGroup={(id, name) => store.moveChat(id, store.addGroup(name))}
          onAskDeleteChat={(id) => setDeletingId(id)}
          onStartRenameGroup={noop}
          onNewGroup={noop}
          onAskDeleteGroup={noop}
        />
      )}

      {chat && deleting && (
        <ConfirmDialog
          title="Delete chat?"
          body={`This will permanently delete \u201C${chat.title}\u201D from this browser.`}
          confirmLabel="Delete"
          onCancel={() => setDeletingId(null)}
          onConfirm={() => {
            onDeleteChat(chat.id)
            setDeletingId(null)
          }}
        />
      )}
    </header>
  )
}
