// Reglas de estudio: suma semanal y progreso frente a la meta. Funciones puras.

import type { ISODateString, StudySession } from "@/types/domain"
import { compareISODates, getWeekRange } from "@/lib/date"
import { roundHalfUp } from "@/lib/numbers"

export function isValidStudyMinutes(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0
}

export function getWeeklyStudyMinutes(
  sessions: StudySession[],
  today: ISODateString
): number {
  const { start, end } = getWeekRange(today)
  let total = 0

  for (const session of sessions) {
    if (compareISODates(session.date, start) < 0) {
      continue
    }
    if (compareISODates(session.date, end) > 0) {
      continue
    }
    if (compareISODates(session.date, today) > 0) {
      continue
    }
    if (!isValidStudyMinutes(session.minutes)) {
      continue
    }
    total += session.minutes
  }

  return total
}

export function getGoalProgress(
  value: number,
  goal: number
): { percent: number; cappedPercent: number } {
  if (!Number.isFinite(goal) || goal <= 0 || !Number.isFinite(value) || value < 0) {
    return { percent: 0, cappedPercent: 0 }
  }
  const percent = roundHalfUp((value / goal) * 100, 0)
  return { percent, cappedPercent: Math.min(100, percent) }
}
