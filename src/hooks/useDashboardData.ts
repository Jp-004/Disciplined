"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type {
  Category,
  CompletionLog,
  Habit,
  ISODateString,
  SleepLog,
  StudySession,
  WeeklyGoals,
} from "@/types/domain"
import type {
  StorageKey,
  StorageReadStatus,
  WriteFailureReason,
} from "@/types/storage"
import {
  getCategories,
  getCompletionLogs,
  getHabits,
  getSeedState,
  getSleepLogs,
  getStartupState,
  getStudySessions,
  getWeeklyGoals,
  isStorageAvailable,
  resetKey as resetStoredKey,
  setCategories,
  setCompletionLogs,
  setHabits,
  setSeedState,
  setSleepLogs,
  setWeeklyGoals,
  subscribeToStorage,
} from "@/lib/persistence"
import {
  buildSeedState,
  createSeedHabits,
  resolveSeedPlan,
  seedCategories,
} from "@/lib/seeds"
import {
  defaultWeeklyGoals,
  isValidSleepGoal,
  isValidStudyGoal,
} from "@/lib/goals"
import { upsertCompletion } from "@/lib/habits"
import {
  getSleepLogForDate,
  isValidSleepHours,
  upsertSleepLog,
} from "@/lib/sleep"

export interface DashboardData {
  categories: Category[]
  habits: Habit[]
  completionLogs: CompletionLog[]
  studySessions: StudySession[]
  sleepLogs: SleepLog[]
  weeklyGoals: WeeklyGoals
}

export interface DashboardNotice {
  tone: "info" | "error"
  message: string
  resetKey?: StorageKey
}

export interface DashboardIssues {
  corruptKeys: StorageKey[]
  storageUnavailable: boolean
  notice: DashboardNotice | null
}

export interface DashboardActions {
  toggleHabit: (habitId: string, completed: boolean) => boolean
  saveSleep: (hours: number) => boolean
  saveGoals: (goals: WeeklyGoals) => boolean
  resetKey: (key: StorageKey) => void
  dismissNotice: () => void
}

export interface UseDashboardDataResult
  extends DashboardData,
    DashboardActions {
  issues: DashboardIssues
  loading: boolean
}

interface DashboardState extends DashboardData {
  loading: boolean
  corruptKeys: StorageKey[]
  storageUnavailable: boolean
  manualNotice: DashboardNotice | null
}

const KEY_LABELS: Record<StorageKey, string> = {
  STARTUP_SHOWN: "inicio",
  MOTIVATIONAL_PHRASE_STATE: "frase motivacional",
  HABITS: "hábitos",
  COMPLETION_LOGS: "registros de cumplimiento",
  STUDY_SESSIONS: "sesiones de estudio",
  SLEEP_LOGS: "registros de sueño",
  WEEKLY_GOALS: "metas semanales",
  CATEGORIES: "categorías",
  SEED_STATE: "estado de siembra",
}

function createInitialData(): DashboardData {
  return {
    categories: [],
    habits: [],
    completionLogs: [],
    studySessions: [],
    sleepLogs: [],
    weeklyGoals: { ...defaultWeeklyGoals },
  }
}

function describeWriteFailure(
  reason: WriteFailureReason,
  key: StorageKey
): DashboardNotice {
  if (reason === "blocked") {
    return {
      tone: "error",
      message: `No se pudo guardar en «${KEY_LABELS[key]}»: la clave está bloqueada. Restablézcala para volver a escribir.`,
      resetKey: key,
    }
  }
  if (reason === "quota") {
    return {
      tone: "error",
      message:
        "No se pudo guardar: el almacenamiento del navegador está lleno.",
    }
  }
  return {
    tone: "error",
    message:
      "No se pudo guardar: el almacenamiento local no está disponible.",
  }
}

function buildIssueNotice(
  corruptKeys: StorageKey[],
  storageUnavailable: boolean
): DashboardNotice | null {
  if (corruptKeys.length > 0) {
    const firstKey = corruptKeys[0]
    if (corruptKeys.length === 1) {
      return {
        tone: "info",
        message: `No se pudo leer «${KEY_LABELS[firstKey]}». Se muestran valores por defecto; puedes restablecer esa clave.`,
        resetKey: firstKey,
      }
    }
    const labels = corruptKeys.map((key) => KEY_LABELS[key]).join(", ")
    return {
      tone: "info",
      message: `No se pudieron leer varias claves (${labels}). Se muestran valores por defecto.`,
      resetKey: firstKey,
    }
  }

  if (storageUnavailable) {
    return {
      tone: "error",
      message:
        "El almacenamiento local no está disponible: los cambios no se guardarán.",
    }
  }

  return null
}

function createSleepLogId(today: ISODateString): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return `${today}-${Date.now()}`
}

interface ReadSnapshot {
  data: DashboardData
  corruptKeys: StorageKey[]
}

