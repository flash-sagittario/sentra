import { Fragment, useState, type KeyboardEvent, type MouseEvent } from 'react'
import BrandLockup from './BrandLockup'
import ConfirmDialog from './ConfirmDialog'
import ContextMenu, { type MenuTarget } from './ContextMenu'
import Icon, { type IconName } from './Icon'
import InlineInput from './InlineInput'
import { UNCATEGORIZED_ID, type ChatStore } from '../lib/chatStore'
import type { AppRole, ChatSummary, View } from '../types/chat'

const LIMIT = 10 // newest chats shown in the list before "View all"
const UNC_LIMIT = 10 // extra Uncategorized chats shown on top of LIMIT
const PINNED = 'pinned'

const ROLE_INITIALS: Record<AppRole, string> = { admin: 'AD', hr: 'HR', legal: 'LG', employee: 'EM' }

const NAV_BTN =
  'w-full h-10 mb-[3px] inline-flex items-center gap-2.5 px-2.5 rounded-[10px] text-sm font-semibold cursor-pointer hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none'

interface Props {
  open: boolean
  role: AppRole
  email: string
  view: View
  activeChatId: number | null
  store: ChatStore
  onClose: () => void
  onNewChat: () => void
  onSelectChat: (id: number) => void
  onNavigate: (view: 'upload' | 'audit' | 'all') => void
  onDeleteChat: (id: number) => void
  onSignOut: () => void
}

type PendingDelete = { kind: 'chat'; id: number } | { kind: 'group'; id: string }

function NavButton({ icon, label, active, onClick }: { icon: IconName; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`${NAV_BTN} ${active ? 'bg-app-hover' : ''}`}>
      <Icon name={icon} />
      {label}
    </button>
  )
}

// Hidden until the row or heading is hovered or keyboard-focused. On touch screens
// (no hover) it stays visible where the caller asks for it.
function DotsButton({
  label,
  forceVisible,
  touchVisible,
  onClick,
}: {
  label: string
  forceVisible: boolean
  touchVisible: boolean
  onClick: (e: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`w-7 h-7 inline-flex flex-none items-center justify-center rounded-lg text-app-muted hover:text-app-text hover:bg-app-raised focus-visible:outline-none focus-visible:opacity-100 focus-visible:bg-app-raised group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 ${
        forceVisible ? 'opacity-100' : 'opacity-0'
      } ${touchVisible ? '[@media(hover:none)]:opacity-100' : ''}`}
    >
      <Icon name="dotsV" />
    </button>
  )
}

function GroupHeading({
  title,
  collapsed,
  menuOpen = false,
  renaming = false,
  onToggle,
  onMenu,
  onRenameDone,
}: {
  title: string
  collapsed: boolean
  menuOpen?: boolean
  renaming?: boolean
  onToggle: () => void
  onMenu?: (e: MouseEvent<HTMLButtonElement>) => void
  onRenameDone?: (value: string | null) => void
}) {
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={!collapsed}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('input,button')) return
        onToggle()
      }}
      onKeyDown={onKeyDown}
      className={`group flex items-center gap-1 w-full h-9 mt-1 mb-0.5 pl-2.5 pr-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none ${
        menuOpen ? 'bg-app-hover' : ''
      }`}
    >
      {renaming && onRenameDone ? (
        <InlineInput initial={title} maxLength={30} label="Rename group" className="flex-1 mr-1" onDone={onRenameDone} />
      ) : (
        <span className="flex-1 min-w-0 truncate">{title}</span>
      )}
      {onMenu ? (
        <DotsButton label="Group options" forceVisible={menuOpen} touchVisible onClick={onMenu} />
      ) : (
        <span className="flex-none w-7" />
      )}
      <Icon name={collapsed ? 'chevR' : 'chevD'} size={16} className="text-app-text-dim" />
    </div>
  )
}

function ChatRow({
  chat,
  active,
  menuOpen,
  renaming,
  onSelect,
  onMenu,
  onRenameDone,
}: {
  chat: ChatSummary
  active: boolean
  menuOpen: boolean
  renaming: boolean
  onSelect: () => void
  onMenu: (e: MouseEvent<HTMLButtonElement>) => void
  onRenameDone: (value: string | null) => void
}) {
  const base =
    'group flex items-center gap-2 h-[34px] mb-0.5 pl-3.5 pr-1 rounded-lg text-sm before:size-[5px] before:flex-none before:rounded-full'

  if (renaming) {
    return (
      <div className={`${base} bg-app-hover text-app-text before:bg-app-primary`}>
        <InlineInput initial={chat.title} maxLength={40} label="Rename chat" className="flex-1" onDone={onRenameDone} />
      </div>
    )
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`${base} cursor-pointer hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none ${
        active ? 'bg-app-hover text-app-text before:bg-app-primary' : 'text-app-text-dim before:bg-app-muted'
      } ${menuOpen ? 'bg-app-hover' : ''}`}
    >
      <span className="flex-1 min-w-0 truncate">{chat.title}</span>
      <DotsButton
        label="Chat options"
        forceVisible={menuOpen}
        touchVisible={active}
        onClick={(e) => {
          e.stopPropagation()
          onMenu(e)
        }}
      />
    </div>
  )
}

