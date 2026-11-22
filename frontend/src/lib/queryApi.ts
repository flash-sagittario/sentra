import { apiFetch } from './api'

// TODO: confirm this matches NO_INFO_REPLY in the backend (main.py). Sources are hidden
// when the answer contains it. The text below is the one used in the mockup.
export const NO_INFO_REPLY = 'I could not find this in the documents available to your role.'
export const REQUEST_FAILED_REPLY = 'Something went wrong. Please try again.'

// The backend refuses a question it will not process (for example one over the length limit)
// with a 422 and a readable message. The message is safe to show to the person.
export class QueryRejectedError extends Error {}

export interface QueryChunk {
  filename?: string | null
}

export interface QueryResult {
  answer: string
  chunks: QueryChunk[]
  model?: string
}

export async function askQuery(query: string): Promise<QueryResult> {
  const res = await apiFetch('/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
  if (res.status === 422) {
    // FastAPI's own validation errors send a list here; only a plain string is ours to show.
    const body = await res.json().catch(() => null)
    if (typeof body?.detail === 'string') throw new QueryRejectedError(body.detail)
  }
  if (!res.ok) throw new Error(`Query failed with status ${res.status}`)
  return res.json()
}

// The backend ends a normal answer with "\n\nSources: a.pdf, b.pdf" (written by code in
// prompts.py, listing only the files the model said it used). Only a block at the very end
// counts, so the word "Sources:" in the middle of an answer is never cut.
const SOURCES_TAIL = /\n\nSources:[ \t]*([^\n]+?)\s*$/

export interface SplitAnswer {
  text: string
  sources: string[]
}

// Splits the answer into the text to show and the files it relied on. No Sources block means
// no sources: the backend already lists every retrieved file itself when the model gives no
// usable USED line, so showing retrieved files here would show files the answer did not use.
export function splitAnswer(answer: string): SplitAnswer {
  if (answer.includes(NO_INFO_REPLY)) return { text: answer, sources: [] }
  const match = SOURCES_TAIL.exec(answer)
  if (!match) return { text: answer, sources: [] }
  const names = match[1].split(',').map((n) => n.trim()).filter(Boolean)
  return { text: answer.slice(0, match.index).trimEnd(), sources: [...new Set(names)] }
}