// Lee las 7 colecciones + SEED_STATE + STARTUP_SHOWN y acumula las claves ilegibles.
function readAllData(): ReadSnapshot {
  const categories = getCategories()
  const habits = getHabits()
  const completionLogs = getCompletionLogs()
  const studySessions = getStudySessions()
  const sleepLogs = getSleepLogs()
  const weeklyGoals = getWeeklyGoals()
  const seedState = getSeedState()
  const startupState = getStartupState()

  const reads: Array<{ key: StorageKey; status: StorageReadStatus }> = [
    { key: "CATEGORIES", status: categories.status },
    { key: "HABITS", status: habits.status },
    { key: "COMPLETION_LOGS", status: completionLogs.status },
    { key: "STUDY_SESSIONS", status: studySessions.status },
    { key: "SLEEP_LOGS", status: sleepLogs.status },
    { key: "WEEKLY_GOALS", status: weeklyGoals.status },
    { key: "SEED_STATE", status: seedState.status },
    { key: "STARTUP_SHOWN", status: startupState.status },
  ]

  const corruptKeys: StorageKey[] = []
  for (const read of reads) {
    if (read.status === "corrupt") {
      corruptKeys.push(read.key)
    }
  }

  return {
    data: {
      categories: categories.data,
      habits: habits.data,
      completionLogs: completionLogs.data,
      studySessions: studySessions.data,
      sleepLogs: sleepLogs.data,
      weeklyGoals: weeklyGoals.data,
    },
    corruptKeys,
  }
}

// Siembra idempotente por colección (plan §5.5); SEED_STATE se escribe al final.
function seedIfNeeded(today: ISODateString): DashboardNotice | null {
  const seedState = getSeedState()
  const categories = getCategories()
  const habits = getHabits()
  const plan = resolveSeedPlan({
    hasSeedState: seedState.status === "ok",
    categoriesStatus: categories.status,
    habitsStatus: habits.status,
  })

  if (plan.writeCategories) {
    const result = setCategories(seedCategories)
    if (!result.ok) {
      return describeWriteFailure(result.reason, "CATEGORIES")
    }
  }

  if (plan.writeHabits) {
    const result = setHabits(createSeedHabits(today))
    if (!result.ok) {
      return describeWriteFailure(result.reason, "HABITS")
    }
  }

  if (plan.writeSeedState) {
    const result = setSeedState(buildSeedState(today))
    if (!result.ok) {
      return describeWriteFailure(result.reason, "SEED_STATE")
    }
  }

  return null
}

