"use client"

import { useEffect, useState } from "react"

import type { ISODateString, TimeOfDay } from "@/types/domain"
import { toLocalISODate } from "@/lib/date"

export interface TodayState {
  today: ISODateString
  now: TimeOfDay
}

const TICK_MS = 60_000

function readTodayState(): TodayState {
  const current = new Date()
  const hours = String(current.getHours()).padStart(2, "0")
  const minutes = String(current.getMinutes()).padStart(2, "0")
  return {
    today: toLocalISODate(current),
    now: `${hours}:${minutes}`,
  }
}

// Único reloj de la aplicación (RF-12): `null` antes de montar para no romper SSR,
// recálculo cada 60 s con pestaña visible y refresco inmediato en foco/visibilidad.
export function useToday(): TodayState | null {
  const [state, setState] = useState<TodayState | null>(null)

  useEffect(() => {
    const update = (): void => {
      const next = readTodayState()
      setState((previous) => {
        if (
          previous !== null &&
          previous.today === next.today &&
          previous.now === next.now
        ) {
          return previous
        }
        return next
      })
    }

    update()

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        update()
      }
    }, TICK_MS)

    const handleFocus = (): void => {
      update()
    }

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        update()
      }
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return state
}
