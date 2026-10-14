import { Eye } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { EmptyState } from "../components/EmptyState"
import { formatInterval } from "../domain/format"
import { GRADES, type GradeId } from "../domain/grades"
import { roomById } from "../domain/rooms"
import { NEW_PER_DAY, buildQueue, type QueueItem } from "../domain/schedule"
import { freshCard, scheduleCard } from "../domain/sm2"
import { getSnapshot, reviewWord } from "../domain/store"
import { useStore } from "../hooks/useStore"
import { useTitle } from "../hooks/useTitle"

export function Vocab() {
  const { roomId } = useParams()
  const room = roomId ? roomById(roomId) : undefined
  useTitle(room ? `复习 · ${room.name}` : roomId ? "复习 · Atrium" : "复习 · Atrium")

  if (roomId && !room) {
    return <EmptyState title="没有这间屋子" body="无法开始这一室的复习。" action={{ to: "/", label: "回庭院" }} />
  }

  return <Session key={room?.id ?? "all"} roomId={room?.id} roomName={room?.name} />
}

function Session({ roomId, roomName }: { roomId?: string; roomName?: string }) {
  const data = useStore()
  const [queue, setQueue] = useState<QueueItem[]>(() => buildQueue(getSnapshot(), Date.now(), roomId))
  const [revealed, setRevealed] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const [initial] = useState(queue.length)
  const current = queue[0]

  const gradeCurrent = useCallback(
    (id: GradeId) => {
      if (!current) return
      reviewWord(current.word.id, id)
      setReviewed((count) => count + 1)
      setRevealed(false)
      setQueue((previous) => {
        if (previous[0]?.word.id !== current.word.id) return previous
        const rest = previous.slice(1)
        if (id === "forgot") {
          const at = Math.min(2, rest.length)
          rest.splice(at, 0, previous[0])
        }
        return rest
      })
    },
    [current],
  )

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return
      if (!current) return
      if (!revealed && (event.key === " " || event.key === "Enter")) {
        event.preventDefault()
        setRevealed(true)
        return
      }
      if (!revealed) return
      const index = ["1", "2", "3", "4"].indexOf(event.key)
      if (index === -1) return
      event.preventDefault()
      const grade = GRADES[index]
      if (grade) gradeCurrent(grade.id)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [current, gradeCurrent, revealed])

  if (!current) {
    return (
      <EmptyState
        title={initial === 0 ? "今天没有排到词" : "这一轮结束了"}
        body={
          initial === 0
            ? roomName
              ? `「${roomName}」没有到期的卡片，今天的 ${NEW_PER_DAY} 个新词额度也用完了。`
              : `到期的卡片已经清完，今天的 ${NEW_PER_DAY} 个新词也用完了。`
            : "评分已写入这台浏览器。明天到期的词会回到队列。"
        }
        action={
          initial === 0
            ? { to: roomId ? `/room/${roomId}` : "/", label: roomId ? "回这间屋子" : "回庭院" }
            : { to: "/stats", label: "看统计" }
        }
      />
    )
  }

  const card = data.cards[current.word.id] ?? null
  const total = reviewed + queue.length
  const width = total === 0 ? 0 : (reviewed / total) * 100

  return (
    <div className="study">
      <div className="study-top">
        <p className="eyebrow">
          {roomName ?? "全部"} · {current.kind === "new" ? "新词" : "复习"}
        </p>
        <p className="study-count">剩余 {queue.length}</p>
      </div>
      <div className="track" aria-hidden>
        <span style={{ width: `${width}%` }} />
      </div>
      <article className="card">
        <header>
          <h1 className="lemma">{current.word.lemma}</h1>
          <p className="ipa">
            /{current.word.ipa}/ <span className="word-pos">{current.word.pos}</span>
          </p>
        </header>
        {revealed ? (
          <div className="reveal-block">
            <p className="gloss">{current.word.gloss}</p>
            <p className="example">{current.word.example}</p>
            <div className="grades" role="group" aria-label="评分">
              {GRADES.map((grade, index) => {
                const next = scheduleCard(card ?? freshCard(), grade.q, Date.now(), grade.id)
                return (
                  <button
                    key={grade.id}
                    type="button"
                    className={`grade grade-${grade.id}`}
                    onClick={() => gradeCurrent(grade.id)}
                  >
                    <span className="grade-index">{index + 1}</span>
                    <span className="grade-label">{grade.label}</span>
                    <span className="grade-hint">{grade.hint}</span>
                    <span className="grade-next">
                      {grade.q < 3 ? "本轮稍后" : formatInterval(next.interval)} · {next.ease.toFixed(2)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="hidden-block">
            <p className="prompt">先回忆词义，再揭开。</p>
            <button type="button" className="btn btn-ghost reveal" onClick={() => setRevealed(true)}>
              <Eye size={16} aria-hidden />
              显示释义
            </button>
          </div>
        )}
        <p className="keyhint">空格显示释义 · 1 到 4 评分</p>
      </article>
      <p className="fine">
        <Link to={roomId ? `/room/${roomId}` : "/"}>{roomName ? `离开，回${roomName}` : "离开，回庭院"}</Link>
      </p>
    </div>
  )
}
