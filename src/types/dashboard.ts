import type { TimeOfDay } from "@/types/domain"
import type { MotivationalPhrase } from "@/types/motivational"

export interface CompletionMetricView {
  todayPercent: number | null
  weekAverage: number | null
  hasHabitsToday: boolean
}

export interface StudyMetricView {
  totalMinutes: number
  goalMinutes: number
  percent: number
  cappedPercent: number
  hasSessions: boolean
}

export interface SleepMetricView {
  averageHours: number | null
  goalHours: number
  excludedCount: number
  meetsGoal: boolean | null
}

export interface NextActionView {
  habitId: string
  title: string
  startTime: TimeOfDay
  categoryName: string | null
  status: "upcoming" | "overdue"
}

export interface ChecklistItemView {
  habitId: string
  title: string
  startTime: TimeOfDay | null
  completed: boolean
  isSeed: boolean
  categoryName: string | null
}

export interface DashboardViewModel {
  weekLabel: string
  phrase: MotivationalPhrase
  nextAction: NextActionView | null
  completion: CompletionMetricView
  study: StudyMetricView
  sleep: SleepMetricView
  checklist: ChecklistItemView[]
  checklistCompleted: number
  checklistTotal: number
  todaySleepHours: number | null
}
