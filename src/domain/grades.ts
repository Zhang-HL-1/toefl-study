export const GRADE_IDS = ["forgot", "fuzzy", "remember", "master"] as const

export type GradeId = (typeof GRADE_IDS)[number]

export interface Grade {
  id: GradeId
  label: string
  hint: string
  q: number
}

export const GRADES: readonly Grade[] = [
  { id: "forgot", label: "忘了", hint: "完全不认识", q: 1 },
  { id: "fuzzy", label: "模糊", hint: "见过，说不清", q: 3 },
  { id: "remember", label: "记得", hint: "能想起意思", q: 4 },
  { id: "master", label: "很熟", hint: "立刻反应", q: 5 },
]

export function gradeById(id: GradeId): Grade {
  const grade = GRADES.find((item) => item.id === id)
  if (!grade) throw new Error(`unknown grade ${id}`)
  return grade
}
