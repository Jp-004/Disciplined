// Única capa con efectos de E/S: lectura tipada, escritura con resultado,
// bloqueo de claves ilegibles y suscripción al evento `storage`.
// El prefijo de almacenamiento vive solo en `STORAGE_KEYS`.

import type {
  Category,
  CompletionLog,
  Habit,
  SleepLog,
  StudySession,
  WeeklyGoals,
} from "@/types/domain"
import { isRecord } from "@/types/domain"
import type {
  SeedState,
  StartupState,
  StorageKey,
  StorageRead,
  WriteResult,
} from "@/types/storage"
import { STORAGE_KEYS } from "@/types/storage"
import { defaultWeeklyGoals, normalizeWeeklyGoals } from "@/lib/goals"
import {
  normalizeCategories,
  normalizeCompletionLogs,
  normalizeHabits,
  normalizeSleepLogs,
  normalizeStudySessions,
} from "@/lib/normalize"

const blockedKeys = new Set<StorageKey>()

function isArray(value: unknown): boolean {
  return Array.isArray(value)
}

function block(key: StorageKey): void {
  blockedKeys.add(key)
}

function unblock(key: StorageKey): void {
  blockedKeys.delete(key)
}

function hasWindow(): boolean {
  return typeof window !== "undefined"
}

function isQuotaError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false
  }
  return error.name === "QuotaExceededError" || error.code === 22
}

function readEntity<T>(
  key: StorageKey,
  fallback: T,
  topShapeGuard: (value: unknown) => boolean,
  normalize: (value: unknown) => T
): StorageRead<T> {
  if (!hasWindow() || !isStorageAvailable()) {
    return { data: fallback, status: "empty" }
  }

  let raw: string | null
  try {
    raw = window.localStorage.getItem(STORAGE_KEYS[key])
  } catch {
    return { data: fallback, status: "empty" }
  }

  if (raw === null) {
    return { data: fallback, status: "empty" }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    block(key)
    return { data: fallback, status: "corrupt" }
  }

  if (!topShapeGuard(parsed)) {
    block(key)
    return { data: fallback, status: "corrupt" }
  }

  return { data: normalize(parsed), status: "ok" }
}

function writeEntity(key: StorageKey, value: unknown): WriteResult {
  if (isWriteBlocked(key)) {
    return { ok: false, reason: "blocked" }
  }
  if (!hasWindow() || !isStorageAvailable()) {
    return { ok: false, reason: "unavailable" }
  }

  try {
    window.localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value))
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: isQuotaError(error) ? "quota" : "unavailable" }
  }
}

function findStorageKey(rawKey: string): StorageKey | null {
  const keys = Object.keys(STORAGE_KEYS) as StorageKey[]
  for (const key of keys) {
    if (STORAGE_KEYS[key] === rawKey) {
      return key
    }
  }
  return null
}

export function isStorageAvailable(): boolean {
  if (!hasWindow()) {
    return false
  }
  try {
    const storage = window.localStorage
    if (typeof storage === "undefined" || storage === null) {
      return false
    }
    // Sonda de lectura: detecta almacenamiento accesible pero no legible
    // (p. ej. `getItem` lanzando) sin escribir nada.
    storage.getItem(STORAGE_KEYS.STARTUP_SHOWN)
    return true
  } catch {
    return false
  }
}

export function isWriteBlocked(key: StorageKey): boolean {
  return blockedKeys.has(key)
}

export function getStartupState(): StorageRead<StartupState> {
  return readEntity<StartupState>(
    "STARTUP_SHOWN",
    { hasSeenStartup: false },
    isRecord,
    (value) => {
      if (!isRecord(value)) {
        return { hasSeenStartup: false }
      }
      return {
        hasSeenStartup:
          typeof value.hasSeenStartup === "boolean" ? value.hasSeenStartup : false,
      }
    }
  )
}

export function setStartupState(state: StartupState): WriteResult {
  return writeEntity("STARTUP_SHOWN", state)
}

export function getCategories(): StorageRead<Category[]> {
  return readEntity<Category[]>("CATEGORIES", [], isArray, normalizeCategories)
}

export function setCategories(value: Category[]): WriteResult {
  return writeEntity("CATEGORIES", value)
}

export function getHabits(): StorageRead<Habit[]> {
  return readEntity<Habit[]>("HABITS", [], isArray, normalizeHabits)
}

export function setHabits(value: Habit[]): WriteResult {
  return writeEntity("HABITS", value)
}

export function getCompletionLogs(): StorageRead<CompletionLog[]> {
  return readEntity<CompletionLog[]>(
    "COMPLETION_LOGS",
    [],
    isArray,
    normalizeCompletionLogs
  )
}

export function setCompletionLogs(value: CompletionLog[]): WriteResult {
  return writeEntity("COMPLETION_LOGS", value)
}

export function getStudySessions(): StorageRead<StudySession[]> {
  return readEntity<StudySession[]>(
    "STUDY_SESSIONS",
    [],
    isArray,
    normalizeStudySessions
  )
}

export function setStudySessions(value: StudySession[]): WriteResult {
  return writeEntity("STUDY_SESSIONS", value)
}

export function getSleepLogs(): StorageRead<SleepLog[]> {
  return readEntity<SleepLog[]>("SLEEP_LOGS", [], isArray, normalizeSleepLogs)
}

export function setSleepLogs(value: SleepLog[]): WriteResult {
  return writeEntity("SLEEP_LOGS", value)
}

export function getWeeklyGoals(): StorageRead<WeeklyGoals> {
  return readEntity<WeeklyGoals>(
    "WEEKLY_GOALS",
    { ...defaultWeeklyGoals },
    isRecord,
    normalizeWeeklyGoals
  )
}

export function setWeeklyGoals(value: WeeklyGoals): WriteResult {
  return writeEntity("WEEKLY_GOALS", value)
}

export function getSeedState(): StorageRead<SeedState | null> {
  return readEntity<SeedState | null>(
    "SEED_STATE",
    null,
    (value) => isRecord(value) && value.version === 1,
    (value) => {
      if (!isRecord(value) || typeof value.seededAt !== "string") {
        return null
      }
      return { seededAt: value.seededAt, version: 1 }
    }
  )
}

export function setSeedState(value: SeedState): WriteResult {
  return writeEntity("SEED_STATE", value)
}

export function resetKey(key: StorageKey): WriteResult {
  if (!hasWindow() || !isStorageAvailable()) {
    return { ok: false, reason: "unavailable" }
  }

  try {
    window.localStorage.removeItem(STORAGE_KEYS[key])
  } catch {
    return { ok: false, reason: "unavailable" }
  }

  unblock(key)
  return { ok: true }
}

export function subscribeToStorage(
  listener: (key: StorageKey) => void
): () => void {
  if (!hasWindow()) {
    return () => {}
  }

  const handler = (event: StorageEvent): void => {
    if (event.key === null) {
      return
    }
    const key = findStorageKey(event.key)
    if (key === null) {
      return
    }
    listener(key)
  }

  window.addEventListener("storage", handler)
  return () => {
    window.removeEventListener("storage", handler)
  }
}
