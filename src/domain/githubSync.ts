import { mergeStores, parseStoreJson, serializeStore } from "./mergeProgress"
import { getSnapshot, replaceStore, subscribe } from "./store"
import type { StoreData } from "./types"
import { deviceId } from "./progressCounts"

/**
 * Progress sync against a secret GitHub Gist owned by the signed-in token.
 *
 * localStorage key `atrium.toefl.v1` stays the offline cache and the source of
 * truth while studying. This module only mirrors that JSON to
 * `atrium-toefl-progress.json` in a secret gist. The token and gist id live in
 * a separate key and are never written into the repo.
 *
 * Connect finds an existing secret gist with that filename, or creates one
 * (`public: false`). Load and 立即同步 pull, merge, then upload when the merge
 * differs from the gist. Reviews push the current snapshot after a short debounce.
 * 拉取 merges the gist into this browser and does not upload.
 */

export const GITHUB_SYNC_STORAGE_KEY = "atrium.sync.github.v1"
export const GIST_FILENAME = "atrium-toefl-progress.json"

const GIST_DESCRIPTION = "Atrium TOEFL progress"
const API_ROOT = "https://api.github.com"
const API_VERSION = "2022-11-28"
const PUSH_DELAY_MS = 1500
const FORCE_PUSH_KEY = "atrium.sync.forcePush"
const TOKEN_URL = "https://github.com/settings/tokens/new?scopes=gist&description=Atrium%20TOEFL"

export { TOKEN_URL }

interface PersistedSync {
  token: string | null
  gistId: string | null
  gistUrl: string | null
  lastSyncAt: number | null
}

export interface GithubSyncSnapshot {
  connected: boolean
  gistId: string | null
  gistUrl: string | null
  lastSyncAt: number | null
  lastError: string | null
  phase: "idle" | "syncing"
}

interface GistFile {
  filename?: string
  content?: string
  raw_url?: string
  truncated?: boolean
}

interface GistPayload {
  id?: string
  html_url?: string
  public?: boolean
  files?: Record<string, GistFile | undefined>
}

const emptyConfig = (): PersistedSync => ({
  token: null,
  gistId: null,
  gistUrl: null,
  lastSyncAt: null,
})

class GithubSyncError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GithubSyncError"
  }
}

let memory: { phase: "idle" | "syncing"; lastError: string | null } = { phase: "idle", lastError: null }
let cached: GithubSyncSnapshot = derive()
let lastPushed = ""
let applyingRemote = false
let installed = false
let pushTimer = 0
let tail: Promise<void> = Promise.resolve()
const listeners = new Set<() => void>()

function derive(): GithubSyncSnapshot {
  const config = readConfig()
  return {
    connected: Boolean(config.token && config.gistId),
    gistId: config.gistId,
    gistUrl: config.gistUrl,
    lastSyncAt: config.lastSyncAt,
    lastError: memory.lastError,
    phase: memory.phase,
  }
}

function emit() {
  cached = derive()
  listeners.forEach((listener) => listener())
}

export function getGithubSyncSnapshot(): GithubSyncSnapshot {
  return cached
}

export function subscribeGithubSync(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function readConfig(): PersistedSync {
  if (typeof localStorage === "undefined") return emptyConfig()
  try {
    const raw = localStorage.getItem(GITHUB_SYNC_STORAGE_KEY)
    if (!raw) return emptyConfig()
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return emptyConfig()
    const record = parsed as Partial<PersistedSync>
    return {
      token: typeof record.token === "string" && record.token.trim() ? record.token.trim() : null,
      gistId: typeof record.gistId === "string" && record.gistId.trim() ? record.gistId.trim() : null,
      gistUrl: typeof record.gistUrl === "string" && record.gistUrl.trim() ? record.gistUrl.trim() : null,
      lastSyncAt: typeof record.lastSyncAt === "number" && Number.isFinite(record.lastSyncAt) ? record.lastSyncAt : null,
    }
  } catch {
    return emptyConfig()
  }
}

function writeConfig(next: PersistedSync) {
  if (typeof localStorage === "undefined") return
  try {
    localStorage.setItem(GITHUB_SYNC_STORAGE_KEY, JSON.stringify(next))
  } catch {
    throw new GithubSyncError("无法把同步设置写入这台浏览器。")
  }
  emit()
}

function hasConnection(config = readConfig()): config is PersistedSync & { token: string; gistId: string } {
  return Boolean(config.token && config.gistId)
}

function requireConfig(): PersistedSync & { token: string; gistId: string } {
  const config = readConfig()
  if (!hasConnection(config)) throw new GithubSyncError("未连接。")
  return config
}

function localWins(): boolean {
  try {
    return sessionStorage.getItem(FORCE_PUSH_KEY) === "1"
  } catch {
    return false
  }
}

function clearLocalWins() {
  try {
    sessionStorage.removeItem(FORCE_PUSH_KEY)
  } catch {
    // Ignore storage failures. The next push will try again.
  }
}

/** After a connected reset, the next sync uploads this browser instead of merging the gist back. */
export function preferLocalPush() {
  try {
    sessionStorage.setItem(FORCE_PUSH_KEY, "1")
  } catch {
    // The debounced push still sends the empty snapshot if the flag cannot be stored.
  }
}

export function parseGistId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const fromUrl = gistIdFromUrl(trimmed)
  if (fromUrl) return fromUrl
  if (/^[a-f0-9]{8,64}$/i.test(trimmed)) return trimmed
  throw new GithubSyncError("Gist ID 无法识别。可以留空，或粘贴 gist.github.com 链接。")
}

function gistIdFromUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.hostname !== "gist.github.com") return null
    const parts = url.pathname.split("/").filter(Boolean)
    const id = parts[parts.length - 1] ?? ""
    if (!/^[a-f0-9]{8,64}$/i.test(id)) throw new GithubSyncError("链接里没有可用的 Gist ID。")
    return id
  } catch (error) {
    if (error instanceof GithubSyncError) throw error
    return null
  }
}

function toMessage(error: unknown): string {
  if (error instanceof GithubSyncError) return error.message
  if (error instanceof Error && error.message) return error.message
  return "同步失败。"
}

async function readError(response: Response): Promise<string> {
  if (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0") {
    return "GitHub 速率限制已到，请稍后再试。"
  }
  let detail = ""
  try {
    const body = (await response.json()) as { message?: unknown }
    if (typeof body.message === "string") detail = body.message
  } catch {
    detail = ""
  }
  const lower = detail.toLowerCase()
  if (response.status === 401) return "令牌无效或已过期。"
  if (response.status === 403) {
    if (lower.includes("rate limit")) return "GitHub 速率限制已到，请稍后再试。"
    return "令牌没有 gist 权限。请用仅含 gist 范围的 classic token，或能读写 Gist 的 fine-grained token。"
  }
  if (response.status === 404) return "找不到这个 Gist，或当前令牌无权访问。"
  if (detail) return `GitHub：${detail.slice(0, 160)}`
  return `GitHub 返回 ${response.status}。`
}

async function gh(token: string, path: string, init?: RequestInit): Promise<Response> {
  const url = path.startsWith("https://") ? path : `${API_ROOT}${path}`
  if (url.startsWith("https://") && !url.startsWith(`${API_ROOT}/`) && url !== API_ROOT) {
    throw new GithubSyncError("已拒绝非 GitHub API 的同步地址。")
  }
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": API_VERSION,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new GithubSyncError("无法连接 GitHub。检查网络后再试。")
  }
  if (!response.ok) throw new GithubSyncError(await readError(response))
  return response
}

async function ghJson<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await gh(token, path, init)
  try {
    return (await response.json()) as T
  } catch {
    throw new GithubSyncError("GitHub 返回了无法解析的响应。")
  }
}

function assertSecret(gist: GistPayload) {
  if (gist.public !== false) {
    throw new GithubSyncError("这个 Gist 是公开的。进度只写入 secret gist。")
  }
}

function gistUrlOf(gist: GistPayload, id: string): string {
  return gist.html_url || `https://gist.github.com/${id}`
}

function findFile(gist: GistPayload): GistFile | null {
  const files = gist.files
  if (!files) return null
  const direct = files[GIST_FILENAME]
  if (direct) return direct
  for (const file of Object.values(files)) {
    if (file?.filename === GIST_FILENAME) return file
  }
  return null
}

async function fileText(file: GistFile): Promise<string> {
  if (typeof file.content === "string" && file.truncated !== true) return file.content
  if (!file.raw_url || !file.raw_url.startsWith("https://gist.githubusercontent.com/")) {
    throw new GithubSyncError("Gist 文件不完整，无法读取。")
  }
  let response: Response
  try {
    response = await fetch(file.raw_url, { cache: "no-store", signal: AbortSignal.timeout(20_000) })
  } catch {
    throw new GithubSyncError("无法读取 Gist 原文。")
  }
  if (!response.ok) throw new GithubSyncError("无法读取 Gist 原文。")
  return response.text()
}

