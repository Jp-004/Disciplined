// Normalización de colecciones leídas de LocalStorage (spec §3.5).
// Descarta elementos inválidos de forma individual, sin lanzar y sin reescribir datos.

import type {
  Category,
  CompletionLog,
  DayOfWeek,
  Habit,
  SleepLog,
  StudySession,
} from "@/types/domain"
import {
  isCategoryColor,
  isCategorySlug,
  isDayOfWeek,
  isRecord,
} from "@/types/domain"
import { isValidISODate } from "@/lib/date"
import { isValidTimeOfDay } from "@/lib/time"

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function normalizeTargetDays(value: unknown): DayOfWeek[] {
  if (!Array.isArray(value)) {
    return []
  }
  const days = new Set<DayOfWeek>()
  for (const item of value) {
    if (!isDayOfWeek(item)) {
      return []
    }
    days.add(item)
  }
  return [...days].sort((a, b) => a - b)
}

export function normalizeCategories(value: unknown): Category[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seenIds = new Set<string>()
  const categories: Category[] = []

  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }
    const { id, name, slug, color } = item
    if (
      !isNonEmptyString(id) ||
      !isNonEmptyString(name) ||
      !isCategorySlug(slug) ||
      !isCategoryColor(color) ||
      seenIds.has(id)
    ) {
      continue
    }

    seenIds.add(id)
    const category: Category = {
      id,
      name,
      slug,
      color,
      isSeed: typeof item.isSeed === "boolean" ? item.isSeed : false,
    }
    if (typeof item.icon === "string") {
      category.icon = item.icon
    }
    categories.push(category)
  }

  return categories
}

export function normalizeHabits(value: unknown): Habit[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seenIds = new Set<string>()
  const habits: Habit[] = []

  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }
    const { id, title, categoryId, createdAt } = item
    if (
      !isNonEmptyString(id) ||
      !isNonEmptyString(title) ||
      typeof categoryId !== "string" ||
      !isValidISODate(createdAt) ||
      seenIds.has(id)
    ) {
      continue
    }

    seenIds.add(id)
    const habit: Habit = {
      id,
      title,
      categoryId,
      targetDays: normalizeTargetDays(item.targetDays),
      createdAt,
      active: typeof item.active === "boolean" ? item.active : true,
      priority: typeof item.priority === "boolean" ? item.priority : false,
      isSeed: typeof item.isSeed === "boolean" ? item.isSeed : false,
    }
    if (typeof item.description === "string") {
      habit.description = item.description
    }
    if (isValidTimeOfDay(item.startTime)) {
      habit.startTime = item.startTime
    }
    habits.push(habit)
  }

  return habits
}

export function normalizeCompletionLogs(value: unknown): CompletionLog[] {
  if (!Array.isArray(value)) {
    return []
  }

  const logs: CompletionLog[] = []
  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }
    const { habitId, date, completed } = item
    if (typeof habitId !== "string" || !isValidISODate(date) || typeof completed !== "boolean") {
      continue
    }
    logs.push({ habitId, date, completed })
  }
  return logs
}

export function normalizeStudySessions(value: unknown): StudySession[] {
  if (!Array.isArray(value)) {
    return []
  }

  const sessions: StudySession[] = []
  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }
    const { id, date, minutes, createdAt } = item
    if (
      !isNonEmptyString(id) ||
      !isValidISODate(date) ||
      !isValidISODate(createdAt) ||
      !isFiniteNumber(minutes)
    ) {
      continue
    }

    const session: StudySession = { id, date, minutes, createdAt }
    if (typeof item.subject === "string") {
      session.subject = item.subject
    }
    sessions.push(session)
  }
  return sessions
}

export function normalizeSleepLogs(value: unknown): SleepLog[] {
  if (!Array.isArray(value)) {
    return []
  }

  const logs: SleepLog[] = []
  for (const item of value) {
    if (!isRecord(item)) {
      continue
    }
    const { id, date, hours, createdAt } = item
    if (
      !isNonEmptyString(id) ||
      !isValidISODate(date) ||
      !isValidISODate(createdAt) ||
      !isFiniteNumber(hours)
    ) {
      continue
    }
    logs.push({ id, date, hours, createdAt })
  }
  return logs
}
