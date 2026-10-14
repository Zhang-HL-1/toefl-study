import {
  Archive,
  DoorOpen,
  FlaskConical,
  Hexagon,
  Library,
  MessagesSquare,
  Palette,
  Telescope,
} from "lucide-react"
import type { RoomIcon } from "../domain/rooms"

const ICONS = {
  door: DoorOpen,
  library: Library,
  flask: FlaskConical,
  forum: MessagesSquare,
  palette: Palette,
  archive: Archive,
  telescope: Telescope,
  hexagon: Hexagon,
} as const

export function RoomGlyph({ name, size = 18 }: { name: RoomIcon; size?: number }) {
  const Icon = ICONS[name]
  return <Icon size={size} strokeWidth={1.6} aria-hidden />
}
