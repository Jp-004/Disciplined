import type { StudyMetricView } from "@/types/dashboard"
import { MetricCard } from "@/components/ui/MetricCard"
import { ProgressBar } from "@/components/ui/ProgressBar"
import {
  formatGoalHours,
  formatMinutesAsHours,
  formatPercent,
} from "@/lib/numbers"

export interface StudyMetricProps {
  view: StudyMetricView
}

export function StudyMetric({ view }: StudyMetricProps) {
  return (
    <MetricCard label="Estudio">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <span className="text-xs text-zinc-400">Total semanal</span>
        <span className="font-mono tabular-nums text-2xl font-semibold text-emerald-500">
          {formatMinutesAsHours(view.totalMinutes)}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="text-xs text-zinc-400">Meta</span>
        <span className="font-mono tabular-nums text-zinc-100">
          {formatGoalHours(view.goalMinutes / 60)}
        </span>
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <ProgressBar
            percent={view.cappedPercent}
            label="Progreso de estudio semanal"
          />
        </div>
        <span className="shrink-0 font-mono tabular-nums text-xs text-zinc-300">
          {formatPercent(view.percent)}
        </span>
      </div>
    </MetricCard>
  )
}
