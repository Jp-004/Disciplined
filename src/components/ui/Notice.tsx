"use client"

import type { ReactNode } from "react"

export interface NoticeProps {
  tone: "info" | "error"
  children: ReactNode
  actionLabel?: string
  onAction?: () => void
  onDismiss?: () => void
}

const INFO_CLASSES =
  "rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300"

const ERROR_CLASSES =
  "rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"

const BUTTON_CLASSES =
  "rounded-md border border-zinc-800 px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"

export function Notice({
  tone,
  children,
  actionLabel,
  onAction,
  onDismiss,
}: NoticeProps) {
  const toneClasses = tone === "info" ? INFO_CLASSES : ERROR_CLASSES

  return (
    <div
      role={tone === "info" ? "status" : "alert"}
      className={`flex items-start justify-between gap-3 ${toneClasses}`}
    >
      <div className="min-w-0">{children}</div>
      <div className="flex shrink-0 items-center gap-2">
        {actionLabel && onAction ? (
          <button type="button" onClick={onAction} className={BUTTON_CLASSES}>
            {actionLabel}
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Cerrar aviso"
            className={BUTTON_CLASSES}
          >
            Cerrar
          </button>
        ) : null}
      </div>
    </div>
  )
}
