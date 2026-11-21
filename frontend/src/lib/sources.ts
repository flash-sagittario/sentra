import type { ChatMessage } from '../types/chat'

/** id of the panel element, so the navbar button can point at it with aria-controls */
export const SOURCES_PANEL_ID = 'sources-panel'

/** One question of the open chat that a document helped answer. */
export interface SourceQuestion {
  messageId: string
  question: string
  /** 24 hour HH:MM */
  askedAt: string
}

/** A document the answers in the open chat relied on, with the questions it helped answer. */
export interface SourceRef {
  filename: string
  questions: SourceQuestion[]
}

// One entry per document, in order of first use. Messages without sources (loading, failed or
// no-info answers) add nothing.
export function sourceRefsFrom(messages: ChatMessage[]): SourceRef[] {
  const byName = new Map<string, SourceQuestion[]>()
  for (const m of messages) {
    for (const filename of m.sources) {
      const questions = byName.get(filename) ?? []
      if (!questions.some((q) => q.messageId === m.id)) {
        questions.push({ messageId: m.id, question: m.question, askedAt: m.askedAt })
      }
      byName.set(filename, questions)
    }
  }
  return [...byName].map(([filename, questions]) => ({ filename, questions }))
}

// "report.final.pdf" -> stem "report.final", ext ".pdf". A leading dot is not an extension.
export function splitFilename(filename: string) {
  const dot = filename.lastIndexOf('.')
  return dot > 0 ? { stem: filename.slice(0, dot), ext: filename.slice(dot) } : { stem: filename, ext: '' }
}

export function fileMeta(filename: string) {
  const { ext } = splitFilename(filename)
  return `Document \u00b7 ${ext ? ext.slice(1).toUpperCase() : 'FILE'}`
}

// Filter of the main view: a document whose name matches keeps all its questions, otherwise
// only the questions that match stay, and documents left with none disappear.
export function filterRefs(refs: SourceRef[], query: string): SourceRef[] {
  const term = query.trim().toLowerCase()
  if (!term) return refs
  return refs.flatMap((ref) => {
    if (ref.filename.toLowerCase().includes(term)) return [ref]
    const questions = ref.questions.filter((q) => q.question.toLowerCase().includes(term))
    return questions.length > 0 ? [{ ...ref, questions }] : []
  })
}

// Filter of the Files page: names only.
export function filterFiles(refs: SourceRef[], query: string): SourceRef[] {
  const term = query.trim().toLowerCase()
  return term ? refs.filter((ref) => ref.filename.toLowerCase().includes(term)) : refs
}
