// Reglas de sueño: rango canónico, dedupe por fecha, promedio semanal y upsert.
// La ventana es por fecha de registro, de lunes a domingo y limitada a `date <= today` (D11).

import type { ISODateString, SleepLog } from "@/types/domain"
import { compareISODates, getWeekRange } from "@/lib/date"
import { roundHalfUp } from "@/lib/numbers"

export function isValidSleepHours(value: unknown): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return false
  }
  if (value < 0.5 || value > 24) {
    return false
  }
  return Number.isInteger(value * 2)
}

export function dedupeSleepLogsByDate(logs: SleepLog[]): SleepLog[] {
  const winnerByDate = new Map<string, { log: SleepLog; order: number }>()

  logs.forEach((log, index) => {
    const current = winnerByDate.get(log.date)
    if (!current) {
      winnerByDate.set(log.date, { log, order: index })
      return
    }
    const isNewer = compareISODates(log.createdAt, current.log.createdAt) >= 0
    if (isNewer) {
      winnerByDate.set(log.date, { log, order: current.order })
    }
  })

  return [...winnerByDate.values()]
    .sort((a, b) => a.order - b.order)
    .map((entry) => entry.log)
}

export function getWeeklySleepAverage(
  logs: SleepLog[],
  today: ISODateString
): { average: number | null; excludedCount: number } {
  const { start, end } = getWeekRange(today)
  const inWindow = logs.filter(
    (log) =>
      compareISODates(log.date, start) >= 0 &&
      compareISODates(log.date, end) <= 0 &&
      compareISODates(log.date, today) <= 0
  )

  const deduped = dedupeSleepLogsByDate(inWindow)
  const valid = deduped.filter((log) => isValidSleepHours(log.hours))
  const excludedCount = deduped.length - valid.length

  if (valid.length === 0) {
    return { average: null, excludedCount }
  }

  const total = valid.reduce((sum, log) => sum + log.hours, 0)
  return { average: roundHalfUp(total / valid.length, 1), excludedCount }
}

export function getSleepLogForDate(
  logs: SleepLog[],
  date: ISODateString
): SleepLog | null {
  const matching = logs.filter((log) => log.date === date)
  if (matching.length === 0) {
    return null
  }
  const [winner] = dedupeSleepLogsByDate(matching)
  return winner
}

export function upsertSleepLog(logs: SleepLog[], log: SleepLog): SleepLog[] {
  let lastIndex = -1
  for (let index = 0; index < logs.length; index += 1) {
    if (logs[index].date === log.date) {
      lastIndex = index
    }
  }

  if (lastIndex === -1) {
    return [...logs, log]
  }

  const existing = logs[lastIndex]
  const merged: SleepLog = {
    id: typeof log.id === "string" && log.id.length > 0 ? log.id : existing.id,
    date: log.date,
    hours: log.hours,
    createdAt:
      typeof log.createdAt === "string" && log.createdAt.length > 0
        ? log.createdAt
        : existing.createdAt,
  }

  const next: SleepLog[] = []
  for (let index = 0; index < logs.length; index += 1) {
    const current = logs[index]
    const isMatch = current.date === log.date
    if (isMatch && index !== lastIndex) {
      continue
    }
    next.push(isMatch ? merged : current)
  }
  return next
}
