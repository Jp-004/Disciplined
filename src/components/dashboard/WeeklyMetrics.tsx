import type { WeeklyGoals } from "@/types"
import type {
  CompletionMetricView,
  SleepMetricView,
  StudyMetricView,
} from "@/types/dashboard"
import { GoalsEditor } from "@/components/dashboard/GoalsEditor"
import { CompletionMetric } from "@/components/dashboard/metrics/CompletionMetric"
import { SleepMetric } from "@/components/dashboard/metrics/SleepMetric"
import { StudyMetric } from "@/components/dashboard/metrics/StudyMetric"

export interface WeeklyMetricsProps {
  completion: CompletionMetricView
  study: StudyMetricView
  sleep: SleepMetricView
  goals: WeeklyGoals
  todaySleepHours: number | null
  onSaveSleep: (hours: number) => boolean
  onSaveGoals: (goals: WeeklyGoals) => boolean
}

export function WeeklyMetrics({
  completion,
  study,
  sleep,
  goals,
  todaySleepHours,
  onSaveSleep,
  onSaveGoals,
}: WeeklyMetricsProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
        Métricas de la semana
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <CompletionMetric view={completion} />
        <StudyMetric view={study} />
        <SleepMetric
          view={sleep}
          todayValue={todaySleepHours}
          onSave={onSaveSleep}
        />
      </div>
      <GoalsEditor goals={goals} onSave={onSaveGoals} />
    </section>
  )
}
