import prefixVocabFile from "../data/prefixVocab.json"

export const PREFIXES = ["trans", "pro", "pre", "in", "re", "st", "con", "sub", "under", "fac"] as const

export type PrefixId = (typeof PREFIXES)[number]

export interface PrefixEntry {
  id: string
  prefix: PrefixId
  number: number
  word: string
  meaning: string
}

/** A chip that selects words already stored under `after`. It does not add rows. */
export interface PrefixSubset {
  id: "con+4"
  label: string
  hint: string
  after: PrefixId
  matches: (entry: PrefixEntry) => boolean
}

/** con followed by exactly four letters: seven-letter headwords such as conform. */
export function isConPlusFour(entry: PrefixEntry): boolean {
  return entry.prefix === "con" && /^con[a-z]{4}$/i.test(entry.word)
}

export const PREFIX_SUBSETS: readonly PrefixSubset[] = [
  {
    id: "con+4",
    label: "con+4",
    hint: "con 开头且后面正好 4 个字母",
    after: "con",
    matches: isConPlusFour,
  },
]

export type PrefixSubsetId = PrefixSubset["id"]

export type PrefixFilterId = PrefixId | PrefixSubsetId

interface PrefixFile {
  source: { bookId: string; title: string }
  prefixes: Record<string, { number: number; word: string; meaning: string }[]>
}

const file = prefixVocabFile as PrefixFile
const filePrefixes = Object.keys(file.prefixes)

if (filePrefixes.length !== PREFIXES.length || PREFIXES.some((prefix, index) => filePrefixes[index] !== prefix)) {
  throw new Error(`prefixVocab.json prefixes must be ${PREFIXES.join(", ")}`)
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

export function isPrefixSubsetId(value: string | null): value is PrefixSubsetId {
  return PREFIX_SUBSETS.some((subset) => subset.id === value)
}

/** Map the prefix query to a filter. A raw "+" in the hash is read as a space. */
export function parsePrefixFilter(value: string | null): PrefixFilterId | "all" {
  const normalized = value === "con 4" ? "con+4" : value
  if (isPrefixId(normalized) || isPrefixSubsetId(normalized)) return normalized
  return "all"
}

export function matchesPrefixFilter(entry: PrefixEntry, filter: PrefixFilterId | "all"): boolean {
  if (filter === "all") return true
  if (isPrefixId(filter)) return entry.prefix === filter
  return PREFIX_SUBSETS.find((subset) => subset.id === filter)?.matches(entry) ?? false
}
