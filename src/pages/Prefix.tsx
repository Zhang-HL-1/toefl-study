import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  matchesPrefixFilter,
  parsePrefixFilter,
  PREFIXES,
  PREFIX_SOURCE,
  PREFIX_SUBSETS,
  PREFIX_VOCAB,
  type PrefixFilterId,
} from "../domain/prefixVocab"
import { useTitle } from "../hooks/useTitle"

const PAGE_SIZE = 100

export function Prefix() {
  const [params, setParams] = useSearchParams()
  const requested = params.get("prefix")
  const prefix: PrefixFilterId | "all" = parsePrefixFilter(requested)
  const [query, setQuery] = useState("")
  const [showGloss, setShowGloss] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  useTitle("词缀 Prefix · Atrium")

  const chips = useMemo(() => {
    const next: { id: PrefixFilterId; label: string; hint?: string; count: number; subset: boolean }[] = []
    for (const id of PREFIXES) {
      next.push({
        id,
        label: `${id}-`,
        count: PREFIX_VOCAB.filter((entry) => entry.prefix === id).length,
        subset: false,
      })
      for (const subset of PREFIX_SUBSETS) {
        if (subset.after !== id) continue
        next.push({
          id: subset.id,
          label: subset.label,
          hint: subset.hint,
          count: PREFIX_VOCAB.filter((entry) => subset.matches(entry)).length,
          subset: true,
        })
      }
    }
    return next
  }, [])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return PREFIX_VOCAB.filter((entry) => {
      if (!matchesPrefixFilter(entry, prefix)) return false
      if (!needle) return true
      return entry.word.toLowerCase().includes(needle) || entry.meaning.toLowerCase().includes(needle)
    })
  }, [prefix, query])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const activeSubset = PREFIX_SUBSETS.find((subset) => subset.id === prefix)
  const caption = prefix === "all" ? "全部前缀" : activeSubset ? `${activeSubset.label} · ${activeSubset.hint}` : `${prefix}-`

  function choosePrefix(next: PrefixFilterId | "all") {
    setPage(1)
    setOpenId(null)
    if (next === "all") setParams({}, { replace: true })
    else setParams({ prefix: next }, { replace: true })
  }

  return (
    <div className="prefix-page">
      <header className="hero">
        <p className="eyebrow">Prefix vocabulary</p>
        <h1>词缀</h1>
        <p className="lede">
          《{PREFIX_SOURCE.title}》里 {PREFIX_VOCAB.length} 个共享前缀的词，用来对照阅读填空里容易混在一起的 trans-、pro-、pre-、in-、re-、st-、con-、sub-、under-、fac-、ide-、fund-。
          con+4 选出 con 开头且后面正好 4 个字母的词，这些词仍在 con- 里。释义默认展开，也可以先藏起来再回忆。
        </p>
      </header>

      <div className="prefix-tabs" role="group" aria-label="前缀">
        <button
          type="button"
          className={`btn ${prefix === "all" ? "btn-primary" : "btn-ghost"}`}
          aria-pressed={prefix === "all"}
          onClick={() => choosePrefix("all")}
        >
          全部 <span className="prefix-count">{PREFIX_VOCAB.length}</span>
        </button>
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`btn ${chip.subset ? "prefix-subset" : ""} ${prefix === chip.id ? "btn-primary" : "btn-ghost"}`}
            aria-pressed={prefix === chip.id}
            title={chip.hint}
            aria-label={chip.hint ? `${chip.label}，${chip.count} 词，${chip.hint}` : undefined}
            onClick={() => choosePrefix(chip.id)}
          >
            {chip.label} <span className="prefix-count">{chip.count}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <label className="search-label" htmlFor="prefix-filter">
          <span className="sr">搜索单词</span>
          <input
            id="prefix-filter"
            name="prefix-filter"
            className="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
              setOpenId(null)
            }}
            placeholder="搜索单词或释义"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          className="btn btn-ghost"
          aria-pressed={showGloss}
          onClick={() => setShowGloss((value) => !value)}
        >
          {showGloss ? "隐藏释义" : "显示释义"}
        </button>
      </div>

      <p className="prefix-meta">
        {caption} · {filtered.length.toLocaleString()} 词
        {query.trim() ? " · 搜索结果" : ""}
      </p>

      {filtered.length === 0 ? (
        <p className="fine">没有符合的词。</p>
      ) : (
        <ul className="word-list">
          {visible.map((entry) => {
            const open = showGloss || openId === entry.id
            return (
              <li key={entry.id} className="word-row">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId((current) => (current === entry.id ? null : entry.id))}
                >
                  <span className="word-line">
                    <span className="word-lemma">{entry.word}</span>
                    <span className="word-pos">{entry.prefix}- · #{entry.number}</span>
                  </span>
                  {open ? (
                    <span className="word-detail">
                      <span className="gloss">{entry.meaning}</span>
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {filtered.length > visible.length ? (
        <div className="prefix-more">
          <button type="button" className="btn btn-ghost" onClick={() => setPage((value) => value + 1)}>
            再显示 {PAGE_SIZE} 词（共 {filtered.length.toLocaleString()} 词）
          </button>
        </div>
      ) : null}
    </div>
  )
}
