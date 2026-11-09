import prefixVocabFile from "../data/prefixVocab.json"

export const PREFIXES = ["trans", "pro", "pre", "in", "re", "st"] as const

export type PrefixId = (typeof PREFIXES)[number]

export interface PrefixEntry {
  id: string
  prefix: PrefixId
  number: number
  word: string
  meaning: string
}

interface PrefixFile {
  source: { bookId: string; title: string }
  prefixes: Record<string, { number: number; word: string; meaning: string }[]>
}

const file = prefixVocabFile as PrefixFile
const filePrefixes = Object.keys(file.prefixes)

if (filePrefixes.length !== PREFIXES.length || PREFIXES.some((prefix, index) => filePrefixes[index] !== prefix)) {
  throw new Error("prefixVocab.json prefixes must be trans, pro, pre, in, re, st")
}

export const PREFIX_SOURCE = file.source

export const PREFIX_VOCAB: readonly PrefixEntry[] = PREFIXES.flatMap((prefix) =>
  file.prefixes[prefix].map((entry) => ({
    id: `${prefix}-${entry.number}`,
    prefix,
    number: entry.number,
    word: entry.word,
    meaning: entry.meaning,
  })),
)

export function isPrefixId(value: string | null): value is PrefixId {
  return PREFIXES.some((prefix) => prefix === value)
}
