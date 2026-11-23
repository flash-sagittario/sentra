import { Fragment } from 'react'
import BrandMark from './BrandMark'
import Icon from './Icon'
import ShowMoreButton from './ShowMoreButton'
import useCollapsible, { COLLAPSED_CLASS } from '../hooks/useCollapsible'
import { parseAnswer, splitInline, type ListNode } from '../lib/parseAnswer'
import type { ChatMessage } from '../types/chat'

// Plain-text answers: blank line = new paragraph, "- " / "* " / "• " lines = bullets, "1. " lines =
// numbered list (nested by indent), **keyword** = underlined keyword (never bold). lib/parseAnswer.ts
// reads the text into blocks; everything is rendered as React text, never as HTML.
// The mockup's keyword style: white text with a 2px primary underline, 3px below the text.
const KEYWORD = 'text-white underline decoration-app-primary decoration-2 underline-offset-[3px]'

function Inline({ text }: { text: string }) {
  return (
    <>
      {splitInline(text).map((s, i) =>
        s.keyword ? (
          <span key={i} className={KEYWORD}>
            {s.text}
          </span>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </>
  )
}

const LIST_ITEM = 'mb-1.5 pl-1 leading-6 marker:font-semibold marker:text-app-primary'

function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((l, j) => (
        <Fragment key={j}>
          {j > 0 && <br />}
          <Inline text={l} />
        </Fragment>
      ))}
    </>
  )
}

function ListView({ list, depth = 0 }: { list: ListNode; depth?: number }) {
  const Tag = list.ordered ? 'ol' : 'ul'
  const marker = list.ordered ? 'list-decimal' : depth === 0 ? 'list-disc' : 'list-[circle]'
  return (
    <Tag start={list.ordered ? list.start : undefined} className={`list-outside pl-5.5 ${marker} ${depth === 0 ? 'mb-3' : 'mt-1.5'}`}>
      {list.items.map((item, j) => (
        <li key={j} className={LIST_ITEM}>
          <Lines text={item.text} />
          {item.children.map((child, k) => (
            <ListView key={k} list={child} depth={depth + 1} />
          ))}
        </li>
      ))}
    </Tag>
  )
}

function AnswerText({ text }: { text: string }) {
  return (
    <>
      {parseAnswer(text).map((block, i) =>
        block.kind === 'list' ? (
          <ListView key={i} list={block.list} />
        ) : (
          <p key={i} className="mb-3 leading-6">
            <Lines text={block.lines.join('\n')} />
          </p>
        ),
      )}
    </>
  )
}

// Outline drawn around the bubble and its tail for a moment after a jump from the panel. It is the
// mockup's shape: an even-odd cut-out of the bubble outline, so only a 2px ring is left visible.
const HIGHLIGHT_OUTLINE =
  'polygon(evenodd,0.26px 0.00px,calc(100% - 16.00px) 0.00px,calc(100% - 16.00px) 0.00px,calc(100% - 12.88px) 0.31px,calc(100% - 9.88px) 1.22px,calc(100% - 7.11px) 2.70px,calc(100% - 4.69px) 4.69px,calc(100% - 2.70px) 7.11px,calc(100% - 1.22px) 9.88px,calc(100% - 0.31px) 12.88px,calc(100% - 0.00px) 16.00px,calc(100% - 0.00px) calc(100% - 16.00px),calc(100% - 0.00px) calc(100% - 16.00px),calc(100% - 0.31px) calc(100% - 12.88px),calc(100% - 1.22px) calc(100% - 9.88px),calc(100% - 2.70px) calc(100% - 7.11px),calc(100% - 4.69px) calc(100% - 4.69px),calc(100% - 7.11px) calc(100% - 2.70px),calc(100% - 9.88px) calc(100% - 1.22px),calc(100% - 12.88px) calc(100% - 0.31px),calc(100% - 16.00px) calc(100% - 0.00px),25.00px calc(100% - 0.00px),25.00px calc(100% - 0.00px),21.88px calc(100% - 0.31px),18.88px calc(100% - 1.22px),16.11px calc(100% - 2.70px),13.69px calc(100% - 4.69px),11.70px calc(100% - 7.11px),10.22px calc(100% - 9.88px),9.31px calc(100% - 12.88px),9.00px calc(100% - 16.00px),9.00px 13.10px,0.26px 0.00px,4.00px 2.00px,calc(100% - 16.00px) 2.00px,calc(100% - 16.00px) 2.00px,calc(100% - 13.27px) 2.27px,calc(100% - 10.64px) 3.07px,calc(100% - 8.22px) 4.36px,calc(100% - 6.10px) 6.10px,calc(100% - 4.36px) 8.22px,calc(100% - 3.07px) 10.64px,calc(100% - 2.27px) 13.27px,calc(100% - 2.00px) 16.00px,calc(100% - 2.00px) calc(100% - 16.00px),calc(100% - 2.00px) calc(100% - 16.00px),calc(100% - 2.27px) calc(100% - 13.27px),calc(100% - 3.07px) calc(100% - 10.64px),calc(100% - 4.36px) calc(100% - 8.22px),calc(100% - 6.10px) calc(100% - 6.10px),calc(100% - 8.22px) calc(100% - 4.36px),calc(100% - 10.64px) calc(100% - 3.07px),calc(100% - 13.27px) calc(100% - 2.27px),calc(100% - 16.00px) calc(100% - 2.00px),25.00px calc(100% - 2.00px),25.00px calc(100% - 2.00px),22.27px calc(100% - 2.27px),19.64px calc(100% - 3.07px),17.22px calc(100% - 4.36px),15.10px calc(100% - 6.10px),13.36px calc(100% - 8.22px),12.07px calc(100% - 10.64px),11.27px calc(100% - 13.27px),11.00px calc(100% - 16.00px),11.00px 12.50px,4.00px 2.00px)'

