import ShowMoreButton from './ShowMoreButton'
import useCollapsible, { COLLAPSED_CLASS } from '../hooks/useCollapsible'

export default function UserBubble({ text, time }: { text: string; time: string }) {
  const { body, isLong, expanded, collapsed, toggle } = useCollapsible(text)

  return (
    <div className="flex justify-end">
      <div className="max-w-[86%] min-w-0 rounded-[18px_18px_4px_18px] border border-app-primary/35 bg-app-user-bubble px-3.5 pt-2.5 pb-1.5 whitespace-pre-wrap [overflow-wrap:anywhere]">
        <div ref={body} className={collapsed ? COLLAPSED_CLASS : ''}>
          {text}
        </div>
        <div className="mt-1 flex items-center gap-2">
          {isLong && <ShowMoreButton expanded={expanded} onClick={toggle} tone="soft" />}
          <span className="ml-auto font-mono text-micro text-app-text-dim">{time}</span>
        </div>
      </div>
    </div>
  )
}
