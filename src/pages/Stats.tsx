import { useState } from "react"
import { Link } from "react-router-dom"
import { RoomGlyph } from "../components/RoomGlyph"
import { formatPercent } from "../domain/format"
import { GRADES } from "../domain/grades"
import { disconnectGithub } from "../domain/githubSync"
import { totalsFor } from "../domain/progressCounts"
import { WORDS } from "../domain/words"
import { resetProgress } from "../domain/store"
import { summarize } from "../domain/stats"
import { useGithubSync } from "../hooks/useGithubSync"
import { useStore } from "../hooks/useStore"
import { useTitle } from "../hooks/useTitle"

export function Stats() {
  const data = useStore()
  const summary = summarize(data, Date.now())
  const [armed, setArmed] = useState(false)
  const [query, setQuery] = useState("")
  const [limit, setLimit] = useState(50)
  const sync = useGithubSync()
  useTitle("统计 · Atrium")
  const peak = Math.max(1, ...summary.days.map((day) => day.count))
  const gradePeak = Math.max(1, ...GRADES.map((grade) => summary.byGrade[grade.id]))
  const mistakes = WORDS.filter((word) => totalsFor(data.cards[word.id]).errors > 0)
    .filter((word) => `${word.lemma} ${word.gloss}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => totalsFor(data.cards[b.id]).errors - totalsFor(data.cards[a.id]).errors || a.lemma.localeCompare(b.lemma))

  return (
    <div className="stats">
      <header className="hero">
        <p className="eyebrow">Progress</p>
        <h1>统计</h1>
        <p className="lede">「忘了」计为一次错误，「模糊」单独记录。累计次数长期保留，并随进度跨设备同步。</p>
      </header>
      <section className="metrics" aria-label="总览">
        <article className="metric">
          <span className="metric-label">记住率</span>
          <span className="metric-value">{formatPercent(summary.retention)}</span>
        </article>
        <article className="metric">
          <span className="metric-label">复习次数</span>
          <span className="metric-value">{summary.totalReviews}</span>
        </article>
        <article className="metric">
          <span className="metric-label">平均难度</span>
          <span className="metric-value">
            {summary.averageEase === null ? "—" : summary.averageEase.toFixed(2)}
          </span>
        </article>
        <article className="metric">
          <span className="metric-label">未学</span>
          <span className="metric-value">{summary.unseen}</span>
        </article>
      </section>

      <section className="mistakes">
        <header className="section-head"><h2>错词本 · {mistakes.length} 词</h2><Link to="/vocab?mode=mistakes" className="btn btn-ghost">随机练错词</Link></header>
        <input className="search" aria-label="搜索错词" placeholder="搜索错词或词义" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(50) }} />
        <ul className="word-list">{mistakes.slice(0, limit).map((word) => {
          const counts = totalsFor(data.cards[word.id])
          return <li key={word.id} className="mistake-row"><strong>{word.lemma}</strong><span className="word-counts">错误 {counts.errors} 次 · 模糊 {counts.fuzzy} 次 · 练习 {counts.reviews} 次</span><p>{word.gloss}</p></li>
        })}</ul>
        {mistakes.length === 0 && <p className="fine">还没有符合条件的错词。</p>}
        {mistakes.length > limit && <button className="btn btn-ghost" onClick={() => setLimit((value) => value + 50)}>再显示 50 词</button>}
      </section>

      <section>
        <header className="section-head">
          <h2>近 14 天</h2>
          <p>连续 {summary.streak > 0 ? `${summary.streak} 天` : "尚未开始"}</p>
        </header>
        <ol className="days">
          {summary.days.map((day) => (
            <li key={day.key}>
              <span className="day-track">
                <span
                  className="day-bar"
                  style={{ height: `${day.count === 0 ? 0 : Math.max(8, (day.count / peak) * 100)}%` }}
                  title={`${day.key} · ${day.count}`}
                />
              </span>
              <span className="day-label">{day.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="split">
        <section>
          <header className="section-head">
            <h2>评分</h2>
            <p>最近 2000 次评分</p>
          </header>
          <ul className="grade-stats">
            {GRADES.map((grade) => {
              const count = summary.byGrade[grade.id]
              return (
                <li key={grade.id}>
                  <span className="grade-stat-label">{grade.label}</span>
                  <span className="bar" aria-hidden>
                    <span style={{ width: `${(count / gradePeak) * 100}%` }} />
                  </span>
                  <span className="grade-stat-count">{count}</span>
                </li>
              )
            })}
          </ul>
        </section>
        <section>
          <header className="section-head">
            <h2>房间</h2>
            <p>
              {summary.mastered} 已掌握 · {summary.learning} 学习中
            </p>
          </header>
          <ul className="room-stats">
            {summary.rooms.map((stat) => {
              const ratio = stat.total === 0 ? 0 : (stat.mastered / stat.total) * 100
              return (
                <li key={stat.room.id}>
                  <span className="room-icon">
                    <RoomGlyph name={stat.room.icon} size={16} />
                  </span>
                  <span className="room-stat-name">{stat.room.name}</span>
                  <span className="bar" aria-hidden>
                    <span style={{ width: `${ratio}%` }} />
                  </span>
                  <span className="room-stat-count">
                    {stat.mastered}/{stat.total}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <section className="reset">
        <h2>本机记录</h2>
        <p>
          清空本机记录并断开同步，词表和云端记录保留。
          {sync.connected
            ? "重新连接后可从云端恢复进度。"
            : "未连接时只清本机。之后若再连接，Gist 里已有的进度会合并回来。"}
        </p>
        {armed ? <p className="reset-warn">再按一次以确认。刷新页面会取消。</p> : null}
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            if (!armed) {
              setArmed(true)
              return
            }
            disconnectGithub()
            resetProgress()
            setArmed(false)
          }}
        >
          {armed ? "确认清空" : "清空复习记录"}
        </button>
      </section>
    </div>
  )
}
