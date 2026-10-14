import { useSyncExternalStore } from "react"
import { getSnapshot, subscribe } from "../domain/store"
import type { StoreData } from "../domain/types"

export function useStore(): StoreData {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
