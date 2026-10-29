// Frase diaria determinista: sin estado, sin almacenamiento, sin reloj.

import type { ISODateString } from "@/types/domain"
import type { MotivationalPhrase } from "@/types/motivational"
import { getDayOfYear } from "@/lib/date"

export const dailyPhrases: MotivationalPhrase[] = [
  {
    id: "phrase-01",
    text: "La disciplina es elegir lo que quieres ser por encima de lo que quieres ahora.",
  },
  {
    id: "phrase-02",
    text: "La constancia convierte una decisión pequeña en un resultado que se nota.",
  },
  {
    id: "phrase-03",
    text: "No necesitas motivación para empezar; necesitas empezar para encontrarla.",
  },
  {
    id: "phrase-04",
    text: "Un día imperfecto hecho vale más que un día perfecto imaginado.",
  },
  {
    id: "phrase-05",
    text: "Avanzar despacio sigue siendo avanzar; quedarse quieto no.",
  },
  {
    id: "phrase-06",
    text: "Los hábitos pequeños sostienen los cambios grandes.",
  },
  {
    id: "phrase-07",
    text: "Haz lo que toca hoy y deja que la semana haga su trabajo.",
  },
  {
    id: "phrase-08",
    text: "La disciplina no es un castigo: es la forma de cuidar lo que te importa.",
  },
  {
    id: "phrase-09",
    text: "Cuando cuesta, baja el ritmo, no el rumbo.",
  },
  {
    id: "phrase-10",
    text: "Cada casilla marcada es una promesa que te cumples.",
  },
  {
    id: "phrase-11",
    text: "El progreso se mide en repeticiones, no en intenciones.",
  },
  {
    id: "phrase-12",
    text: "Ordenar el día es la mitad de cumplirlo.",
  },
  {
    id: "phrase-13",
    text: "La constancia es la suma de días normales bien aprovechados.",
  },
  {
    id: "phrase-14",
    text: "Empieza por lo importante, aunque no sea lo urgente.",
  },
  {
    id: "phrase-15",
    text: "Descansar también forma parte del plan.",
  },
  {
    id: "phrase-16",
    text: "Lo que repites cada semana termina definiendo tu mes.",
  },
]

export function getDailyPhrase(today: ISODateString): MotivationalPhrase {
  const index = getDayOfYear(today) % dailyPhrases.length
  return dailyPhrases[index]
}