async function readStoreFromGist(gist: GistPayload): Promise<StoreData> {
  const files = Object.entries(gist.files ?? {}).filter(([name]) =>
    name === GIST_FILENAME || /^atrium-device-[a-zA-Z0-9-]+\.json$/.test(name),
  )
  try {
    let merged: StoreData = { version: 1, cards: {}, events: [] }
    for (const [, file] of files) {
      if (file) merged = mergeStores(merged, parseStoreJson(await fileText(file)))
    }
    return merged
  } catch (error) {
    if (error instanceof GithubSyncError) throw error
    throw new GithubSyncError(error instanceof Error ? error.message : "Gist 内容无法读取。")
  }
}

function nextLink(header: string | null): string | null {
  if (!header) return null
  for (const part of header.split(",")) {
    const match = /<([^>]+)>;\s*rel="next"/.exec(part)
    const url = match?.[1]
    if (url && url.startsWith(`${API_ROOT}/`)) return url
  }
  return null
}

async function findProgressGist(token: string): Promise<GistPayload | null> {
  let url: string | null = `${API_ROOT}/gists?per_page=100`
  for (let page = 0; url && page < 10; page += 1) {
    const response = await gh(token, url)
    let gists: unknown
    try {
      gists = await response.json()
    } catch {
      throw new GithubSyncError("GitHub 返回了无法解析的 Gist 列表。")
    }
    if (!Array.isArray(gists)) throw new GithubSyncError("GitHub 返回了无法解析的 Gist 列表。")
    for (const gist of gists as GistPayload[]) {
      if (gist.public !== false || !gist.id) continue
      if (findFile(gist)) return gist
    }
    url = nextLink(response.headers.get("Link"))
  }
  return null
}

async function getGist(token: string, gistId: string): Promise<GistPayload> {
  const gist = await ghJson<GistPayload>(token, `/gists/${encodeURIComponent(gistId)}`)
  if (!gist.id) throw new GithubSyncError("GitHub 没有返回 Gist ID。")
  assertSecret(gist)
  return gist
}

async function createGist(token: string, content: string): Promise<GistPayload> {
  const gist = await ghJson<GistPayload>(token, "/gists", {
    method: "POST",
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: { [GIST_FILENAME]: { content } },
    }),
  })
  if (!gist.id) throw new GithubSyncError("GitHub 没有返回新建的 Gist。")
  if (gist.public !== false) {
    await gh(token, `/gists/${encodeURIComponent(gist.id)}`, { method: "DELETE" }).catch(() => undefined)
    throw new GithubSyncError("GitHub 没有创建私密 Gist，已中止。")
  }
  return gist
}

