import type { TimeOfDay } from "@/types/domain"
import type { NextActionView } from "@/types/dashboard"
import { EmptyState } from "@/components/ui/EmptyState"
import { formatTimeOfDay } from "@/lib/time"

export interface NextActionCardProps {
  action: NextActionView | null
  now: TimeOfDay
  onToggle: (habitId: string, completed: boolean) => void
}

const CARD_CLASSES =
  "rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5"

const CHECKBOX_CLASSES =
  "mt-0.5 h-4 w-4 shrink-0 accent-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"

export function NextActionCard({ action, now, onToggle }: NextActionCardProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
        Próxima acción
      </h2>
      {action === null ? (
        <EmptyState
          title="Sin acciones programadas pendientes para hoy."
          hint="Programa un hábito para hoy y aparecerá aquí."
        />
      ) : (
        <div className={CARD_CLASSES}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <input
                id={`next-action-${action.habitId}`}
                type="checkbox"
                checked={false}
                onChange={() => onToggle(action.habitId, true)}
                className={CHECKBOX_CLASSES}
              />
              <div className="min-w-0">
                <label
                  htmlFor={`next-action-${action.habitId}`}
                  className="block text-sm text-zinc-100"
                >
                  {action.title}
                </label>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span className="font-mono tabular-nums">
                    {formatTimeOfDay(action.startTime)}
                  </span>
                  {action.categoryName !== null ? (
                    <span>{action.categoryName}</span>
                  ) : null}
                  {action.status === "overdue" ? (
                    <span className="text-zinc-300">Atrasado</span>
                  ) : null}
                </p>
              </div>
            </div>
            <p className="shrink-0 font-mono text-xs tabular-nums text-zinc-500">
              Ahora {formatTimeOfDay(now)}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
