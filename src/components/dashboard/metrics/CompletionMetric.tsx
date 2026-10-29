import type { CompletionMetricView } from "@/types/dashboard"
import { EmptyState } from "@/components/ui/EmptyState"
import { MetricCard } from "@/components/ui/MetricCard"
import { formatPercent } from "@/lib/numbers"

export interface CompletionMetricProps {
  view: CompletionMetricView
}

export function CompletionMetric({ view }: CompletionMetricProps) {
  const hasToday = view.todayPercent !== null

  return (
    <MetricCard label="Cumplimiento">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-zinc-400">Hoy</span>
        <span
          className={
            hasToday
              ? "font-mono tabular-nums text-2xl font-semibold text-emerald-500"
              : "font-mono tabular-nums text-2xl font-semibold text-zinc-400"
          }
        >
          {view.todayPercent === null ? "—" : formatPercent(view.todayPercent)}
        </span>
      </div>
      {hasToday ? null : (
        <div className="mt-2">
          <EmptyState
            title="Sin hábitos para hoy."
            hint="Añade un hábito para empezar."
          />
        </div>
      )}
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className="text-xs text-zinc-400">Promedio semanal</span>
        <span className="font-mono tabular-nums text-zinc-100">
          {view.weekAverage === null ? "—" : formatPercent(view.weekAverage)}
        </span>
      </div>
    </MetricCard>
  )
}
