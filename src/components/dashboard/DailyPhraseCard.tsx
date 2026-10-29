import type { MotivationalPhrase } from "@/types"

export interface DailyPhraseCardProps {
  phrase: MotivationalPhrase
}

export function DailyPhraseCard({ phrase }: DailyPhraseCardProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5">
      <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">
        Frase del día
      </h2>
      <p className="mt-2 text-sm text-zinc-100">{phrase.text}</p>
    </section>
  )
}
