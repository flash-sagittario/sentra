import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Icon, { type IconName } from './Icon'
import InlineInput from './InlineInput'
import useIsDock from '../hooks/useIsDock'
import { UNCATEGORIZED_ID } from '../lib/chatStore'
import type { ChatGroup, ChatSummary } from '../types/chat'

export type MenuTarget =
  | { kind: 'chat'; id: number; trigger: HTMLElement }
  | { kind: 'group'; id: string; trigger: HTMLElement }

interface Props {
  target: MenuTarget
  chats: ChatSummary[]
  groups: ChatGroup[]
  onClose: (restoreFocus: boolean) => void
  onTogglePin: (id: number) => void
  onStartRename: (id: number) => void
  onMove: (id: number, groupId: string) => void
  onMoveToNewGroup: (id: number, name: string) => void
  onAskDeleteChat: (id: number) => void
  onStartRenameGroup: (id: string) => void
  onNewGroup: () => void
  onAskDeleteGroup: (id: string) => void
}

const POP =
  'fixed z-50 flex flex-col gap-0.5 p-1.5 bg-app-card border border-app-border rounded-xl shadow-popup outline-none font-ui text-app-text antialiased max-h-[calc(100dvh-16px)] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--color-app-raised)_transparent]'

const ITEM =
  'flex-none w-full h-9 inline-flex items-center justify-start gap-2.5 px-2.5 rounded-lg text-label text-left cursor-pointer hover:bg-app-hover focus-visible:bg-app-hover focus-visible:outline-none'

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
  current = false,
  submenu = false,
  expanded,
}: {
  icon?: IconName
  label: string
  onClick: () => void
  danger?: boolean
  current?: boolean
  submenu?: boolean
  expanded?: boolean
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-sub={submenu ? '' : undefined}
      aria-haspopup={submenu ? 'menu' : undefined}
      aria-expanded={submenu ? expanded : undefined}
      onClick={onClick}
      className={`${ITEM} ${danger ? 'text-app-error' : 'text-app-text'} ${current ? 'bg-app-hover' : ''}`}
    >
      {icon && <Icon name={icon} size={16} />}
      <span className="flex-1 min-w-0 truncate">{label}</span>
      {current && <Icon name="check" size={16} />}
      {submenu && <Icon name="chevR" size={16} />}
    </button>
  )
}

function Divider() {
  return <hr className="my-1 border-0 border-t border-app-raised" />
}

