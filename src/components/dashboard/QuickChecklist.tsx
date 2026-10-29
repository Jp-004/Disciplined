import type { ChecklistItemView } from "@/types/dashboard"
import { EmptyState } from "@/components/ui/EmptyState"
import { formatTimeOfDay } from "@/lib/time"

export interface QuickChecklistProps {
  items: ChecklistItemView[]
  completedCount: number
  totalCount: number
  onToggle: (habitId: string, completed: boolean) => void
}

const CHECKBOX_CLASSES =
  "mt-0.5 h-4 w-4 shrink-0 accent-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"

const SEED_CHIP_CLASSES =
  "rounded border border-zinc-700 px-1.5 py-0.5 text-xs font-mono uppercase tracking-wider text-zinc-400"

export function QuickChecklist({
  items,
  completedCount,
  totalCount,
  onToggle,
}: QuickChecklistProps) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
          Checklist de hoy
        </h2>
        <span className="font-mono tabular-nums text-xs text-zinc-400">
          {completedCount} / {totalCount}
        </span>
      </div>
      {items.length === 0 ? (
        <EmptyState
          title="No tienes hábitos para hoy"
          hint="Añade un hábito o revisa sus días activos."
        />
      ) : (
        <ul className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5">
          {items.map((item) => {
            const inputId = `habit-${item.habitId}`
            return (
              <li key={item.habitId} className="flex items-start gap-3">
                <input
                  id={inputId}
                  type="checkbox"
                  checked={item.completed}
                  onChange={(event) =>
                    onToggle(item.habitId, event.target.checked)
                  }
                  className={CHECKBOX_CLASSES}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      htmlFor={inputId}
                      className={
                        item.completed
                          ? "text-sm text-zinc-500 line-through"
                          : "text-sm text-zinc-100"
                      }
                    >
                      {item.title}
                    </label>
                    {item.isSeed ? (
                      <span className={SEED_CHIP_CLASSES}>ejemplo</span>
                    ) : null}
                  </div>
                  {item.startTime !== null || item.categoryName !== null ? (
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      {item.startTime !== null ? (
                        <span className="font-mono tabular-nums">
                          {formatTimeOfDay(item.startTime)}
                        </span>
                      ) : null}
                      {item.categoryName !== null ? (
                        <span>{item.categoryName}</span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
