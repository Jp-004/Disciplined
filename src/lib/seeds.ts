// Datos semilla de primera visita y plan de siembra (puro).

import type { Category, Habit, ISODateString } from "@/types/domain"
import type { SeedState, StorageReadStatus } from "@/types/storage"

export const seedCategories: Category[] = [
  { id: "training", name: "Entrenamiento", slug: "training", color: "sky", isSeed: true },
  { id: "study", name: "Estudio", slug: "study", color: "amber", isSeed: true },
  { id: "work", name: "Trabajo", slug: "work", color: "violet", isSeed: true },
  { id: "personal", name: "Personal", slug: "personal", color: "zinc", isSeed: true },
  { id: "rest", name: "Descanso", slug: "rest", color: "rose", isSeed: true },
]

export function createSeedHabits(today: ISODateString): Habit[] {
  return [
    {
      id: "seed-training",
      title: "Entrenamiento de fuerza",
      categoryId: "training",
      targetDays: [1, 3, 5],
      createdAt: today,
      active: true,
      startTime: "07:30",
      priority: true,
      isSeed: true,
    },
    {
      id: "seed-study",
      title: "Sesión de estudio",
      categoryId: "study",
      targetDays: [1, 2, 3, 4, 5],
      createdAt: today,
      active: true,
      startTime: "18:00",
      priority: true,
      isSeed: true,
    },
    {
      id: "seed-reading",
      title: "Lectura de 20 minutos",
      categoryId: "personal",
      targetDays: [1, 2, 3, 4, 5, 6, 7],
      createdAt: today,
      active: true,
      startTime: "21:30",
      priority: false,
      isSeed: true,
    },
    {
      id: "seed-weekly-review",
      title: "Revisión semanal",
      categoryId: "work",
      targetDays: [7],
      createdAt: today,
      active: true,
      startTime: "19:00",
      priority: true,
      isSeed: true,
    },
  ]
}

export function buildSeedState(today: ISODateString): SeedState {
  return { seededAt: today, version: 1 }
}

export interface SeedPlanInput {
  hasSeedState: boolean
  categoriesStatus: StorageReadStatus
  habitsStatus: StorageReadStatus
}

export interface SeedPlan {
  writeCategories: boolean
  writeHabits: boolean
  writeSeedState: boolean
}

export function resolveSeedPlan(input: SeedPlanInput): SeedPlan {
  if (input.hasSeedState) {
    return { writeCategories: false, writeHabits: false, writeSeedState: false }
  }

  if (input.categoriesStatus === "corrupt" || input.habitsStatus === "corrupt") {
    return { writeCategories: false, writeHabits: false, writeSeedState: false }
  }

  return {
    writeCategories: input.categoriesStatus === "empty",
    writeHabits: input.habitsStatus === "empty",
    writeSeedState: true,
  }
}