export default function ContextMenu(props: Props) {
  const { target, chats, groups, onClose } = props
  const isDock = useIsDock()
  const [sub, setSub] = useState(false)
  const [creating, setCreating] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)
  const subRef = useRef<HTMLDivElement>(null)

  const chat = target.kind === 'chat' ? chats.find((c) => c.id === target.id) : undefined

  // Position next to the three-dot button. Styles are written straight to the DOM
  // before paint, so the menu never flashes in the wrong place.
  useLayoutEffect(() => {
    const m = mainRef.current
    if (!m) return
    const r = target.trigger.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const W = Math.min(190, vw - 16)
    m.style.width = `${W}px`
    const mh = m.offsetHeight
    const L = Math.max(8, Math.min(r.right - W, vw - W - 8))
    let T = r.bottom + 4
    if (T + mh > vh - 8) T = Math.max(8, r.top - 4 - mh)
    m.style.left = `${L}px`
    m.style.top = `${T}px`

    const f = subRef.current
    if (f) {
      const FW = Math.min(190, vw - 16)
      f.style.width = `${FW}px`
      const fh = f.offsetHeight
      let FL = L + W + 6
      if (FL + FW > vw - 8) FL = L - 6 - FW
      FL = Math.max(8, FL)
      const item = m.querySelector<HTMLElement>('[data-sub]')
      const itemTop = item ? T + item.offsetTop : T
      const FT = Math.max(8, Math.min(itemTop - 7, vh - 8 - fh))
      f.style.left = `${FL}px`
      f.style.top = `${FT}px`
    }
  }, [target, sub, creating, isDock])

  // Move focus into the menu (or its submenu) whenever the visible panel changes.
  useEffect(() => {
    if (creating) return
    const root = subRef.current ?? mainRef.current
    root?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [sub, creating, isDock])

  function closeSub() {
    setSub(false)
    setCreating(false)
    setTimeout(() => mainRef.current?.querySelector<HTMLElement>('[data-sub]')?.focus(), 0)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      e.preventDefault()
      if (creating) {
        setCreating(false)
        return
      }
      if (sub) {
        closeSub()
        return
      }
      onClose(true)
    }
    function onClick(e: MouseEvent) {
      const t = e.target as Node
      if (mainRef.current?.contains(t) || subRef.current?.contains(t) || target.trigger.contains(t)) return
      onClose(false)
    }
    let width = window.innerWidth
    function onResize() {
      if (window.innerWidth === width) return
      width = window.innerWidth
      onClose(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('resize', onResize)
    }
  })

  function onPanelKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    const t = e.target as HTMLElement
    if (t.tagName === 'INPUT') return
    if (e.key === 'Tab') {
      e.preventDefault()
      onClose(true)
      return
    }
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    const i = items.indexOf(t)
    const focusAt = (n: number) => {
      e.preventDefault()
      items[(n + items.length) % items.length]?.focus()
    }
    if (e.key === 'ArrowDown') focusAt(i + 1)
    else if (e.key === 'ArrowUp') focusAt(i - 1)
    else if (e.key === 'Home') focusAt(0)
    else if (e.key === 'End') focusAt(items.length - 1)
    else if (e.key === 'ArrowRight' && t.dataset.sub !== undefined) {
      e.preventDefault()
      if (sub && subRef.current) subRef.current.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
      else setSub(true)
    } else if (e.key === 'ArrowLeft' && sub && (e.currentTarget === subRef.current || !isDock)) {
      e.preventDefault()
      closeSub()
    }
  }

  const run = (fn: () => void) => () => {
    fn()
    onClose(false)
  }

  let panels: ReactNode = null

  if (target.kind === 'chat' && chat) {
    const groupItems = (
      <>
        {groups.map((g) => (
          <MenuItem
            key={g.id}
            label={g.name}
            current={g.id === chat.groupId}
            onClick={() => {
              if (g.id === chat.groupId) return
              props.onMove(chat.id, g.id)
              onClose(false)
            }}
          />
        ))}
        <Divider />
        {creating ? (
          <InlineInput
            initial=""
            placeholder="Group name"
            maxLength={30}
            label="New group name"
            saveOnBlur={false}
            className="block w-[calc(100%-20px)] mx-2.5 mt-1 mb-1.5"
            onDone={(v) => {
              if (v === null) {
                setCreating(false)
              } else {
                props.onMoveToNewGroup(chat.id, v)
                onClose(false)
              }
            }}
          />
        ) : (
          <MenuItem icon="plus" label="New group" onClick={() => setCreating(true)} />
        )}
      </>
    )

    if (sub && !isDock) {
      panels = (
        <div ref={mainRef} role="menu" tabIndex={-1} className={POP} onKeyDown={onPanelKey}>
          <MenuItem icon="chevL" label="Move to group" onClick={closeSub} />
          <Divider />
          {groupItems}
        </div>
      )
    } else {
      panels = (
        <>
          <div ref={mainRef} role="menu" tabIndex={-1} className={POP} onKeyDown={onPanelKey}>
            <MenuItem icon="pin" label={chat.pinned ? 'Unpin' : 'Pin'} onClick={run(() => props.onTogglePin(chat.id))} />
            <MenuItem icon="pencil" label="Rename" onClick={run(() => props.onStartRename(chat.id))} />
            <MenuItem
              icon="folder"
              label="Move to group"
              submenu
              expanded={sub}
              onClick={() => {
                setSub((s) => !s)
                setCreating(false)
              }}
            />
            <Divider />
            <MenuItem icon="trash" label="Delete" danger onClick={run(() => props.onAskDeleteChat(chat.id))} />
          </div>
          {sub && (
            <div ref={subRef} role="menu" tabIndex={-1} className={POP} onKeyDown={onPanelKey}>
              {groupItems}
            </div>
          )}
        </>
      )
    }
  } else if (target.kind === 'group') {
    const id = target.id
    panels = (
      <div ref={mainRef} role="menu" tabIndex={-1} className={POP} onKeyDown={onPanelKey}>
        {id === UNCATEGORIZED_ID ? (
          <MenuItem icon="plus" label="New group" onClick={run(props.onNewGroup)} />
        ) : (
          <>
            <MenuItem icon="pencil" label="Rename group" onClick={run(() => props.onStartRenameGroup(id))} />
            <MenuItem icon="plus" label="New group" onClick={run(props.onNewGroup)} />
            <Divider />
            <MenuItem icon="trash" label="Delete group" danger onClick={run(() => props.onAskDeleteGroup(id))} />
          </>
        )}
      </div>
    )
  }

  if (!panels) return null
  return createPortal(panels, document.body)
}
