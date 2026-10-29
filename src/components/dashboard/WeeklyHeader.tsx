import Link from "next/link"

export interface WeeklyHeaderProps {
  weekLabel: string
}

const NAV_LINK_CLASSES =
  "rounded-md border border-zinc-800 px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"

const NAV_LINKS = [
  { href: "/gym", label: "Entrenamiento", ariaLabel: "Ir a entrenamiento" },
  { href: "/study", label: "Estudio", ariaLabel: "Ir a estudio" },
  { href: "/tasks", label: "Tareas", ariaLabel: "Ir a tareas" },
  { href: "/calendar", label: "Calendario", ariaLabel: "Ir a calendario" },
] as const

export function WeeklyHeader({ weekLabel }: WeeklyHeaderProps) {
  return (
    <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
          Disciplined
        </h1>
        <p className="font-mono text-sm tabular-nums text-zinc-400">
          {weekLabel}
        </p>
      </div>
      <nav aria-label="Secciones" className="flex flex-wrap gap-2">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-label={link.ariaLabel}
            prefetch={false}
            className={NAV_LINK_CLASSES}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
