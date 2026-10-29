export interface ProgressBarProps {
  percent: number
  label: string
}

export function ProgressBar({ percent, label }: ProgressBarProps) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className="h-full rounded-full bg-emerald-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
