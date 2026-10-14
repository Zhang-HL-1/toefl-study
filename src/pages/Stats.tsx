import { useState } from "react"
import { RoomGlyph } from "../components/RoomGlyph"
import { formatPercent } from "../domain/format"
import { GRADES } from "../domain/grades"
import { resetProgress } from "../domain/store"
import { summarize } from "../domain/stats"
import { useStore } from "../hooks/useStore"
import { useTitle } from "../hooks/useTitle"

export function Stats() {
  const data = useStore()
  const summary = summarize(data, Date.now())
  const [armed, setArmed] = useState(false)
  useTitle("统计 · Atrium")
  const peak = Math.max(1, ...summary.days.map((day) => day.count))
  const gradePeak = Math.max(1, ...GRADES.map((grade) => summary.byGrade[grade.id]))

  return (
    <div className="stats">
      <header className="hero">
        <p className="eyebrow">Progress</p>
        <h1>统计</h1>
        <p className="lede">记住率是非「忘了」的评分占比。已掌握指间隔已到 21 天的词。</p>
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
            <p>SM-2 质量 1 / 3 / 4 / 5</p>
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
        <p>清空后无法恢复。词表还在，进度从零开始。</p>
        {armed ? <p className="reset-warn">再按一次以确认。刷新页面会取消。</p> : null}
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            if (!armed) {
              setArmed(true)
              return
            }
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
