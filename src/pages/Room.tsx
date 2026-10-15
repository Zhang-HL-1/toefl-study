import { ChevronLeft } from "lucide-react"
import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { EmptyState } from "../components/EmptyState"
import { RoomGlyph } from "../components/RoomGlyph"
import { buildQueue } from "../domain/schedule"
import { roomById } from "../domain/rooms"
import { useStore } from "../hooks/useStore"
import { useTitle } from "../hooks/useTitle"
import { wordsInRoom } from "../domain/words"
import type { CardState } from "../domain/types"
import { totalsFor } from "../domain/progressCounts"
import { addLocalDays, formatInterval, startOfLocalDay } from "../domain/format"

function statusOf(card: CardState | undefined, now: number): { label: string; tone: string } {
  if (!card) return { label: "新", tone: "new" }
  if (card.due <= now) return { label: "到期", tone: "due" }
  const days = Math.max(1, Math.round((card.due - startOfLocalDay(now)) / 86_400_000))
  const tomorrow = addLocalDays(now, 1)
  if (card.due <= tomorrow) return { label: "明天", tone: "" }
  return { label: `${formatInterval(days)}后`, tone: "" }
}

export function Room() {
  const { roomId = "" } = useParams()
  const room = roomById(roomId)
  const data = useStore()
  const now = Date.now()
  const [query, setQuery] = useState("")
  const [showGloss, setShowGloss] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [page, setPage] = useState(1)
  useTitle(room ? `${room.name} · Atrium` : "房间 · Atrium")

  const words = useMemo(() => (room ? wordsInRoom(room.id) : []), [room])
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return words.filter((word) => (!onlyErrors || totalsFor(data.cards[word.id]).errors > 0) && (!needle || `${word.lemma} ${word.gloss}`.toLowerCase().includes(needle)))
  }, [query, words, onlyErrors, data])

  if (!room) {
    return <EmptyState title="没有这间屋子" body="房间编号不存在。" action={{ to: "/", label: "回庭院" }} />
  }

  const queued = buildQueue(data, now, room.id).length
  const mastered = words.filter((word) => (data.cards[word.id]?.interval ?? 0) >= 21).length

  return (
    <div className="room">
      <Link className="back" to="/">
        <ChevronLeft size={16} aria-hidden />
        庭院
      </Link>
      <header className="room-hero">
        <span className="room-icon">
          <RoomGlyph name={room.icon} />
        </span>
        <div>
          <p className="eyebrow">{room.kicker}</p>
          <h1>{room.name}</h1>
          <p className="lede">{room.blurb}</p>
        </div>
      </header>
      <div className="hero-actions">
        <Link className="btn btn-primary" to={`/vocab/${room.id}`}>
          随机练习此词库
        </Link>
        <p className="hero-note">
          {words.length.toLocaleString()} 词 · {mastered} 已掌握 · {queued} 到期 / 新词
        </p>
      </div>
      <div className="toolbar">
        <label className="search-label" htmlFor="room-filter">
          <span className="sr">筛选</span>
          <input
            id="room-filter"
            name="room-filter"
            className="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1) }}
            placeholder="筛选词或释义"
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
      {filtered.length === 0 ? (
        <p className="fine">没有符合的词。</p>
      ) : (
        <ul className="word-list">
          {filtered.slice(0, page * 100).map((word) => {
            const card = data.cards[word.id]
            const status = statusOf(card, now)
            const open = showGloss || openId === word.id
            return (
              <li key={word.id} className="word-row">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId((current) => (current === word.id ? null : word.id))}
                >
                  <span className="word-line">
                    <span className="word-lemma">{word.lemma}</span>
                    <span className="word-pos">{word.pos}</span>
                    <span className={`pill ${status.tone}`}>{status.label}</span>
                    <span className="word-counts">练习 {totalsFor(card).reviews} · 错误 {totalsFor(card).errors}</span>
                  </span>
                  {open ? (
                    <span className="word-detail">
                      <span className="gloss">{word.gloss}</span>
                      <span className="example">{word.example}</span>
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <div className="practice-modes">
        <button type="button" className="btn btn-ghost" aria-pressed={onlyErrors} onClick={() => { setOnlyErrors((value) => !value); setPage(1) }}>{onlyErrors ? "显示全部" : "只看错词"}</button>
        {filtered.length > page * 100 && <button className="btn btn-ghost" onClick={() => setPage((value) => value + 1)}>再显示 100 词（共 {filtered.length.toLocaleString()} 词）</button>}
      </div>
    </div>
  )
}
