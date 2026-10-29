"use client"

import { useState } from "react"

import type { WeeklyGoals } from "@/types"
import { NumberInput } from "@/components/ui/NumberInput"
import {
  defaultWeeklyGoals,
  isValidSleepGoal,
  isValidStudyGoal,
} from "@/lib/goals"

export interface GoalsEditorProps {
  goals: WeeklyGoals
  onSave: (goals: WeeklyGoals) => boolean
}

const INVALID_STUDY_MESSAGE = "Introduce minutos enteros entre 60 y 4200."
const INVALID_SLEEP_MESSAGE =
  "Introduce un valor entre 0,5 y 24 en pasos de 0,5."
const SAVE_ERROR_MESSAGE = "No se pudo guardar. Inténtalo de nuevo."

const BUTTON_CLASSES =
  "rounded-md border border-zinc-800 px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"

export function GoalsEditor({ goals, onSave }: GoalsEditorProps) {
  // `null` = el campo sigue las metas persistidas; un borrador conserva lo tecleado.
  const [studyDraft, setStudyDraft] = useState<number | "" | null>(null)
  const [sleepDraft, setSleepDraft] = useState<number | "" | null>(null)
  const [studyError, setStudyError] = useState<string | null>(null)
  const [sleepError, setSleepError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const studyValue = studyDraft ?? goals.studyMinutesPerWeek
  const sleepValue = sleepDraft ?? goals.sleepHoursPerNight
  const isDefault =
    goals.studyMinutesPerWeek === defaultWeeklyGoals.studyMinutesPerWeek &&
    goals.sleepHoursPerNight === defaultWeeklyGoals.sleepHoursPerNight

  const handleSave = (): void => {
    setSaved(false)
    setSaveError(null)
    setStudyError(null)
    setSleepError(null)

    if (!isValidStudyGoal(studyValue)) {
      setStudyError(INVALID_STUDY_MESSAGE)
      return
    }
    if (!isValidSleepGoal(sleepValue)) {
      setSleepError(INVALID_SLEEP_MESSAGE)
      return
    }

    const ok = onSave({
      studyMinutesPerWeek: studyValue,
      sleepHoursPerNight: sleepValue,
    })
    if (!ok) {
      setSaveError(SAVE_ERROR_MESSAGE)
      return
    }

    setSaved(true)
    setStudyDraft(null)
    setSleepDraft(null)
  }

  return (
    <section className="flex flex-col gap-3 border-t border-zinc-800 pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
          Metas semanales
        </h2>
        {isDefault ? (
          <span className="text-xs text-zinc-500">Meta por defecto</span>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <NumberInput
          id="goals-study"
          label="Estudio (min/semana)"
          value={studyValue}
          onChange={(next) => {
            setStudyDraft(next)
            setStudyError(null)
            setSaveError(null)
            setSaved(false)
          }}
          min={60}
          max={4200}
          step={1}
          error={studyError}
        />
        <NumberInput
          id="goals-sleep"
          label="Sueño (h/noche)"
          value={sleepValue}
          onChange={(next) => {
            setSleepDraft(next)
            setSleepError(null)
            setSaveError(null)
            setSaved(false)
          }}
          min={0.5}
          max={24}
          step={0.5}
          suffix="h"
          error={sleepError}
        />
      </div>
      <div>
        <button type="button" onClick={handleSave} className={BUTTON_CLASSES}>
          Guardar metas
        </button>
        {saved ? (
          <p role="status" className="mt-1 text-xs text-zinc-400">
            Guardado
          </p>
        ) : null}
        {saveError !== null ? (
          <p role="alert" className="mt-1 text-xs text-zinc-300">
            {saveError}
          </p>
        ) : null}
      </div>
    </section>
  )
}
