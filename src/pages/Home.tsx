import { ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { RoomGlyph } from "../components/RoomGlyph"
import { greetingFor } from "../domain/format"
import { summarize } from "../domain/stats"
import { WORDS } from "../domain/words"
import { useStore } from "../hooks/useStore"
import { useTitle } from "../hooks/useTitle"

export function Home() {
  const data = useStore()
  const now = Date.now()
  const summary = summarize(data, now)
  useTitle("Atrium · TOEFL")

  return (
    <div className="home">
      <section className="hero">
        <p className="eyebrow">Toefl vocabulary</p>
        <h1>今日庭院</h1>
        <p className="lede">
          {greetingFor(new Date(now))}。{WORDS.length} 个托福词分在八间屋子里。评分按 SM-2
          排下一次。进度留在这台浏览器，也可以同步到你自己的私密 Gist。
        </p>
        <div className="hero-actions">
          <Link className="btn btn-primary" to="/vocab">
            开始复习
            <ArrowRight size={16} aria-hidden />
          </Link>
          <p className="hero-note">
            {summary.available === 0
              ? "今天的份额已经完成"
              : `${summary.due} 个到期 · ${summary.newRemaining} 个新词`}
          </p>
        </div>
      </section>

      <section className="metrics" aria-label="今日概览">
        <article className="metric">
          <span className="metric-label">待复习</span>
          <span className="metric-value">{summary.available}</span>
        </article>
        <article className="metric">
          <span className="metric-label">连续</span>
          <span className="metric-value">{summary.streak > 0 ? summary.streak : "—"}</span>
        </article>
        <article className="metric">
          <span className="metric-label">已掌握</span>
          <span className="metric-value">{summary.mastered}</span>
        </article>
        <article className="metric">
          <span className="metric-label">今日已复习</span>
          <span className="metric-value">{summary.reviewedToday}</span>
        </article>
      </section>

      <section>
        <header className="section-head">
          <h2>房间</h2>
          <p>按主题进入，或从全部词里抽今日队列。</p>
        </header>
        <ul className="room-grid">
          {summary.rooms.map((stat) => {
            const ratio = stat.total === 0 ? 0 : (stat.mastered / stat.total) * 100
            return (
              <li key={stat.room.id}>
                <Link className="room-card" to={`/room/${stat.room.id}`}>
                  <span className="room-icon">
                    <RoomGlyph name={stat.room.icon} />
                  </span>
                  <span className="room-kicker">{stat.room.kicker}</span>
                  <span className="room-name">{stat.room.name}</span>
                  <span className="room-meta">
                    {stat.total} 词
                    {stat.due > 0 ? ` · ${stat.due} 到期` : ` · ${stat.mastered} 已掌握`}
                  </span>
                  <span className="bar" aria-hidden>
                    <span style={{ width: `${ratio}%` }} />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
      <p className="fine">
        未连接时，进度只在这台浏览器。换设备可到<Link to="/settings">同步</Link>，用你账号下的 secret gist。
      </p>
    </div>
  )
}
