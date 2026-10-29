// Aritmética de fechas civiles (`YYYY-MM-DD`) sin `Date` en los cálculos y sin
// dependencias de locale: los resultados no dependen de la zona horaria.

import type { DayOfWeek, ISODateString } from "@/types/domain"

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const MONTH_ABBREVIATIONS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
]

export interface DateParts {
  year: number
  month: number // 1–12
  day: number // 1–31
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0")
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(year: number, month: number): number {
  if (month === 2 && isLeapYear(year)) {
    return 29
  }
  return DAYS_IN_MONTH[month - 1]
}

// Días desde 1970-01-01 (algoritmo days_from_civil de Howard Hinnant).
function daysFromCivil(year: number, month: number, day: number): number {
  const adjustedYear = month <= 2 ? year - 1 : year
  const era = Math.floor(adjustedYear / 400)
  const yearOfEra = adjustedYear - era * 400
  const shiftedMonth = month > 2 ? month - 3 : month + 9
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1
  const dayOfEra =
    yearOfEra * 365 +
    Math.floor(yearOfEra / 4) -
    Math.floor(yearOfEra / 100) +
    dayOfYear
  return era * 146097 + dayOfEra - 719468
}

// Inverso de daysFromCivil.
function civilFromDays(days: number): DateParts {
  const shifted = days + 719468
  const era = Math.floor(shifted / 146097)
  const dayOfEra = shifted - era * 146097
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365
  )
  const year = yearOfEra + era * 400
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100))
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153)
  const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1
  const month = shiftedMonth + (shiftedMonth < 10 ? 3 : -9)
  return { year: month <= 2 ? year + 1 : year, month, day }
}

export function toLocalISODate(date: Date): ISODateString {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`
}

export function isValidISODate(value: unknown): value is ISODateString {
  if (typeof value !== "string" || !ISO_DATE_PATTERN.test(value)) {
    return false
  }
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  if (month < 1 || month > 12) {
    return false
  }
  return day >= 1 && day <= daysInMonth(year, month)
}

export function parseISODate(value: ISODateString): DateParts {
  return {
    year: Number(value.slice(0, 4)),
    month: Number(value.slice(5, 7)),
    day: Number(value.slice(8, 10)),
  }
}

export function formatISODate(parts: DateParts): ISODateString {
  return `${pad(parts.year, 4)}-${pad(parts.month, 2)}-${pad(parts.day, 2)}`
}

export function addDays(date: ISODateString, days: number): ISODateString {
  const { year, month, day } = parseISODate(date)
  return formatISODate(civilFromDays(daysFromCivil(year, month, day) + days))
}

export function compareISODates(a: ISODateString, b: ISODateString): number {
  if (a === b) {
    return 0
  }
  return a < b ? -1 : 1
}

export function getDayOfWeek(today: ISODateString): DayOfWeek {
  const { year, month, day } = parseISODate(today)
  const sundayBased = (daysFromCivil(year, month, day) + 4) % 7 // 0 = domingo
  return (sundayBased === 0 ? 7 : sundayBased) as DayOfWeek
}

export function getDayOfYear(today: ISODateString): number {
  const { year, month, day } = parseISODate(today)
  return daysFromCivil(year, month, day) - daysFromCivil(year, 1, 1) + 1
}

export function getWeekRange(today: ISODateString): {
  start: ISODateString
  end: ISODateString
} {
  const dayOfWeek = getDayOfWeek(today)
  const start = addDays(today, 1 - dayOfWeek)
  return { start, end: addDays(start, 6) }
}

export function getWeekDates(today: ISODateString): ISODateString[] {
  const { start } = getWeekRange(today)
  const dates: ISODateString[] = []
  for (let offset = 0; offset < 7; offset += 1) {
    dates.push(addDays(start, offset))
  }
  return dates
}

export function formatWeekLabel(range: {
  start: ISODateString
  end: ISODateString
}): string {
  const start = parseISODate(range.start)
  const end = parseISODate(range.end)
  const startLabel = `${start.day} ${MONTH_ABBREVIATIONS[start.month - 1]}`
  const endLabel = `${end.day} ${MONTH_ABBREVIATIONS[end.month - 1]}`
  if (start.year !== end.year) {
    return `${startLabel} ${start.year} – ${endLabel} ${end.year}`
  }
  return `${startLabel} – ${endLabel}`
}
