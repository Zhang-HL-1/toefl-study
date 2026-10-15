import { HashRouter, Navigate, Route, Routes } from "react-router-dom"
import { Shell } from "./components/Shell"
import { Home } from "./pages/Home"
import { Room } from "./pages/Room"
import { Settings } from "./pages/Settings"
import { Stats } from "./pages/Stats"
import { Vocab } from "./pages/Vocab"

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="room/:roomId" element={<Room />} />
          <Route path="vocab" element={<Vocab />} />
          <Route path="vocab/:roomId" element={<Vocab />} />
          <Route path="stats" element={<Stats />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
