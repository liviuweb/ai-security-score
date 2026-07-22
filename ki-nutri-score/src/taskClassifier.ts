export type TaskType = 'trivial' | 'fakten' | 'kreativ' | 'analyse' | 'code' | 'generierung';

export interface PromptClassification {
  type: TaskType;
  reason: string[];
}

// Ordered from most specific to most generic to reduce false positives.
// "schreibe" alone is gone (too ambiguous) — code/kreativ have explicit phrases.
// "was ist" alone is gone — moved to fakten with other fact-query patterns.
const keywordMap: Record<TaskType, string[]> = {
  trivial: [
    'wie spät', 'wieviel uhr', 'wie heißt du', 'wie alt ist', 'wo liegt',
    'wer hat erfunden', 'was ist die hauptstadt', 'wie hoch ist die temperatur',
  ],
  fakten: [
    'fasse zusammen', 'zusammenfassen', 'übersicht', 'erkläre kurz', 'kurz erklären',
    'definition', 'was ist', 'was sind', 'grundlagen', 'unterschied zwischen',
    'was bedeutet', 'was heißt',
  ],
  kreativ: [
    'gedicht', 'poem', 'story', 'kurzgeschichte', 'schreibe ein gedicht',
    'schreibe eine geschichte', 'schreibe einen brief', 'erfinde eine', 'kreative idee',
  ],
  analyse: [
    'analysiere', 'analyse', 'datensatz', 'muster', 'trends', 'auswertung',
    'interpretiere', 'evaluiere', 'untersuche', 'vergleiche die daten',
  ],
  code: [
    'code', 'funktion', 'refaktoriere', 'programm', 'unit test', 'tests schreiben',
    'debugge', 'klasse', 'backend', 'frontend', 'api', 'implementiere', 'algorithmus',
    'skript', 'schreibe eine funktion', 'schreibe einen test',
  ],
  generierung: [
    'generiere', 'generieren', 'bild generieren', 'foto generieren', 'image', 'storyboard',
    'illustriere', 'zeichne', 'erstelle ein bild', 'erstelle ein foto', 'visualisiere',
    'video generieren', 'render', 'diffusion', 'dall-e', 'midjourney', 'stable diffusion',
  ],
};

// When keyword counts tie, prefer more specific task types over generic ones
const typePriority: TaskType[] = ['generierung', 'code', 'analyse', 'kreativ', 'fakten', 'trivial'];

export function classifyPrompt(input: string): PromptClassification {
  const normalized = input.toLowerCase();

  const matches = (Object.entries(keywordMap) as Array<[TaskType, string[]]>).map(([type, keywords]) => ({
    type,
    matches: keywords.filter((keyword) => normalized.includes(keyword)),
  }));

  const bestMatch = matches
    .filter((entry) => entry.matches.length > 0)
    .sort((a, b) => {
      if (b.matches.length !== a.matches.length) return b.matches.length - a.matches.length;
      return typePriority.indexOf(a.type) - typePriority.indexOf(b.type);
    })[0];

  if (!bestMatch) {
    return {
      type: 'fakten',
      reason: ['Keine eindeutigen Keywords gefunden. Standard: Faktenaufgabe.'],
    };
  }

  return {
    type: bestMatch.type,
    reason: bestMatch.matches.map((match) => `Treffer: "${match}"`),
  };
}