export default function Sidebar({
  open,
  role,
  email,
  view,
  activeChatId,
  store,
  onClose,
  onNewChat,
  onSelectChat,
  onNavigate,
  onDeleteChat,
  onSignOut,
}: Props) {
  const { chats, groups } = store
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState<MenuTarget | null>(null)
  const [renamingChat, setRenamingChat] = useState<number | null>(null)
  const [renamingGroup, setRenamingGroup] = useState<string | null>(null)
  const [newGroupId, setNewGroupId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  const pins = chats.filter((c) => c.pinned).sort((a, b) => b.rank - a.rank)
  const rest = chats.filter((c) => !c.pinned).sort((a, b) => b.rank - a.rank)
  const visible = new Set(rest.slice(0, LIMIT).map((c) => c.id))
  rest.filter((c) => c.groupId === UNCATEGORIZED_ID).slice(0, UNC_LIMIT).forEach((c) => visible.add(c.id))

  const toggle = (key: string) => setCollapsed((s) => ({ ...s, [key]: !s[key] }))

  function toggleMenu(next: MenuTarget) {
    setMenu((cur) => (cur && cur.kind === next.kind && cur.id === next.id ? null : next))
  }

  function closeMenu(restoreFocus: boolean) {
    const trigger = menu?.trigger
    setMenu(null)
    if (restoreFocus && trigger) requestAnimationFrame(() => trigger.focus())
  }

  function finishChatRename(id: number, value: string | null) {
    setRenamingChat(null)
    if (value) store.renameChat(id, value)
  }

  function finishGroupRename(id: string, value: string | null) {
    setRenamingGroup(null)
    const wasNew = newGroupId === id
    setNewGroupId(null)
    if (value) store.renameGroup(id, value)
    else if (value === null && wasNew) store.deleteGroup(id)
  }

  function renderRow(c: ChatSummary) {
    return (
      <ChatRow
        key={c.id}
        chat={c}
        active={view === 'chat' && c.id === activeChatId}
        menuOpen={menu?.kind === 'chat' && menu.id === c.id}
        renaming={renamingChat === c.id}
        onSelect={() => onSelectChat(c.id)}
        onMenu={(e) => toggleMenu({ kind: 'chat', id: c.id, trigger: e.currentTarget })}
        onRenameDone={(v) => finishChatRename(c.id, v)}
      />
    )
  }

  let dialog = null
  if (pendingDelete?.kind === 'chat') {
    const c = chats.find((x) => x.id === pendingDelete.id)
    if (c) {
      dialog = (
        <ConfirmDialog
          title="Delete chat?"
          body={`This will permanently delete \u201C${c.title}\u201D from this browser.`}
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDeleteChat(c.id)
            setPendingDelete(null)
          }}
        />
      )
    }
  } else if (pendingDelete?.kind === 'group') {
    const g = groups.find((x) => x.id === pendingDelete.id)
    if (g) {
      const count = chats.filter((c) => c.groupId === g.id).length
      const body = count
        ? `The group \u201C${g.name}\u201D will be removed. Its ${count} ${count === 1 ? 'chat moves' : 'chats move'} to Uncategorized.`
        : `The empty group \u201C${g.name}\u201D will be removed.`
      dialog = (
        <ConfirmDialog
          title="Delete group?"
          body={body}
          confirmLabel="Delete group"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            store.deleteGroup(g.id)
            setPendingDelete(null)
          }}
        />
      )
    }
  }

  return (
    <aside
      aria-label="Sidebar"
      inert={!open}
      className={`absolute inset-y-0 left-0 z-30 flex w-[min(320px,86%)] max-xs:w-full overflow-hidden bg-app-card transition-[translate] duration-300 ease-lift motion-reduce:duration-0 dock:relative dock:z-auto dock:flex-none dock:transition-[width] ${
        open ? 'translate-x-0 dock:w-80' : '-translate-x-full dock:w-0 dock:translate-x-0'
      }`}
    >
      <div
        className={`flex min-w-0 flex-1 flex-col px-2 pt-2.5 dock:w-80 dock:flex-none dock:transition-opacity motion-reduce:duration-0 motion-reduce:delay-0 ${
          open ? 'dock:opacity-100 dock:delay-75 dock:duration-250' : 'dock:opacity-0 dock:duration-150'
        }`}
      >
        <div className="flex-none">
          <div className="flex items-center justify-between pt-1 pr-1 pb-3 pl-2">
            <BrandLockup size={24} />
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={onClose}
              className="size-9 inline-flex items-center justify-center rounded-lg cursor-pointer hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none"
            >
              <Icon name="panel" />
            </button>
          </div>
          <NavButton icon="cplus" label="New chat" active={view === 'chat' && activeChatId === null} onClick={onNewChat} />
        </div>

        <div
          onScroll={(e) => {
            setScrolled(e.currentTarget.scrollTop > 0)
            if (menu) setMenu(null)
          }}
          className={`flex-1 min-h-0 overflow-y-auto pb-1.5 [scrollbar-width:thin] [scrollbar-color:var(--color-app-raised)_transparent] ${
            scrolled ? '[mask-image:linear-gradient(to_bottom,transparent_0,black_14px)]' : ''
          }`}
        >
          <div className="mb-4">
            {role === 'admin' && (
              <>
                <NavButton icon="upload" label="Upload" active={view === 'upload'} onClick={() => onNavigate('upload')} />
                <NavButton icon="audit" label="Audit log" active={view === 'audit'} onClick={() => onNavigate('audit')} />
              </>
            )}
          </div>

          {pins.length > 0 && (
            <>
              <GroupHeading title="Pinned" collapsed={!!collapsed[PINNED]} onToggle={() => toggle(PINNED)} />
              {!collapsed[PINNED] && pins.map(renderRow)}
            </>
          )}

          {groups.map((g) => (
            <Fragment key={g.id}>
              <GroupHeading
                title={g.name}
                collapsed={!!collapsed[g.id]}
                menuOpen={menu?.kind === 'group' && menu.id === g.id}
                renaming={renamingGroup === g.id}
                onToggle={() => toggle(g.id)}
                onMenu={(e) => toggleMenu({ kind: 'group', id: g.id, trigger: e.currentTarget })}
                onRenameDone={(v) => finishGroupRename(g.id, v)}
              />
              {!collapsed[g.id] && rest.filter((c) => c.groupId === g.id && visible.has(c.id)).map(renderRow)}
            </Fragment>
          ))}

          {rest.length > LIMIT && (
            <button
              type="button"
              onClick={() => onNavigate('all')}
              className="w-full h-9 mt-1 inline-flex items-center justify-between px-2.5 rounded-lg text-label text-app-text-dim cursor-pointer hover:text-app-text hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none"
            >
              <span>View all</span>
              <Icon name="chevR" size={16} />
            </button>
          )}
        </div>

        <div className="flex-none -mx-2 px-4 py-3 flex items-center gap-2.5 border-t border-app-border">
          <div className="size-8 flex-none grid place-items-center rounded-full bg-app-raised font-mono text-xs">
            {ROLE_INITIALS[role]}
          </div>
          <p className="m-0 flex-1 min-w-0 truncate text-label">{email}</p>
          <button
            type="button"
            aria-label="Sign out"
            onClick={onSignOut}
            className="w-7 h-7 flex-none inline-flex items-center justify-center rounded-lg text-app-muted cursor-pointer hover:text-app-text hover:bg-app-raised focus-visible:bg-app-raised focus-visible:outline-none"
          >
            <Icon name="logout" />
          </button>
        </div>
      </div>

      {menu && (
        <ContextMenu
          target={menu}
          chats={chats}
          groups={groups}
          onClose={closeMenu}
          onTogglePin={store.togglePin}
          onStartRename={(id) => setRenamingChat(id)}
          onMove={store.moveChat}
          onMoveToNewGroup={(id, name) => store.moveChat(id, store.addGroup(name))}
          onAskDeleteChat={(id) => setPendingDelete({ kind: 'chat', id })}
          onStartRenameGroup={(id) => setRenamingGroup(id)}
          onNewGroup={() => {
            const id = store.addGroup('New group')
            setNewGroupId(id)
            setRenamingGroup(id)
          }}
          onAskDeleteGroup={(id) => setPendingDelete({ kind: 'group', id })}
        />
      )}
      {dialog}
    </aside>
  )
}
