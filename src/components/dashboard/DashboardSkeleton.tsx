const CONTAINER_CLASSES =
  "mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-8"

const BLOCK_CLASSES = "rounded bg-zinc-800/60"

export function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className={CONTAINER_CLASSES}>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className={`${BLOCK_CLASSES} h-7 w-40`} />
          <div className="flex flex-wrap gap-2">
            <div className={`${BLOCK_CLASSES} h-6 w-24`} />
            <div className={`${BLOCK_CLASSES} h-6 w-20`} />
            <div className={`${BLOCK_CLASSES} h-6 w-20`} />
            <div className={`${BLOCK_CLASSES} h-6 w-24`} />
          </div>
        </div>
        <div className={`${BLOCK_CLASSES} h-20`} />
        <div className={`${BLOCK_CLASSES} h-24`} />
        <div className="grid gap-4 md:grid-cols-3">
          <div className={`${BLOCK_CLASSES} h-40`} />
          <div className={`${BLOCK_CLASSES} h-40`} />
          <div className={`${BLOCK_CLASSES} h-40`} />
        </div>
        <div className={`${BLOCK_CLASSES} h-48`} />
        <p className="sr-only">Cargando…</p>
      </div>
    </main>
  )
}
