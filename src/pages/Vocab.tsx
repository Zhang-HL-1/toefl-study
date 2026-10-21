import { Eye } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import { EmptyState } from "../components/EmptyState"
import { GRADES, type GradeId } from "../domain/grades"
import { totalsFor } from "../domain/progressCounts"
import { roomById } from "../domain/rooms"
import { buildQueue, randomCandidate } from "../domain/schedule"
import { getSnapshot, reviewWord } from "../domain/store"
import type { StoreData } from "../domain/types"
import { SOURCE_BOOKS, WORDS, wordsInRoom, type Word } from "../domain/words"
import { useGithubSync } from "../hooks/useGithubSync"
import { useStore } from "../hooks/useStore"
import { useTitle } from "../hooks/useTitle"

type Mode = "random" | "mistakes" | "due"

export function Vocab() {
  const { roomId } = useParams()
  const [params, setParams] = useSearchParams()
  const requested = params.get("mode")
  const mode: Mode = requested === "mistakes" || requested === "due" ? requested : "random"
  const room = roomId ? roomById(roomId) : undefined
  useTitle(`${room?.name ?? "全部词库"} · 练习`)
  if (roomId && !room) return <EmptyState title="没有这间屋子" body="词库不存在。" action={{ to: "/", label: "回庭院" }} />
  return <div className="practice">
    <div className="practice-modes" role="group" aria-label="练习模式">
      {([ ["random", "随机练习"], ["mistakes", "错词练习"], ["due", "到期复习"] ] as const).map(([id, label]) =>
        <button key={id} className={`btn ${mode === id ? "btn-primary" : "btn-ghost"}`} aria-pressed={mode === id} onClick={() => setParams({ mode: id })}>{label}</button>,
      )}
    </div>
    <Session key={`${roomId ?? "all"}:${mode}`} roomId={roomId} roomName={room?.name} mode={mode} />
  </div>
}

