import type { ReactNode } from "react"

export interface MetricCardProps {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}

const CARD_CLASSES =
  "rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5"

export function MetricCard({
  label,
  hint,
  children,
  className,
}: MetricCardProps) {
  return (
    <div className={className ? `${CARD_CLASSES} ${className}` : CARD_CLASSES}>
      <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
        {label}
      </h3>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
      <div className="mt-3">{children}</div>
    </div>
  )
}
