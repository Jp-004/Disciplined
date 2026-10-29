export interface EmptyStateProps {
  title: string
  hint?: string
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div>
      <p className="text-sm text-zinc-400">{title}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  )
}
