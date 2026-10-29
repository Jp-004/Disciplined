"use client"

import { useEffect, useState } from "react"

import { useDashboardData } from "@/hooks/useDashboardData"
import { useMounted } from "@/hooks/useMounted"
import { useToday } from "@/hooks/useToday"
import { buildDashboardViewModel } from "@/lib/dashboard"
import {
  getStartupState,
  isStorageAvailable,
  setStartupState,
} from "@/lib/persistence"
import { DailyPhraseCard } from "@/components/dashboard/DailyPhraseCard"
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton"
import { NextActionCard } from "@/components/dashboard/NextActionCard"
import { QuickChecklist } from "@/components/dashboard/QuickChecklist"
import { WeeklyHeader } from "@/components/dashboard/WeeklyHeader"
import { WeeklyMetrics } from "@/components/dashboard/WeeklyMetrics"
import { Notice } from "@/components/ui/Notice"
import { Startscreen } from "@/components/ui/Startscreen"

export default function Home() {
  const mounted = useMounted()
  const todayState = useToday()
  const data = useDashboardData(todayState?.today ?? null)
  const [showStartup, setShowStartup] = useState(false)

  // Lectura de `STARTUP_SHOWN` tras montar (nunca en render) para no romper la hidratación.
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (!isStorageAvailable()) {
        return
      }
      const startup = getStartupState()
      if (startup.status === "empty" || !startup.data.hasSeenStartup) {
        setShowStartup(true)
      }
    })
  }, [])

  const handleDismissStartup = (): void => {
    setStartupState({ hasSeenStartup: true })
    setShowStartup(false)
  }

  if (!mounted || todayState === null || data.loading) {
    return <DashboardSkeleton />
  }

  const viewModel = buildDashboardViewModel({
    today: todayState.today,
    now: todayState.now,
    categories: data.categories,
    habits: data.habits,
    completionLogs: data.completionLogs,
    studySessions: data.studySessions,
    sleepLogs: data.sleepLogs,
    weeklyGoals: data.weeklyGoals,
  })

  const notice = data.issues.notice
  const resetKey = notice?.resetKey

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-8">
        <WeeklyHeader weekLabel={viewModel.weekLabel} />
        <DailyPhraseCard phrase={viewModel.phrase} />
        <NextActionCard
          action={viewModel.nextAction}
          now={todayState.now}
          onToggle={data.toggleHabit}
        />
        <WeeklyMetrics
          completion={viewModel.completion}
          study={viewModel.study}
          sleep={viewModel.sleep}
          goals={data.weeklyGoals}
          todaySleepHours={viewModel.todaySleepHours}
          onSaveSleep={data.saveSleep}
          onSaveGoals={data.saveGoals}
        />
        <QuickChecklist
          items={viewModel.checklist}
          completedCount={viewModel.checklistCompleted}
          totalCount={viewModel.checklistTotal}
          onToggle={data.toggleHabit}
        />
        {notice !== null ? (
          <Notice
            tone={notice.tone}
            actionLabel={resetKey !== undefined ? "Restablecer" : undefined}
            onAction={
              resetKey !== undefined
                ? () => data.resetKey(resetKey)
                : undefined
            }
            onDismiss={data.dismissNotice}
          >
            {notice.message}
          </Notice>
        ) : null}
      </div>
      {showStartup ? <Startscreen onDismiss={handleDismissStartup} /> : null}
    </main>
  )
}
