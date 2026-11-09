import { useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { isPrefixId, PREFIXES, PREFIX_SOURCE, PREFIX_VOCAB, type PrefixId } from "../domain/prefixVocab"
import { useTitle } from "../hooks/useTitle"

const PAGE_SIZE = 100

export function Prefix() {
  const [params, setParams] = useSearchParams()
  const requested = params.get("prefix")
  const prefix: PrefixId | "all" = isPrefixId(requested) ? requested : "all"
  const [query, setQuery] = useState("")
  const [showGloss, setShowGloss] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  useTitle("词缀 Prefix · Atrium")

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return PREFIX_VOCAB.filter((entry) => {
      if (prefix !== "all" && entry.prefix !== prefix) return false
      if (!needle) return true
      return entry.word.toLowerCase().includes(needle) || entry.meaning.toLowerCase().includes(needle)
    })
  }, [prefix, query])

  const visible = filtered.slice(0, page * PAGE_SIZE)

  function choosePrefix(next: PrefixId | "all") {
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
          《{PREFIX_SOURCE.title}》里 {PREFIX_VOCAB.length} 个共享前缀的词，用来对照阅读填空里容易混在一起的 trans-、pro-、pre-、in-、re-、st-、con-。
          释义默认展开，也可以先藏起来再回忆。
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
        {PREFIXES.map((id) => {
          const count = PREFIX_VOCAB.filter((entry) => entry.prefix === id).length
          return (
            <button
              key={id}
              type="button"
              className={`btn ${prefix === id ? "btn-primary" : "btn-ghost"}`}
              aria-pressed={prefix === id}
              onClick={() => choosePrefix(id)}
            >
              {id}- <span className="prefix-count">{count}</span>
            </button>
          )
        })}
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
        {prefix === "all" ? "全部前缀" : `${prefix}-`} · {filtered.length.toLocaleString()} 词
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
