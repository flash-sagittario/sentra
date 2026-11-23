import { Fragment } from 'react'
import AnswerBubble from './AnswerBubble'
import UserBubble from './UserBubble'
import type { ChatMessage } from '../types/chat'

interface Props {
  messages: ChatMessage[]
  scope: string
  /** the question and answer to outline for a moment after a jump from the references panel */
  highlightId: string | null
  onShowSources: (messageId: string) => void
}

export default function MessageList({ messages, scope, highlightId, onShowSources }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-190 flex-col gap-3.5">
      <div className="self-center rounded-lg bg-app-hover px-3 py-1 font-mono text-xs text-app-text-dim">Today</div>
      {messages.map((m) => (
        <Fragment key={m.id}>
          <div id={`question-${m.id}`} className="scroll-mt-3">
            <UserBubble text={m.question} time={m.askedAt} />
          </div>
          <AnswerBubble message={m} scope={scope} highlighted={m.id === highlightId} onShowSources={onShowSources} />
        </Fragment>
      ))}
    </div>
  )
}
