export function Startscreen({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-2xl p-8 max-w-md w-full shadow-2xl transform scale-95 animate-in fade-in-0">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">Bienvenido a Disciplined</h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">Tu tracker de habitos semanales. Lleva el control de tus rutinas y mantiene la constancia.</p>
        <button onClick={() => onDismiss()} className="w-full py-3 px-4 rounded-lg bg-zinc-600 text-white font-medium hover:bg-zinc-500 transition-colors">
          Empezar
        </button>
      </div>
    </div>
  )
}