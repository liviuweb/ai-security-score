// Reine Datenquelle, keine Berechnung. Ordnet Nutzer:innen echte Modellnamen den drei
// Größenklassen (klein/mittel/groß) zu, die auch score.ts/scenarios.ts verwenden.
//
// Wichtig: Die konkreten Beispielnamen (z.B. "GPT-5 mini", "Claude Opus 4.8") veralten
// schnell — Anbieter benennen und ersetzen Modelle laufend. Stabil bleiben nur die
// Namensmuster (mini/flash/lite/nano/haiku = klein, sonnet/"pro (Standard)" = mittel,
// opus/Flaggschiff = groß). MODEL_GUIDE_STAND macht sichtbar, wie aktuell die Beispiele
// sind, damit das beim Pflegen nicht in Vergessenheit gerät.
export const MODEL_GUIDE_STAND = 'Juli 2026'

export interface ModelExample {
  name: string
  family: string
}

export interface ModelClassInfo {
  klasse: 'klein' | 'mittel' | 'gross'
  label: string
  kurz: string
  muster: string[]
  wofuer: string
  beispiele: ModelExample[]
}

export const MODEL_GUIDE: ModelClassInfo[] = [
  {
    klasse: 'klein',
    label: 'Klein',
    kurz: 'Die schnellen, günstigen Varianten — sparsam, für einfache Fragen völlig ausreichend.',
    muster: ['mini', 'flash', 'lite', 'nano', 'haiku'],
    wofuer: 'Kurze Fragen, Fakten, einfache Texte.',
    beispiele: [
      { name: 'GPT-5 mini', family: 'OpenAI' },
      { name: 'Gemini 3 Flash', family: 'Google' },
      { name: 'Claude Haiku', family: 'Anthropic' },
    ],
  },
  {
    klasse: 'mittel',
    label: 'Mittel',
    kurz: 'Die ausgewogenen Standard-Modelle — oft das, was voreingestellt ist.',
    muster: ['sonnet', 'pro (Standard)'],
    wofuer: 'Der Allrounder für die meisten Aufgaben.',
    beispiele: [
      { name: 'Claude Sonnet', family: 'Anthropic' },
      { name: 'GPT-5.5', family: 'OpenAI, ChatGPT-Standard' },
      { name: 'Gemini 3 Pro', family: 'Google' },
    ],
  },
  {
    klasse: 'gross',
    label: 'Groß',
    kurz: 'Die Flaggschiffe — maximale Leistung, höchster Verbrauch.',
    muster: ['opus', 'Flaggschiff', 'neueste Nummer'],
    wofuer: 'Komplexe Analysen, anspruchsvoller Code — Verschwendung für Simples.',
    beispiele: [
      { name: 'Claude Opus 4.8', family: 'Anthropic' },
      { name: 'GPT-5.6', family: 'OpenAI' },
      { name: 'Gemini 3.1 Pro', family: 'Google' },
    ],
  },
]
