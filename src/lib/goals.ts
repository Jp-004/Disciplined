// Metas semanales: valores por defecto, rangos canónicos y normalización tolerante.

import type { WeeklyGoals } from "@/types/domain"
import { isRecord } from "@/types/domain"
import { isValidSleepHours } from "@/lib/sleep"

export const defaultWeeklyGoals: WeeklyGoals = {
  studyMinutesPerWeek: 600,
  sleepHoursPerNight: 8,
}

export function isValidStudyGoal(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 60 &&
    value <= 4200
  )
}

export function isValidSleepGoal(value: unknown): value is number {
  return isValidSleepHours(value)
}

export function normalizeWeeklyGoals(value: unknown): WeeklyGoals {
  const record = isRecord(value) ? value : {}
  const study = record.studyMinutesPerWeek
  const sleep = record.sleepHoursPerNight

  return {
    studyMinutesPerWeek: isValidStudyGoal(study)
      ? study
      : defaultWeeklyGoals.studyMinutesPerWeek,
    sleepHoursPerNight: isValidSleepGoal(sleep)
      ? sleep
      : defaultWeeklyGoals.sleepHoursPerNight,
  }
}
