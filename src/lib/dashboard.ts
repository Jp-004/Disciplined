// Composición pura del modelo de vista: único agregador de métricas (RF-10).
// No conoce React, LocalStorage ni el reloj: recibe `today`/`now` del llamador.

import type {
  Category,
  CompletionLog,
  Habit,
  ISODateString,
  SleepLog,
  StudySession,
  TimeOfDay,
  WeeklyGoals,
} from "@/types/domain"
import type {
  ChecklistItemView,
  CompletionMetricView,
  DashboardViewModel,
  NextActionView,
  SleepMetricView,
  StudyMetricView,
} from "@/types/dashboard"
import { formatWeekLabel, getWeekRange } from "@/lib/date"
import { getDailyPhrase } from "@/lib/phrases"
import {
  buildCompletionIndex,
  getChecklistHabits,
  getDailyCompletionRate,
  getHabitsForDate,
  getNextAction,
  getWeeklyCompletionAverage,
  isCompletedInIndex,
} from "@/lib/habits"
import { getGoalProgress, getWeeklyStudyMinutes } from "@/lib/study"
import {
  getSleepLogForDate,
  getWeeklySleepAverage,
  isValidSleepHours,
} from "@/lib/sleep"
import { isValidTimeOfDay } from "@/lib/time"

export interface DashboardViewModelInput {
  today: ISODateString
  now: TimeOfDay
  categories: Category[]
  habits: Habit[]
  completionLogs: CompletionLog[]
  studySessions: StudySession[]
  sleepLogs: SleepLog[]
  weeklyGoals: WeeklyGoals
}

function buildCategoryNames(categories: Category[]): Map<string, string> {
  const names = new Map<string, string>()
  for (const category of categories) {
    names.set(category.id, category.name)
  }
  return names
}

function resolveCategoryName(
  names: Map<string, string>,
  categoryId: string
): string | null {
  return names.get(categoryId) ?? null
}

export function buildDashboardViewModel(
  input: DashboardViewModelInput
): DashboardViewModel {
  const {
    today,
    now,
    categories,
    habits,
    completionLogs,
    studySessions,
    sleepLogs,
    weeklyGoals,
  } = input
  const categoryNames = buildCategoryNames(categories)

  const nextActionSource = getNextAction(habits, completionLogs, today, now)
  let nextAction: NextActionView | null = null
  if (
    nextActionSource !== null &&
    isValidTimeOfDay(nextActionSource.habit.startTime)
  ) {
    nextAction = {
      habitId: nextActionSource.habit.id,
      title: nextActionSource.habit.title,
      startTime: nextActionSource.habit.startTime,
      categoryName: resolveCategoryName(
        categoryNames,
        nextActionSource.habit.categoryId
      ),
      status: nextActionSource.status,
    }
  }

  const completion: CompletionMetricView = {
    todayPercent: getDailyCompletionRate(habits, completionLogs, today),
    weekAverage: getWeeklyCompletionAverage(habits, completionLogs, today),
    hasHabitsToday: getHabitsForDate(habits, today).length > 0,
  }

  const totalMinutes = getWeeklyStudyMinutes(studySessions, today)
  const goalMinutes = weeklyGoals.studyMinutesPerWeek
  const studyProgress = getGoalProgress(totalMinutes, goalMinutes)
  const study: StudyMetricView = {
    totalMinutes,
    goalMinutes,
    percent: studyProgress.percent,
    cappedPercent: studyProgress.cappedPercent,
    hasSessions: totalMinutes > 0,
  }

  const sleepAverage = getWeeklySleepAverage(sleepLogs, today)
  const goalHours = weeklyGoals.sleepHoursPerNight
  const sleep: SleepMetricView = {
    averageHours: sleepAverage.average,
    goalHours,
    excludedCount: sleepAverage.excludedCount,
    meetsGoal:
      sleepAverage.average === null
        ? null
        : sleepAverage.average >= goalHours,
  }

  const completionIndex = buildCompletionIndex(completionLogs)
  const checklist: ChecklistItemView[] = getChecklistHabits(habits, today).map(
    (habit) => ({
      habitId: habit.id,
      title: habit.title,
      startTime: isValidTimeOfDay(habit.startTime) ? habit.startTime : null,
      completed: isCompletedInIndex(completionIndex, habit.id, today),
      isSeed: habit.isSeed === true,
      categoryName: resolveCategoryName(categoryNames, habit.categoryId),
    })
  )

  const todayLog = getSleepLogForDate(sleepLogs, today)
  const todaySleepHours =
    todayLog !== null && isValidSleepHours(todayLog.hours)
      ? todayLog.hours
      : null

  return {
    weekLabel: formatWeekLabel(getWeekRange(today)),
    phrase: getDailyPhrase(today),
    nextAction,
    completion,
    study,
    sleep,
    checklist,
    checklistCompleted: checklist.filter((item) => item.completed).length,
    checklistTotal: checklist.length,
    todaySleepHours,
  }
}
