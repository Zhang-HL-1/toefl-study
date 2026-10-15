import { BookOpen, ChartColumn, House, Settings } from "lucide-react"
import { NavLink, Outlet } from "react-router-dom"
import { summarize } from "../domain/stats"
import { useStore } from "../hooks/useStore"

function Mark() {
  return (
    <svg className="mark" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 18V10.2L12 4l9 6.2V18" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 18v-5h5v5" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

export function Shell() {
  const data = useStore()
  const available = summarize(data, Date.now()).available

  return (
    <>
      <a className="skip" href="#content">
        跳到内容
      </a>
      <header className="top">
        <div className="top-inner">
          <NavLink to="/" end className="brand">
            <Mark />
            <span>Atrium</span>
          </NavLink>
          <nav className="nav" aria-label="主要">
            <NavLink to="/" end>
              <House size={16} strokeWidth={1.7} aria-hidden />
              <span>庭院</span>
            </NavLink>
            <NavLink to="/vocab">
              <BookOpen size={16} strokeWidth={1.7} aria-hidden />
              <span>复习</span>
              {available > 0 ? <span className="badge">{available}</span> : null}
            </NavLink>
            <NavLink to="/stats">
              <ChartColumn size={16} strokeWidth={1.7} aria-hidden />
              <span>统计</span>
            </NavLink>
            <NavLink to="/settings" className="nav-icon" aria-label="同步" title="同步">
              <Settings size={16} strokeWidth={1.7} aria-hidden />
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="content" className="main">
        <Outlet />
      </main>
    </>
  )
}