export function useDashboardData(
  today: ISODateString | null
): UseDashboardDataResult {
  const [state, setState] = useState<DashboardState>(() => ({
    ...createInitialData(),
    loading: true,
    corruptKeys: [],
    storageUnavailable: false,
    manualNotice: null,
  }))
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(
    null
  )
  const dataRef = useRef<DashboardData>(createInitialData())
  const seededRef = useRef(false)

  const reload = useCallback((): void => {
    const snapshot = readAllData()
    dataRef.current = snapshot.data
    setState((current) => ({
      ...current,
      ...snapshot.data,
      corruptKeys: snapshot.corruptKeys,
      storageUnavailable: !isStorageAvailable(),
      manualNotice: null,
    }))
  }, [])

  // Carga inicial (una vez por `today`): siembra si procede y luego lee todo.
  const loadInitial = useCallback((day: ISODateString): void => {
    let seedNotice: DashboardNotice | null = null
    if (!seededRef.current) {
      seededRef.current = true
      seedNotice = seedIfNeeded(day)
    }

    const snapshot = readAllData()
    dataRef.current = snapshot.data
    setState((current) => ({
      ...current,
      ...snapshot.data,
      loading: false,
      corruptKeys: snapshot.corruptKeys,
      storageUnavailable: !isStorageAvailable(),
      manualNotice: seedNotice ?? current.manualNotice,
    }))
  }, [])

  useEffect(() => {
    if (today === null) {
      return
    }
    // Lectura de un sistema externo: el `setState` ocurre en el callback del microtask,
    // no de forma síncrona en el cuerpo del efecto.
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) {
        loadInitial(today)
      }
    })
    return () => {
      cancelled = true
    }
  }, [today, loadInitial])

  // Relectura en foco/visibilidad y al recibir cambios de otra pestaña (CL-21, CL-39).
  useEffect(() => {
    if (today === null) {
      return
    }

    const handleFocus = (): void => {
      reload()
    }
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        reload()
      }
    }
    // Simplificación consciente: se relee todo en lugar de solo la clave afectada.
    const unsubscribe = subscribeToStorage(() => {
      reload()
    })

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      unsubscribe()
    }
  }, [today, reload])

  // Escrituras síncronas: la reversión optimista ocurre en el mismo tick (D-P6, CL-43),
  // y el ref evita que dos clics rápidos se pisen (CL-24).
  const toggleHabit = (habitId: string, completed: boolean): boolean => {
    if (today === null) {
      return false
    }

    const previous = dataRef.current.completionLogs
    const next = upsertCompletion(previous, habitId, today, completed)
    dataRef.current = { ...dataRef.current, completionLogs: next }
    setState((current) => ({ ...current, completionLogs: next }))

    const result = setCompletionLogs(next)
    if (!result.ok) {
      dataRef.current = { ...dataRef.current, completionLogs: previous }
      setState((current) => ({
        ...current,
        completionLogs: previous,
        manualNotice: describeWriteFailure(result.reason, "COMPLETION_LOGS"),
      }))
      return false
    }

    return true
  }

  const saveSleep = (hours: number): boolean => {
    if (today === null) {
      return false
    }

    if (!isValidSleepHours(hours)) {
      setState((current) => ({
        ...current,
        manualNotice: {
          tone: "error",
          message:
            "Introduce horas de sueño entre 0.5 y 24, en pasos de 0.5.",
        },
      }))
      return false
    }

    const previous = dataRef.current.sleepLogs
    const existing = getSleepLogForDate(previous, today)
    const log: SleepLog = {
      id: existing !== null ? existing.id : createSleepLogId(today),
      date: today,
      hours,
      createdAt: existing !== null ? existing.createdAt : today,
    }
    const next = upsertSleepLog(previous, log)
    dataRef.current = { ...dataRef.current, sleepLogs: next }
    setState((current) => ({ ...current, sleepLogs: next }))

    const result = setSleepLogs(next)
    if (!result.ok) {
      dataRef.current = { ...dataRef.current, sleepLogs: previous }
      setState((current) => ({
        ...current,
        sleepLogs: previous,
        manualNotice: describeWriteFailure(result.reason, "SLEEP_LOGS"),
      }))
      return false
    }

    return true
  }

  const saveGoals = (goals: WeeklyGoals): boolean => {
    if (
      !isValidStudyGoal(goals.studyMinutesPerWeek) ||
      !isValidSleepGoal(goals.sleepHoursPerNight)
    ) {
      setState((current) => ({
        ...current,
        manualNotice: {
          tone: "error",
          message:
            "Revisa las metas: estudio entre 60 y 4200 minutos y sueño entre 0.5 y 24 h en pasos de 0.5.",
        },
      }))
      return false
    }

    const previous = dataRef.current.weeklyGoals
    const next: WeeklyGoals = {
      studyMinutesPerWeek: goals.studyMinutesPerWeek,
      sleepHoursPerNight: goals.sleepHoursPerNight,
    }
    dataRef.current = { ...dataRef.current, weeklyGoals: next }
    setState((current) => ({ ...current, weeklyGoals: next }))

    const result = setWeeklyGoals(next)
    if (!result.ok) {
      dataRef.current = { ...dataRef.current, weeklyGoals: previous }
      setState((current) => ({
        ...current,
        weeklyGoals: previous,
        manualNotice: describeWriteFailure(result.reason, "WEEKLY_GOALS"),
      }))
      return false
    }

    return true
  }

  const resetKey = (key: StorageKey): void => {
    const result = resetStoredKey(key)
    if (!result.ok) {
      setState((current) => ({
        ...current,
        manualNotice: describeWriteFailure(result.reason, key),
      }))
      return
    }

    setState((current) => ({ ...current, manualNotice: null }))
    setDismissedSignature(null)

    let seedNotice: DashboardNotice | null = null
    if (
      today !== null &&
      (key === "HABITS" || key === "CATEGORIES") &&
      getSeedState().status !== "ok"
    ) {
      seedNotice = seedIfNeeded(today)
    }

    reload()

    if (seedNotice !== null) {
      setState((current) => ({ ...current, manualNotice: seedNotice }))
    }
  }

  const issueSignature = `${state.corruptKeys.join("|")}${
    state.storageUnavailable ? "|unavailable" : ""
  }`
  const issueNotice = buildIssueNotice(
    state.corruptKeys,
    state.storageUnavailable
  )
  const notice =
    state.manualNotice ??
    (dismissedSignature === issueSignature ? null : issueNotice)

  const dismissNotice = (): void => {
    setState((current) => ({ ...current, manualNotice: null }))
    setDismissedSignature(issueSignature)
  }

  return {
    categories: state.categories,
    habits: state.habits,
    completionLogs: state.completionLogs,
    studySessions: state.studySessions,
    sleepLogs: state.sleepLogs,
    weeklyGoals: state.weeklyGoals,
    issues: {
      corruptKeys: state.corruptKeys,
      storageUnavailable: state.storageUnavailable,
      notice,
    },
    loading: state.loading,
    toggleHabit,
    saveSleep,
    saveGoals,
    resetKey,
    dismissNotice,
  }
}