interface Props {
  message: ChatMessage
  scope: string
  /** outlined for a moment after a jump from the references panel */
  highlighted?: boolean
  onShowSources: (messageId: string) => void
}

export default function AnswerBubble({ message, scope, highlighted = false, onShowSources }: Props) {
  const answer = message.answer
  const { body, isLong, expanded, collapsed, toggle } = useCollapsible(answer)
  const count = message.sources.length
  const noun = count === 1 ? 'reference' : 'references'

  return (
    <div className="flex items-start gap-2">
      <div className="grid size-8 flex-none place-items-center rounded-full bg-app-raised">
        <BrandMark size={18} />
      </div>
      <div
        className={`relative min-w-0 max-w-[min(calc(100%-40px),660px)] bg-app-hover px-3.5 pt-2.5 pb-2 [overflow-wrap:anywhere] ${
          highlighted ? 'rounded-[0_14px_14px_14px]' : 'rounded-[4px_14px_14px_14px]'
        }`}
      >
        <i className="absolute top-0 -left-[7px] h-3 w-2 bg-app-hover [clip-path:polygon(100%_0,0_0,100%_100%)]" aria-hidden="true" />
        {highlighted && (
          <span
            aria-hidden="true"
            style={{ clipPath: HIGHLIGHT_OUTLINE }}
            className="pointer-events-none absolute -top-0.5 -right-0.5 -bottom-0.5 -left-2.75 animate-hit-fade bg-app-primary motion-reduce:animate-none"
          />
        )}
        <div className="mb-1.5 flex justify-between gap-4">
          <b className="font-semibold text-app-primary">Model {message.model}</b>
          <span className="self-center font-mono text-micro text-app-text-dim">scope: {scope}</span>
        </div>

        {answer === null ? (
          <div className="flex py-1.5" role="status" aria-label="Loading answer">
            {[0, 150, 300].map((delay) => (
              <i
                key={delay}
                style={{ animationDelay: `${delay}ms` }}
                className="mr-[5px] inline-block size-1.5 rounded-full bg-app-text-dim animate-signin-blink motion-reduce:animate-none motion-reduce:opacity-60"
              />
            ))}
          </div>
        ) : (
          <>
            <div
              ref={body}
              className={`tracking-[0.012em] [&>:last-child]:mb-0 ${collapsed ? COLLAPSED_CLASS : ''}`}
            >
              <AnswerText text={answer} />
            </div>
            
            <div className="mt-2 flex items-center gap-2">
              {isLong && <ShowMoreButton expanded={expanded} onClick={toggle} className="flex-none" />}
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => onShowSources(message.id)}
                  aria-label={`Show ${count} ${noun} in the panel`}
                  title="Open in the side panel"
                  className="relative inline-flex h-7 max-w-full cursor-pointer items-center gap-1.5 rounded-full border border-app-border-strong px-2.5 font-mono text-micro text-app-text-dim after:absolute after:-inset-x-1 after:-inset-y-2 hover:border-app-text-dim hover:bg-app-raised hover:text-app-text focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-text"
                >
                  <Icon name="file" size={14} className="text-app-primary" />
                  {count} {noun}
                </button>
              )}
              {message.answeredAt && <span className="ml-auto font-mono text-micro text-app-text-dim">{message.answeredAt}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
