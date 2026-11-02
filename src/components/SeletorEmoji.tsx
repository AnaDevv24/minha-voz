import { cn } from '../lib/utils'

// Biblioteca básica de pictogramas (emojis). O mediador também pode enviar uma foto/imagem.
export const EMOJIS: Record<string, string[]> = {
  Alimentos: ['💧', '🍽️', '🥪', '🍎', '🥛', '🍞', '🧃', '🍌', '🍛', '🍪', '🍦', '🍰', '🍕', '🍇', '🥕', '🍓', '🥚', '🍗', '🍝', '🍿', '🍫', '☕', '🍉', '🧀'],
  Rostos: ['😊', '😢', '😠', '😨', '😴', '🤕', '🤩', '😌', '😂', '😐', '🤢', '🥱', '😍', '😳', '🤒', '🥰'],
  Pessoas: ['👩', '👨', '👵', '👴', '👩‍🏫', '🧒', '👦', '👧', '👶', '🧑‍⚕️', '👫', '👪', '🧑‍🦽', '🐶', '🐱'],
  Ações: ['🏃', '🧸', '📖', '🖍️', '📺', '🤸', '🎤', '🛁', '🚶', '🙋', '👋', '🤗', '👏', '🙌', '✍️', '🎮', '⚽', '🚲', '🏊', '💤'],
  Objetos: ['⚽', '🪆', '🚗', '📱', '📚', '✏️', '🎒', '🥤', '👕', '👟', '🎨', '🎵', '👓', '🧩', '🪥', '🧴', '🛏️', '💊', '🎁', '🎈'],
  Lugares: ['🏠', '🏫', '🛝', '🛏️', '🛒', '🏥', '🏖️', '🚽', '🌳', '⛪', '🏪', '🚌', '🚗', '🏞️'],
  Comandos: ['✋', '🙅', '🙏', '👍', '👎', '➕', '✅', '⏳', '❌', '⭐', '❤️', '❓', '🔁', '🛑', '⏰', '📅', '🌙', '☀️', '📝'],
}

export function SeletorEmoji({ valor, aoEscolher }: { valor: string; aoEscolher: (e: string) => void }) {
  return (
    <div className="max-h-56 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 p-3">
      {Object.entries(EMOJIS).map(([grupo, lista]) => (
        <div key={grupo}>
          <div className="mb-1 text-xs font-bold text-slate-500">{grupo}</div>
          <div className="grid grid-cols-8 gap-1">
            {lista.map((e, i) => (
              <button
                key={grupo + i}
                type="button"
                onClick={() => aoEscolher(e)}
                className={cn('pictograma rounded-lg p-1 text-2xl hover:bg-primaria-50', valor === e && 'bg-primaria-100 ring-2 ring-primaria-500')}
                aria-label={`Usar ${e}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
