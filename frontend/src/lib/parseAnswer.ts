// Turns an answer's plain text into blocks the bubble can render: paragraphs and lists.
// It reads the shapes Gemini really writes:
//   - bullets as "- ", "* " or "• ", numbered items as "1. " or "1) "
//   - an intro line directly above a list ("Here are the steps:" then the items)
//   - nested items, indented by 2 or more spaces
//   - a blank line between items (one list, not many)
//   - a list interrupted by a paragraph: the next numbered list keeps counting (2., 3., ...)
// Inline "**text**" marks a keyword (see splitInline). Labels such as "**Annual leave:**" are not keywords.
// Nothing here produces HTML. The result is plain data that React renders as text.

export interface ListItem {
  text: string
  children: ListNode[]
}

export interface ListNode {
  ordered: boolean
  start: number
  items: ListItem[]
}

export type Block = { kind: 'p'; lines: string[] } | { kind: 'list'; list: ListNode }

// indent, marker (bullet or "12." / "12)"), text. The marker must be followed by a space, so
// "**bold** start" and "-5 degrees" stay paragraphs.
const ITEM = /^([ \t]*)([-*\u2022]|\d{1,3}[.)])[ \t]+(\S.*)$/

interface Level {
  indent: number
  list: ListNode
}

export function parseAnswer(text: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let stack: Level[] = []
  let blankSeen = false

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: 'p', lines: para })
      para = []
    }
  }

  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd()

    if (!line.trim()) {
      flushPara()
      if (stack.length) blankSeen = true // a list may continue after a blank line
      continue
    }

    const m = ITEM.exec(line)
    if (m) {
      flushPara()
      const indent = m[1].replace(/\t/g, '  ').length
      const ordered = /\d/.test(m[2])
      const item: ListItem = { text: m[3], children: [] }

      while (stack.length && indent < stack[stack.length - 1].indent) stack.pop()
      const top = stack[stack.length - 1]

      if (top && indent === top.indent && top.list.ordered === ordered) {
        top.list.items.push(item)
      } else {
        if (top && indent === top.indent) stack.pop() // same depth, other type: start a new list
        const list: ListNode = { ordered, start: ordered ? parseInt(m[2], 10) : 1, items: [item] }
        const parent = stack[stack.length - 1]
        if (parent) parent.list.items[parent.list.items.length - 1].children.push(list)
        else blocks.push({ kind: 'list', list })
        stack.push({ indent, list })
      }
      blankSeen = false
      continue
    }

    // Plain text line.
    const indented = /^[ \t]{2,}/.test(raw)
    if (stack.length && indented && !blankSeen) {
      // wrapped line of the last list item
      const list = stack[stack.length - 1].list
      const last = list.items[list.items.length - 1]
      last.text += '\n' + line.trim()
      continue
    }
    stack = []
    blankSeen = false
    para.push(line)
  }

  flushPara()
  return blocks
}

export interface Segment {
  text: string
  keyword: boolean
}

// Splits one line of text into plain pieces and keywords. A keyword is text wrapped in double
// asterisks. A label is not a keyword: "**Annual leave:** 20 days" and "**Annual leave**: 20 days"
// both come out as plain text, without the asterisks. Unpaired asterisks stay as they are.
export function splitInline(text: string): Segment[] {
  const out: Segment[] = []
  for (const part of text.split(/(\*\*[^*]+\*\*:?)/g)) {
    if (!part) continue
    const m = /^\*\*([^*]+)\*\*(:?)$/.exec(part)
    if (!m) {
      out.push({ text: part, keyword: false })
      continue
    }
    const inner = m[1]
    const colon = m[2]
    const isLabel = colon !== '' || inner.trimEnd().endsWith(':')
    out.push({ text: inner + colon, keyword: !isLabel && inner.trim() !== '' })
  }
  return out
}
