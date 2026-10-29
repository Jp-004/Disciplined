// Reglas de hábitos: aplicabilidad por día, cumplimiento, próxima acción y upsert.
// Funciones puras: reciben `today`/`now` del llamador.

import type {
  CompletionLog,
  Habit,
  ISODateString,
  NextAction,
  TimeOfDay,
} from "@/types/domain"
import { addDays, compareISODates, getDayOfWeek, getWeekRange } from "@/lib/date"
import { roundHalfUp } from "@/lib/numbers"
import { isValidTimeOfDay, toMinutes } from "@/lib/time"

interface TimedHabit {
  habit: Habit
  minutes: number
}

function compareText(a: string, b: string): number {
  if (a === b) {
    return 0
  }
  return a < b ? -1 : 1
}

function compareTieBreak(a: Habit, b: Habit): number {
  return compareText(a.title, b.title) || compareText(a.id, b.id)
}

function compareByStartTime(a: Habit, b: Habit): number {
  const aMinutes = isValidTimeOfDay(a.startTime) ? toMinutes(a.startTime) : null
  const bMinutes = isValidTimeOfDay(b.startTime) ? toMinutes(b.startTime) : null
  if (aMinutes !== null && bMinutes !== null && aMinutes !== bMinutes) {
    return aMinutes - bMinutes
  }
  if (aMinutes !== null && bMinutes === null) {
    return -1
  }
  if (aMinutes === null && bMinutes !== null) {
    return 1
  }
  return compareTieBreak(a, b)
}

function compareUpcoming(a: TimedHabit, b: TimedHabit): number {
  if (a.minutes !== b.minutes) {
    return a.minutes - b.minutes
  }
  return compareTieBreak(a.habit, b.habit)
}

function compareOverdue(a: TimedHabit, b: TimedHabit): number {
  if (a.minutes !== b.minutes) {
    return b.minutes - a.minutes
  }
  return compareTieBreak(a.habit, b.habit)
}

export function getHabitsForDate(habits: Habit[], today: ISODateString): Habit[] {
  const dayOfWeek = getDayOfWeek(today)
  return habits.filter(
    (habit) => habit.active && habit.targetDays.includes(dayOfWeek)
  )
}

export function isCompletedOn(
  logs: CompletionLog[],
  habitId: string,
  date: ISODateString
): boolean {
  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const log = logs[index]
    if (log.habitId === habitId && log.date === date) {
      return log.completed
    }
  }
  return false
}

// Índice lineal reutilizable: recorre los logs en orden y el último registro gana.
export function buildCompletionIndex(
  logs: CompletionLog[]
): Map<string, boolean> {
  const index = new Map<string, boolean>()
  for (const log of logs) {
    index.set(`${log.habitId}|${log.date}`, log.completed)
  }
  return index
}

export function isCompletedInIndex(
  index: Map<string, boolean>,
  habitId: string,
  date: ISODateString
): boolean {
  return index.get(`${habitId}|${date}`) ?? false
}

export function countCompleted(
  habits: Habit[],
  logs: CompletionLog[],
  date: ISODateString
): number {
  const index = buildCompletionIndex(logs)
  let completed = 0
  for (const habit of habits) {
    if (isCompletedInIndex(index, habit.id, date)) {
      completed += 1
    }
  }
  return completed
}

export function getDailyCompletionRate(
  habits: Habit[],
  logs: CompletionLog[],
  today: ISODateString
): number | null {
  const applicable = getHabitsForDate(habits, today)
  if (applicable.length === 0) {
    return null
  }
  const completed = countCompleted(applicable, logs, today)
  return roundHalfUp((completed / applicable.length) * 100, 0)
}

export function getWeeklyCompletionAverage(
  habits: Habit[],
  logs: CompletionLog[],
  today: ISODateString
): number | null {
  const { start } = getWeekRange(today)
  const index = buildCompletionIndex(logs)
  let total = 0
  let computableDays = 0
  let cursor = start

  while (compareISODates(cursor, today) <= 0) {
    const applicable = getHabitsForDate(habits, cursor)
    if (applicable.length > 0) {
      let completed = 0
      for (const habit of applicable) {
        if (isCompletedInIndex(index, habit.id, cursor)) {
          completed += 1
        }
      }
      total += roundHalfUp((completed / applicable.length) * 100, 0)
      computableDays += 1
    }
    cursor = addDays(cursor, 1)
  }

  if (computableDays === 0) {
    return null
  }
  return roundHalfUp(total / computableDays, 0)
}

export function getChecklistHabits(
  habits: Habit[],
  today: ISODateString
): Habit[] {
  const applicable = getHabitsForDate(habits, today)
  const prioritized = applicable.filter((habit) => habit.priority)
  const base = prioritized.length > 0 ? prioritized : applicable
  return [...base].sort(compareByStartTime)
}

export function getNextAction(
  habits: Habit[],
  logs: CompletionLog[],
  today: ISODateString,
  now: TimeOfDay
): NextAction | null {
  const nowMinutes = toMinutes(now)
  const index = buildCompletionIndex(logs)
  const pending: TimedHabit[] = []

  for (const habit of getHabitsForDate(habits, today)) {
    if (!isValidTimeOfDay(habit.startTime)) {
      continue
    }
    if (isCompletedInIndex(index, habit.id, today)) {
      continue
    }
    pending.push({ habit, minutes: toMinutes(habit.startTime) })
  }

  if (pending.length === 0) {
    return null
  }

  const upcoming = pending.filter((candidate) => candidate.minutes >= nowMinutes)
  if (upcoming.length > 0) {
    const [next] = [...upcoming].sort(compareUpcoming)
    return { habit: next.habit, status: "upcoming" }
  }

  const [mostRecent] = [...pending].sort(compareOverdue)
  return { habit: mostRecent.habit, status: "overdue" }
}

export function upsertCompletion(
  logs: CompletionLog[],
  habitId: string,
  date: ISODateString,
  completed: boolean
): CompletionLog[] {
  let lastIndex = -1
  for (let index = 0; index < logs.length; index += 1) {
    const log = logs[index]
    if (log.habitId === habitId && log.date === date) {
      lastIndex = index
    }
  }

  if (lastIndex === -1) {
    return [...logs, { habitId, date, completed }]
  }

  const next: CompletionLog[] = []
  for (let index = 0; index < logs.length; index += 1) {
    const log = logs[index]
    const isMatch = log.habitId === habitId && log.date === date
    if (isMatch && index !== lastIndex) {
      continue
    }
    next.push(isMatch ? { habitId, date, completed } : log)
  }
  return next
}
