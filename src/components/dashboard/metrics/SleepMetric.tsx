"use client"

import { useState } from "react"

import type { SleepMetricView } from "@/types/dashboard"
import { EmptyState } from "@/components/ui/EmptyState"
import { MetricCard } from "@/components/ui/MetricCard"
import { NumberInput } from "@/components/ui/NumberInput"
import { formatGoalHours, formatHours } from "@/lib/numbers"
import { isValidSleepHours } from "@/lib/sleep"

export interface SleepMetricProps {
  view: SleepMetricView
  todayValue: number | null
  onSave: (hours: number) => boolean
}

const MIN_HOURS = 0.5
const MAX_HOURS = 24
const STEP_HOURS = 0.5

const INVALID_MESSAGE = "Introduce un valor entre 0,5 y 24 en pasos de 0,5."
const SAVE_ERROR_MESSAGE = "No se pudo guardar. Inténtalo de nuevo."

const BUTTON_CLASSES =
  "rounded-md border border-zinc-800 px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"

export function SleepMetric({ view, todayValue, onSave }: SleepMetricProps) {
  // `null` = el campo sigue el valor persistido; un borrador conserva lo tecleado.
  const [draft, setDraft] = useState<number | "" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const value = draft ?? todayValue ?? ""

  const handleSave = (): void => {
    if (value === "" || !isValidSleepHours(value)) {
      setError(INVALID_MESSAGE)
      setSaved(false)
      return
    }

    const ok = onSave(value)
    if (ok) {
      setError(null)
      setSaved(true)
      setDraft(null)
      return
    }

    setSaved(false)
    setError(SAVE_ERROR_MESSAGE)
  }

  return (
    <MetricCard label="Sueño">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-zinc-400">Promedio semanal</span>
        <span className="font-mono tabular-nums text-2xl font-semibold text-zinc-100">
          {view.averageHours === null ? "—" : formatHours(view.averageHours)}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="text-xs text-zinc-400">Meta</span>
        <span className="font-mono tabular-nums text-zinc-100">
          {formatGoalHours(view.goalHours)}
        </span>
      </div>
      {view.meetsGoal === null ? null : (
        <p
          className={
            view.meetsGoal
              ? "mt-1 text-xs text-emerald-500"
              : "mt-1 text-xs text-zinc-400"
          }
        >
          {view.meetsGoal ? "Meta alcanzada" : "Bajo la meta"}
        </p>
      )}
      {view.excludedCount > 0 ? (
        <p className="mt-1 text-xs text-zinc-500">
          {view.excludedCount === 1
            ? "1 registro descartado"
            : `${view.excludedCount} registros descartados`}
        </p>
      ) : null}
      {view.averageHours === null ? (
        <div className="mt-2">
          <EmptyState
            title="Sin registros de sueño esta semana."
            hint="Registra la primera noche."
          />
        </div>
      ) : null}
      <div className="mt-3">
        <NumberInput
          id="sleep-hours"
          label="Horas de anoche"
          value={value}
          onChange={(next) => {
            setDraft(next)
            setError(null)
            setSaved(false)
          }}
          min={MIN_HOURS}
          max={MAX_HOURS}
          step={STEP_HOURS}
          suffix="h"
          error={error}
        />
        <button
          type="button"
          onClick={handleSave}
          className={`mt-2 ${BUTTON_CLASSES}`}
        >
          Guardar
        </button>
        {saved ? (
          <p role="status" className="mt-1 text-xs text-zinc-400">
            Guardado
          </p>
        ) : null}
      </div>
    </MetricCard>
  )
}