async function patchGist(token: string, gistId: string, content: string) {
  await ghJson(token, `/gists/${encodeURIComponent(gistId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      // Separate files preserve simultaneous writes from different devices.
      files: { [`atrium-device-${deviceId()}.json`]: { content } },
    }),
  })
}

function markSynced(config: PersistedSync) {
  writeConfig({ ...config, lastSyncAt: Date.now() })
}

function applyRemote(remote: StoreData) {
  applyingRemote = true
  try {
    const local = getSnapshot()
    const merged = mergeStores(local, remote)
    if (serializeStore(merged) !== serializeStore(local)) replaceStore(merged)
  } finally {
    applyingRemote = false
  }
}

async function pushCurrent() {
  const config = requireConfig()
  let uploaded = serializeStore(getSnapshot())
  if (uploaded !== lastPushed) {
    await patchGist(config.token, config.gistId, uploaded)
    const latest = serializeStore(getSnapshot())
    if (latest !== uploaded) {
      await patchGist(config.token, config.gistId, latest)
      uploaded = latest
    }
  }
  if (serializeStore(getSnapshot()) !== uploaded) return
  lastPushed = uploaded
  clearLocalWins()
  markSynced(readConfig())
}

async function reconcile() {
  if (localWins()) {
    await pushCurrent()
    return
  }
  const config = requireConfig()
  const gist = await getGist(config.token, config.gistId)
  const remote = await readStoreFromGist(gist)
  if (localWins()) {
    await pushCurrent()
    return
  }
  applyRemote(remote)
  const current = readConfig()
  if (current.gistUrl !== gistUrlOf(gist, config.gistId)) {
    writeConfig({ ...current, gistUrl: gistUrlOf(gist, config.gistId) })
  }
  if (localWins() || serializeStore(getSnapshot()) !== serializeStore(remote)) {
    await pushCurrent()
    return
  }
  lastPushed = serializeStore(getSnapshot())
  clearLocalWins()
  markSynced(readConfig())
}

async function pullOnly() {
  const config = requireConfig()
  const gist = await getGist(config.token, config.gistId)
  const remote = await readStoreFromGist(gist)
  clearLocalWins()
  applyRemote(remote)
  const current = readConfig()
  writeConfig({ ...current, gistUrl: gistUrlOf(gist, config.gistId), lastSyncAt: Date.now() })
}

function runExclusive(task: () => Promise<void>): Promise<void> {
  const run = tail.then(async () => {
    memory = { phase: "syncing", lastError: null }
    emit()
    try {
      await task()
      memory = { phase: "idle", lastError: null }
    } catch (error) {
      memory = { phase: "idle", lastError: toMessage(error) }
    }
    emit()
  })
  tail = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function clearScheduledPush() {
  if (typeof window === "undefined") return
  window.clearTimeout(pushTimer)
  pushTimer = 0
}

function schedulePush() {
  if (!hasConnection() || typeof window === "undefined") return
  window.clearTimeout(pushTimer)
  pushTimer = window.setTimeout(() => {
    pushTimer = 0
    void runExclusive(() => reconcile())
  }, PUSH_DELAY_MS)
}

async function resolveGist(token: string, explicitId: string | null): Promise<GistPayload> {
  if (explicitId) return getGist(token, explicitId)
  const found = await findProgressGist(token)
  if (found?.id) return getGist(token, found.id)
  return createGist(token, serializeStore(getSnapshot()))
}

export function connectGithub(tokenInput: string, gistInput: string): Promise<boolean> {
  clearScheduledPush()
  return runExclusive(async () => {
    const token = tokenInput.trim()
    if (!token) throw new GithubSyncError("请粘贴访问令牌。")
    if (/\s/.test(token)) throw new GithubSyncError("令牌里有空格，请只粘贴令牌本身。")
    if (token.length > 300) throw new GithubSyncError("令牌看起来不对。")
    const explicitId = parseGistId(gistInput)
    const gist = await resolveGist(token, explicitId)
    if (!gist.id) throw new GithubSyncError("GitHub 没有返回 Gist ID。")
    writeConfig({
      token,
      gistId: gist.id,
      gistUrl: gistUrlOf(gist, gist.id),
      lastSyncAt: null,
    })
    await reconcile()
  }).then(() => getGithubSyncSnapshot().connected && getGithubSyncSnapshot().lastError === null)
}

export function clearGithubSyncError() {
  if (!memory.lastError || memory.phase === "syncing") return
  memory = { ...memory, lastError: null }
  emit()
}

export function disconnectGithub() {
  clearScheduledPush()
  const config = readConfig()
  writeConfig({ ...config, token: null })
  lastPushed = ""
  memory = { phase: "idle", lastError: null }
  emit()
}

export function syncGithubNow(): Promise<void> {
  clearScheduledPush()
  return runExclusive(() => (localWins() ? pushCurrent() : reconcile()))
}

export function pullGithub(): Promise<void> {
  clearScheduledPush()
  return runExclusive(() => pullOnly())
}

export function pushGithubNow(): Promise<void> {
  clearScheduledPush()
  return runExclusive(() => pushCurrent())
}

export function installGithubSync() {
  if (installed || typeof window === "undefined") return
  installed = true
  subscribe(() => {
    if (applyingRemote) return
    schedulePush()
  })
  window.addEventListener("storage", (event) => {
    if (event.key !== GITHUB_SYNC_STORAGE_KEY) return
    emit()
  })
  const autoSync = () => {
    if (hasConnection() && memory.phase !== "syncing" && navigator.onLine && document.visibilityState === "visible") {
      void syncGithubNow()
    }
  }
  window.addEventListener("focus", autoSync)
  window.addEventListener("online", autoSync)
  document.addEventListener("visibilitychange", autoSync)
  window.setInterval(autoSync, 30_000)
  if (!hasConnection()) return
  if (localWins()) void pushGithubNow()
  else void syncGithubNow()
}

export function formatSynced(ts: number, now = Date.now()): string {
  const delta = Math.max(0, now - ts)
  if (delta < 60_000) return "刚刚"
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ts)
}
