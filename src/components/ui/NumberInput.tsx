"use client"

export interface NumberInputProps {
  id: string
  label: string
  value: number | ""
  onChange: (value: number | "") => void
  min: number
  max: number
  step: number
  suffix?: string
  error?: string | null
  disabled?: boolean
}

const INPUT_CLASSES =
  "w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono tabular-nums text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"

function parseInputValue(raw: string): number | "" {
  const trimmed = raw.trim()
  if (trimmed === "") {
    return ""
  }
  const parsed = Number(trimmed.replace(",", "."))
  if (!Number.isFinite(parsed)) {
    return ""
  }
  return parsed
}

export function NumberInput({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  error,
  disabled,
}: NumberInputProps) {
  const errorId = `${id}-error`
  const hasError = typeof error === "string" && error.length > 0

  return (
    <div>
      <label
        htmlFor={id}
        className="text-xs font-mono uppercase tracking-wider text-zinc-400"
      >
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError ? errorId : undefined}
          onChange={(event) => {
            onChange(parseInputValue(event.target.value))
          }}
          className={INPUT_CLASSES}
        />
        {suffix ? (
          <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
            {suffix}
          </span>
        ) : null}
      </div>
      {hasError ? (
        <p id={errorId} className="mt-1 text-xs text-zinc-300">
          {error}
        </p>
      ) : null}
    </div>
  )
}
