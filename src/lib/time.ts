// Horas del día en formato `HH:mm`; las comparaciones siempre en minutos.

import type { TimeOfDay } from "@/types/domain"

const TIME_OF_DAY_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidTimeOfDay(value: unknown): value is TimeOfDay {
  return typeof value === "string" && TIME_OF_DAY_PATTERN.test(value)
}

export function toMinutes(time: TimeOfDay): number {
  const hours = Number(time.slice(0, 2))
  const minutes = Number(time.slice(3, 5))
  return hours * 60 + minutes
}

export function formatTimeOfDay(time: TimeOfDay): string {
  if (!isValidTimeOfDay(time)) {
    return ""
  }
  return `${time.slice(0, 2)}:${time.slice(3, 5)}`
}
