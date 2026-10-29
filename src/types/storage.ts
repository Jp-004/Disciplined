import type { ISODateString } from "@/types/domain"

export const STORAGE_KEYS = {
  STARTUP_SHOWN: "disciplined:startupShown",
  // Legado reservado: se conserva la clave, pero ya no se lee ni se escribe.
  MOTIVATIONAL_PHRASE_STATE: "disciplined:motivationalPhraseState",
  HABITS: "disciplined:habits",
  COMPLETION_LOGS: "disciplined:completionLogs",
  STUDY_SESSIONS: "disciplined:studySessions",
  SLEEP_LOGS: "disciplined:sleepLogs",
  WEEKLY_GOALS: "disciplined:weeklyGoals",
  CATEGORIES: "disciplined:categories",
  SEED_STATE: "disciplined:seedState",
} as const

export type StorageKey = keyof typeof STORAGE_KEYS

export type StorageReadStatus = "ok" | "empty" | "corrupt"

export interface StorageRead<T> {
  data: T
  status: StorageReadStatus
}

export type WriteFailureReason = "blocked" | "quota" | "unavailable"

export type WriteResult = { ok: true } | { ok: false; reason: WriteFailureReason }

export interface StartupState {
  hasSeenStartup: boolean
}

export interface SeedState {
  seededAt: ISODateString
  version: 1
}
