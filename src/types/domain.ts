// Tipos de dominio y guards de forma (sin lógica de negocio: la validación
// semántica de fechas y horas vive en `src/lib/`).

export type ISODateString = string // "YYYY-MM-DD"
export type TimeOfDay = string // "HH:mm" (24 h)
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7 // 1 = lunes … 7 = domingo
export type CategorySlug = "training" | "study" | "work" | "personal" | "rest"
export type CategoryColor = "zinc" | "sky" | "amber" | "violet" | "rose"

export interface Category {
  id: string
  name: string
  slug: CategorySlug
  color: CategoryColor
  icon?: string
  isSeed?: boolean
}

export interface Habit {
  id: string
  title: string
  description?: string
  categoryId: string
  targetDays: DayOfWeek[]
  createdAt: ISODateString
  active: boolean
  startTime?: TimeOfDay
  priority: boolean
  isSeed?: boolean
}

export interface CompletionLog {
  habitId: string
  date: ISODateString
  completed: boolean
}

export interface StudySession {
  id: string
  date: ISODateString
  minutes: number
  subject?: string
  createdAt: ISODateString
}

export interface SleepLog {
  id: string
  date: ISODateString
  hours: number
  createdAt: ISODateString
}

export interface WeeklyGoals {
  studyMinutesPerWeek: number
  sleepHoursPerNight: number
}

export interface NextAction {
  habit: Habit
  status: "upcoming" | "overdue"
}

const DAYS_OF_WEEK: readonly DayOfWeek[] = [1, 2, 3, 4, 5, 6, 7]

const CATEGORY_SLUGS: readonly CategorySlug[] = [
  "training",
  "study",
  "work",
  "personal",
  "rest",
]

const CATEGORY_COLORS: readonly CategoryColor[] = [
  "zinc",
  "sky",
  "amber",
  "violet",
  "rose",
]

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isDayOfWeek(value: unknown): value is DayOfWeek {
  return (
    typeof value === "number" &&
    (DAYS_OF_WEEK as readonly number[]).includes(value)
  )
}

export function isCategorySlug(value: unknown): value is CategorySlug {
  return (
    typeof value === "string" &&
    (CATEGORY_SLUGS as readonly string[]).includes(value)
  )
}

export function isCategoryColor(value: unknown): value is CategoryColor {
  return (
    typeof value === "string" &&
    (CATEGORY_COLORS as readonly string[]).includes(value)
  )
}
