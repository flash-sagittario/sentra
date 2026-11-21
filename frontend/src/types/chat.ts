export type AppRole = 'admin' | 'hr' | 'legal' | 'employee'

export type View = 'chat' | 'upload' | 'audit' | 'all'

export interface ChatGroup {
  id: string
  name: string
}

export interface ChatSummary {
  id: number
  title: string
  groupId: string
  pinned: boolean
  /** recency: the sidebar lists higher ranks first. Moving a chat or sending a message raises it. */
  rank: number
}

export type ModelId = 'A' | 'B' | 'C'

export interface ChatMessage {
  id: string
  question: string
  /** 24 hour HH:MM */
  askedAt: string
  /** null while the answer is still loading */
  answer: string | null
  answeredAt?: string
  /** unique document filenames, empty when the answer is the no-info sentence */
  sources: string[]
  model: ModelId
  failed?: boolean
}
