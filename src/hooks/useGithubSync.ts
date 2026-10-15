import { useSyncExternalStore } from "react"
import { getGithubSyncSnapshot, subscribeGithubSync, type GithubSyncSnapshot } from "../domain/githubSync"

export function useGithubSync(): GithubSyncSnapshot {
  return useSyncExternalStore(subscribeGithubSync, getGithubSyncSnapshot, getGithubSyncSnapshot)
}