function Session({ roomId, roomName, mode }: { roomId?: string; roomName?: string; mode: Mode }) {
  const data = useStore()
  const sync = useGithubSync()
  const all = useMemo(() => roomId ? wordsInRoom(roomId) : [...WORDS], [roomId])
  const pool = useMemo(() => mode === "mistakes" ? all.filter((word) => totalsFor(data.cards[word.id]).errors > 0) : all, [all, data, mode])
  const choose = useCallback((snapshot: StoreData, lastId?: string) => mode === "due"
    ? buildQueue(snapshot, Date.now(), roomId)[0]?.word
    : randomCandidate(mode === "mistakes" ? all.filter((word) => totalsFor(snapshot.cards[word.id]).errors > 0) : all, snapshot, lastId), [all, mode, roomId])
  const [current, setCurrent] = useState<Word | undefined>(() => choose(getSnapshot()))
  const [revealed, setRevealed] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const lock = useRef(false)

  const gradeCurrent = useCallback((grade: GradeId) => {
    if (!current || !revealed || lock.current) return
    lock.current = true
    reviewWord(current.id, grade)
    setReviewed((count) => count + 1)
    setRevealed(false)
    setCurrent(choose(getSnapshot(), current.id))
  }, [choose, current, revealed])

  useEffect(() => { if (revealed) lock.current = false }, [revealed])
  useEffect(() => {
    if (revealed || mode === "due") return
    if (!current || !pool.some((word) => word.id === current.id)) { setCurrent(choose(data)); return }
    const minimum = Math.min(...pool.map((word) => totalsFor(data.cards[word.id]).reviews))
    if (totalsFor(data.cards[current.id]).reviews > minimum) setCurrent(choose(data))
  }, [choose, current, data, mode, pool, revealed])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.target instanceof HTMLElement && (event.target.matches("input,textarea,select") || event.target.isContentEditable)) return
      if (!current) return
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        if (event.target instanceof HTMLElement && event.target.closest("button,a")) return
        event.preventDefault(); setRevealed(true); return
      }
      if (!revealed) return
      const grade = GRADES[["1", "2", "3", "4"].indexOf(event.key)]
      if (grade) { event.preventDefault(); gradeCurrent(grade.id) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [current, gradeCurrent, revealed])

  if (!current) return <div className="study"><EmptyState
    title={mode === "mistakes" ? "还没有错词" : "本次到期复习已完成"}
    body={mode === "mistakes" ? "选择「忘了」的词会进入错词本，次数长期累计。" : "随机练习随时可用，学过的词会在后续轮次继续出现。"}
    action={{ to: roomId ? `/vocab/${roomId}` : "/vocab", label: "开始随机练习" }} /></div>

  const counts = totalsFor(data.cards[current.id])
  const round = pool.length ? Math.min(...pool.map((word) => totalsFor(data.cards[word.id]).reviews)) : 0
  const remaining = pool.filter((word) => totalsFor(data.cards[word.id]).reviews === round).length
  return <div className="study">
    <div className="study-meta">
      <div className="study-top">
        <p className="eyebrow">{roomName ?? "全部词库"} · {mode === "due" ? "到期复习" : `第 ${round + 1} 轮`}</p>
        <p className="study-count">本次已练 {reviewed} · {pool.length.toLocaleString()} 词</p>
      </div>
      {mode !== "due" && <><div className="track" aria-hidden><span style={{ width: `${pool.length ? (1 - remaining / pool.length) * 100 : 0}%` }} /></div>
        <p className="fine">本轮剩余 {remaining.toLocaleString()} 词 · 每轮随机、不重复，完成后自动重新打乱</p></>}
    </div>
    <div className="study-stage">
      <article className="card">
        <header><h1 className="lemma">{current.lemma}</h1>
          <p className="ipa">{current.ipa ? `/${current.ipa}/` : ""} <span className="word-pos">{current.pos}</span></p>
          <p className="word-counts">累计练习 {counts.reviews} 次 · 错误 {counts.errors} 次 · 模糊 {counts.fuzzy} 次</p>
        </header>
        {revealed ? <div className="reveal-block">
          <p className="gloss">{current.gloss}</p>
          {current.example && <p className="example">{current.example}</p>}
          {current.sources && <p className="fine">{current.sources.map((source) => `${SOURCE_BOOKS.find((book) => book.id === source.bookId)?.title} · 第 ${source.page} 页 #${source.index}`).join(" / ")}</p>}
          <div className="grades" role="group" aria-label="评分">
            {GRADES.map((grade, index) => <button key={grade.id} type="button" className={`grade grade-${grade.id}`} onClick={() => gradeCurrent(grade.id)}>
              <span className="grade-index">{index + 1}</span><span className="grade-label">{grade.label}</span>
              <span className="grade-hint">{grade.hint}</span><span className="grade-next">{grade.id === "forgot" ? "错误 +1" : grade.id === "fuzzy" ? "模糊 +1" : "记录本次学习"}</span>
            </button>)}
          </div>
        </div> : <div className="hidden-block"><p className="prompt">先回忆词义，再揭开。</p>
          <button className="btn btn-ghost reveal" onClick={() => setRevealed(true)}><Eye size={16} aria-hidden />显示释义</button>
        </div>}
        <p className="keyhint">空格显示释义 · 1 到 4 评分 ·「忘了」计为一次错误</p>
      </article>
      <p className="fine" role="status">{sync.lastError ? `同步暂未完成：${sync.lastError}，记录已保存在本机。` : sync.connected ? sync.phase === "syncing" ? "正在自动同步…" : "已开启跨设备自动同步" : <>进度已保存在本机。<Link to="/settings">连接跨设备自动同步</Link></>}</p>
      <p className="fine"><Link to={roomId ? `/room/${roomId}` : "/"}>离开练习</Link></p>
    </div>
  </div>
}
