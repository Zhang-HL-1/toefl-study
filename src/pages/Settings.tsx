import { Download, Eye, EyeOff, Link2, RefreshCw, Unlink } from "lucide-react"
import { useEffect, useState, type FormEvent } from "react"
import {
  GIST_FILENAME,
  GITHUB_SYNC_STORAGE_KEY,
  TOKEN_URL,
  clearGithubSyncError,
  connectGithub,
  disconnectGithub,
  formatSynced,
  pullGithub,
  syncGithubNow,
  type GithubSyncSnapshot,
} from "../domain/githubSync"
import { useGithubSync } from "../hooks/useGithubSync"
import { useTitle } from "../hooks/useTitle"

function statusLine(sync: GithubSyncSnapshot): { text: string; tone: "muted" | "ok" | "error" } {
  if (sync.phase === "syncing") return { text: "正在同步…", tone: "muted" }
  if (!sync.connected) {
    return sync.lastError
      ? { text: `未连接。${sync.lastError}`, tone: "error" }
      : { text: "未连接", tone: "muted" }
  }
  const when = sync.lastSyncAt ? `上次同步 ${formatSynced(sync.lastSyncAt)}` : "已连接，还没有同步过"
  return sync.lastError ? { text: `${when}。${sync.lastError}`, tone: "error" } : { text: when, tone: "ok" }
}

export function Settings() {
  const sync = useGithubSync()
  const [token, setToken] = useState("")
  const [reveal, setReveal] = useState(false)
  const [gistId, setGistId] = useState(sync.gistId ?? "")
  const busy = sync.phase === "syncing"
  const status = statusLine(sync)
  useTitle("同步 · Atrium")

  useEffect(() => {
    if (sync.connected && sync.gistId) setGistId(sync.gistId)
  }, [sync.connected, sync.gistId])

  async function onConnect(event: FormEvent) {
    event.preventDefault()
    const ok = await connectGithub(token, gistId)
    if (ok) setToken("")
  }

  return (
    <div className="settings">
      <header className="hero">
        <p className="eyebrow">Sync</p>
        <h1>同步</h1>
        <p className="lede">
          复习时进度只写在这台浏览器。连接后，用你 GitHub 账号下的 secret gist 把进度合并到其他设备。不会写入公开的
          toefl-study 仓库。
        </p>
      </header>

      <section className="sync-card" aria-busy={busy}>
        <p className="sync-status" data-tone={status.tone} role={status.tone === "error" ? "alert" : "status"}>
          {status.text}
        </p>

        {sync.connected ? (
          <div className="sync-meta">
            <p>
              已保存令牌，只存在这台浏览器。Gist 文件 <code>{GIST_FILENAME}</code>
            </p>
            {sync.gistUrl ? (
              <p>
                <a className="gist-link" href={sync.gistUrl} target="_blank" rel="noreferrer">
                  {sync.gistUrl}
                </a>
              </p>
            ) : null}
            <div className="sync-actions">
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void syncGithubNow()}>
                <RefreshCw size={16} aria-hidden />
                立即同步
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void pullGithub()}>
                <Download size={16} aria-hidden />
                拉取
              </button>
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={disconnectGithub}>
                <Unlink size={16} aria-hidden />
                断开
              </button>
            </div>
          </div>
        ) : (
          <form className="sync-form" onSubmit={(event) => void onConnect(event)}>
            <label className="field">
              <span className="field-label">个人访问令牌</span>
              <span className="token-row">
                <input
                  type={reveal ? "text" : "password"}
                  value={token}
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="ghp_… 或 github_pat_…"
                  onChange={(event) => {
                    setToken(event.target.value)
                    clearGithubSyncError()
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-pressed={reveal}
                  onClick={() => setReveal((value) => !value)}
                >
                  {reveal ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  {reveal ? "隐藏" : "显示"}
                </button>
              </span>
            </label>
            <label className="field">
              <span className="field-label">Gist ID（可选）</span>
              <input
                value={gistId}
                autoComplete="off"
                spellCheck={false}
                placeholder="留空则查找已有进度，没有就新建 secret gist"
                onChange={(event) => {
                  setGistId(event.target.value)
                  clearGithubSyncError()
                }}
              />
            </label>
            <div className="sync-actions">
              <button type="submit" className="btn btn-primary" disabled={busy || token.trim().length === 0}>
                <Link2 size={16} aria-hidden />
                连接
              </button>
            </div>
          </form>
        )}

        <p className="note">
          令牌只留在这台浏览器的 localStorage（<code>{GITHUB_SYNC_STORAGE_KEY}</code>
          ），不会进仓库，也不会发到 Atrium 以外的服务器。请使用
          <a href={TOKEN_URL} target="_blank" rel="noreferrer">
            仅含 gist 权限的 classic token
          </a>
          ，或能创建并更新 Gist 的 fine-grained token。Secret gist 只挂在你的 GitHub
          账号下，不会出现在公开列表里；知道链接的人仍可打开，请不要把链接发到公开场合。
        </p>
        <p className="note">
          合并时每张卡片保留写入更晚的一份（<code>updated</code>，否则上次复习时间，否则最近一条记录）。时间相同则留下重复次数、间隔、到期更靠后的一张。复习记录取并集，最多
          2000 条。立即同步会先拉取再上传合并结果；拉取只把 Gist 合并进这台浏览器；复习后约 1.5
          秒自动上传。断开会删掉这台浏览器里的令牌，不删除 Gist，也不清空本地进度。
        </p>
      </section>
    </div>
  )
}
