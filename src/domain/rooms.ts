export type RoomIcon =
  | "door"
  | "library"
  | "flask"
  | "forum"
  | "palette"
  | "archive"
  | "telescope"
  | "hexagon"

export interface Room {
  id: string
  name: string
  kicker: string
  blurb: string
  icon: RoomIcon
}

export const ROOMS: readonly Room[] = [
  {
    id: "threshold",
    name: "门槛",
    kicker: "Core",
    blurb: "学术阅读里反复出现的骨架词。",
    icon: "door",
  },
  {
    id: "library",
    name: "书库",
    kicker: "Argument",
    blurb: "论点、让步与证据怎么摆。",
    icon: "library",
  },
  {
    id: "laboratory",
    name: "实验室",
    kicker: "Science",
    blurb: "假说、变量，以及结论怎么站住。",
    icon: "flask",
  },
  {
    id: "forum",
    name: "议事",
    kicker: "Society",
    blurb: "制度、公共生活与权力。",
    icon: "forum",
  },
  {
    id: "atelier",
    name: "工坊",
    kicker: "Arts",
    blurb: "叙事、图像与语气。",
    icon: "palette",
  },
  {
    id: "archive",
    name: "档案",
    kicker: "History",
    blurb: "时间、遗产与先例。",
    icon: "archive",
  },
  {
    id: "observatory",
    name: "观象",
    kicker: "Nature",
    blurb: "环境、物种与地貌。",
    icon: "telescope",
  },
  {
    id: "chamber",
    name: "内室",
    kicker: "Abstract",
    blurb: "抽象品质，和句子里的温度。",
    icon: "hexagon",
  },
]

export function roomById(id: string): Room | undefined {
  return ROOMS.find((room) => room.id === id)
}
