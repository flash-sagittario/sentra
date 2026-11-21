import { useCallback, useRef, useState } from 'react'
import type { ChatGroup, ChatMessage, ChatSummary } from '../types/chat'
import { SAMPLE_MESSAGES } from './sampleMessages'

// Sample data only. When the storage decision is made (localStorage per account),
// replace the two useState initialisers below. Nothing else needs to change.

export const UNCATEGORIZED_ID = 'uncategorized'

const SAMPLE_GROUPS: ChatGroup[] = [
  { id: 'leave', name: 'Leave and holidays' },
  { id: 'it', name: 'IT policies' },
  { id: UNCATEGORIZED_ID, name: 'Uncategorized' },
]

function sampleChats(): ChatSummary[] {
  const chat = (id: number, title: string, groupId: string, pinned = false): ChatSummary => ({
    id,
    title,
    groupId,
    pinned,
    rank: id,
  })
  const cycle = ['leave', 'it', UNCATEGORIZED_ID]
  const recent = [
    'Parental leave policy',
    'VPN setup steps',
    'Expense reimbursement',
    'Security training dates',
    'Remote work rules',
    'Laptop refresh cycle',
    'Onboarding checklist',
    'Visitor protocol',
    'Dress code',
    'Meeting room booking',
  ]
  const older = [
    'Badge replacement',
    'Travel booking process',
    'Office hours',
    'Printer access',
    'Guest wifi',
    'Parking allocation',
    'Lost and found',
  ]
  return [
    chat(29, "Compromised account steps", 'it'),
    chat(28, "Parental leave in detail", 'leave'),
    chat(27, "New joiner first week", 'it'),
    chat(26, "Sick leave certificate", 'leave'),
    chat(25, "Lost laptop", 'it'),
    chat(24, "Carry over annual leave", 'leave'),
    chat(23, "Password reset", 'it'),
    chat(22, "VPN for email", 'it'),
    chat(21, "Public holidays in 2026", 'leave'),
    chat(15, "Long text check", UNCATEGORIZED_ID),
    chat(14, "Handbook overview", UNCATEGORIZED_ID),
    chat(13, "Personal software on laptop", 'it'),
    chat(12, "Holiday calendar 2026", 'leave', true),
    chat(11, "Floating holiday rules", 'leave'),
    ...recent.map((title, i) => chat(1 + i, title, cycle[i % 3])),
    ...older.map((title, i) => chat(-(i + 1), title, UNCATEGORIZED_ID)),
  ]
}

export function useChatStore() {
  const [groups, setGroups] = useState<ChatGroup[]>(SAMPLE_GROUPS)
  const [chats, setChats] = useState<ChatSummary[]>(sampleChats)
  const [messages, setMessages] = useState<Record<number, ChatMessage[]>>(SAMPLE_MESSAGES)
  const nextGroup = useRef(1)
  const nextChat = useRef(30)
  // Sample chats use their id as rank (all below 1000); anything touched later ranks above them.
  const clock = useRef(1000)

  const togglePin = useCallback((id: number) => {
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)))
  }, [])

  const renameChat = useCallback((id: number, title: string) => {
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)))
  }, [])

  // A moved chat counts as recent, so it appears at the top of its new group instead of
  // dropping out of the sidebar's "newest chats" window.
  const moveChat = useCallback((id: number, groupId: string) => {
    const rank = ++clock.current
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, groupId, rank } : c)))
  }, [])

  const deleteChat = useCallback((id: number) => {
    setChats((cs) => cs.filter((c) => c.id !== id))
    setMessages((ms) => {
      const next = { ...ms }
      delete next[id]
      return next
    })
  }, [])

  // New chats start in Uncategorized and, having the highest id, sort to the top.
  const createChat = useCallback((title: string) => {
    const id = nextChat.current++
    const rank = ++clock.current
    setChats((cs) => [...cs, { id, title, groupId: UNCATEGORIZED_ID, pinned: false, rank }])
    return id
  }, [])

  // A new message makes its chat the most recent one.
  const addMessage = useCallback((chatId: number, message: ChatMessage) => {
    const rank = ++clock.current
    setMessages((ms) => ({ ...ms, [chatId]: [...(ms[chatId] ?? []), message] }))
    setChats((cs) => cs.map((c) => (c.id === chatId ? { ...c, rank } : c)))
  }, [])

  // Does nothing if the chat was deleted while the answer was loading.
  const updateMessage = useCallback((chatId: number, messageId: string, patch: Partial<ChatMessage>) => {
    setMessages((ms) =>
      ms[chatId] ? { ...ms, [chatId]: ms[chatId].map((m) => (m.id === messageId ? { ...m, ...patch } : m)) } : ms,
    )
  }, [])

  const addGroup = useCallback((name: string) => {
    const id = `group-${nextGroup.current++}`
    setGroups((gs) => [...gs, { id, name }])
    return id
  }, [])

  const renameGroup = useCallback((id: string, name: string) => {
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, name } : g)))
  }, [])

  // Chats in a deleted group move to Uncategorized.
  const deleteGroup = useCallback((id: string) => {
    setChats((cs) => cs.map((c) => (c.groupId === id ? { ...c, groupId: UNCATEGORIZED_ID } : c)))
    setGroups((gs) => gs.filter((g) => g.id !== id))
  }, [])

  return {
    chats,
    groups,
    messages,
    togglePin,
    renameChat,
    moveChat,
    deleteChat,
    createChat,
    addMessage,
    updateMessage,
    addGroup,
    renameGroup,
    deleteGroup,
  }
}

export type ChatStore = ReturnType<typeof useChatStore>
