export type TaskType = 'trivial' | 'fakten' | 'kreativ' | 'analyse' | 'code' | 'generierung';
export type ModelClass = 'klein' | 'mittel' | 'gross';

export interface Scenario {
  id: string;
  title: string;
  prompt: string;
  taskType: TaskType;
  estimatedTokens: number;
  description: string;
}

export const scenarios: Scenario[] = [
  {
    id: 'clock',
    title: 'Wie spät ist es?',
    prompt: 'Wie spät ist es gerade?',
    taskType: 'trivial',
    estimatedTokens: 200,
    description: 'Eine kurze, triviale Frage, die kein großes Modell braucht.'
  },
  {
    id: 'summary',
    title: 'Bericht zusammenfassen',
    prompt: 'Fasse diesen 20-seitigen Bericht in 5 Bulletpoints zusammen.',
    taskType: 'fakten',
    estimatedTokens: 800,
    description: 'Eine sinnvolle, aber noch begrenzte Textaufgabe.'
  },
  {
    id: 'poem',
    title: 'Gedicht schreiben',
    prompt: 'Schreibe ein kurzes Gedicht über Berlin im Herbst.',
    taskType: 'kreativ',
    estimatedTokens: 1500,
    description: 'Kreative Ausgabe mit mittlerem Aufwand.'
  },
  {
    id: 'analysis',
    title: 'Datensatz analysieren',
    prompt: 'Analysiere diesen Datensatz und erkläre die wichtigsten Muster.',
    taskType: 'analyse',
    estimatedTokens: 8000,
    description: 'Komplexe Analyse, die ein größeres Modell sinnvoll rechtfertigen kann.'
  },
  {
    id: 'code',
    title: 'Code refaktorisieren',
    prompt: 'Refaktoriere diesen Backend-Block, ohne die Funktionalität zu ändern.',
    taskType: 'code',
    estimatedTokens: 3000,
    description: 'Programmierung mit hohem Kontextnutzen.'
  },
  {
    id: 'legal',
    title: 'Vertrag rechtlich prüfen',
    prompt: 'Analysiere diesen 50-seitigen Liefervertrag auf rechtliche Risiken und Haftungsfragen.',
    taskType: 'analyse',
    estimatedTokens: 15000,
    description: 'Komplexe juristische Analyse mit großem Kontextfenster.'
  },
  {
    id: 'research',
    title: 'Wissenschaftliche Literaturübersicht',
    prompt: 'Erstelle eine strukturierte Übersicht über 50 Forschungsartikel zum Thema KI und Klimawandel, mit Widersprüchen und offenen Fragen.',
    taskType: 'analyse',
    estimatedTokens: 20000,
    description: 'Sehr umfangreiche Synthese wissenschaftlicher Quellen.'
  },
  {
    id: 'big_refactor',
    title: 'Großes Refactoring (2000 Zeilen)',
    prompt: 'Refaktoriere dieses 2000-Zeilen-Backend vollständig auf async/await, extrahiere Services und schreibe Unit-Tests.',
    taskType: 'code',
    estimatedTokens: 12000,
    description: 'Umfangreiche Codearbeit mit hohem Kontextbedarf.'
  },
  {
    id: 'translation',
    title: 'Fachbuch übersetzen (200 Seiten)',
    prompt: 'Übersetze dieses technische Handbuch zu maschinellem Lernen vollständig ins Deutsche, terminologisch konsistent.',
    taskType: 'fakten',
    estimatedTokens: 10000,
    description: 'Langer, terminologiegebundener Übersetzungsauftrag.'
  },
  {
    id: 'elearning',
    title: 'E-Learning-Kurs erstellen',
    prompt: 'Entwickle einen vollständigen E-Learning-Kurs zu Python für Anfänger: 10 Lektionen, Quizfragen, Übungsaufgaben und Lösungen.',
    taskType: 'kreativ',
    estimatedTokens: 8000,
    description: 'Umfangreiche kreative Kursproduktion mit viel strukturiertem Output.'
  },
  {
    id: 'image_single',
    title: 'Produktfoto generieren',
    prompt: 'Generiere ein realistisches Produktfoto eines roten Lederstuhls auf weißem Hintergrund, studiobeleuchtet, 4K-Auflösung.',
    taskType: 'generierung',
    estimatedTokens: 12000,
    description: 'Einzelbild-Generierung mit diffusionsbasiertem Modell – hoher Rechenaufwand pro Ausgabe.'
  },
  {
    id: 'image_batch',
    title: 'Logo-Varianten generieren (20×)',
    prompt: 'Generiere 20 Variationen eines minimalistischen Tech-Startup-Logos in verschiedenen Farbpaletten und Stilen.',
    taskType: 'generierung',
    estimatedTokens: 55000,
    description: 'Batch-Generierung: 20 Bilder multipliziert den Energiebedarf linear.'
  },
  {
    id: 'video_storyboard',
    title: 'Video-Storyboard mit KI-Szenen',
    prompt: 'Erstelle ein vollständiges Storyboard für einen 5-minütigen Erklärfilm inklusive 30 KI-generierter Schlüsselbilder und Sprechertexten.',
    taskType: 'generierung',
    estimatedTokens: 80000,
    description: 'Multimodaler Auftrag: Text, Struktur und Bildsynthese kombiniert – sehr hohe Gesamtlast.'
  }
];

export const modelProfiles: Record<ModelClass, { label: string; parameterBand: string; energyPer1kTokensWh: number; pricePer1kTokensEuro: number }> = {
  klein: {
    label: 'klein',
    parameterBand: 'wenige Milliarden Parameter',
    energyPer1kTokensWh: 0.0008,
    pricePer1kTokensEuro: 0.002
  },
  mittel: {
    label: 'mittel',
    parameterBand: 'mittlere Größenordnung',
    energyPer1kTokensWh: 0.0017,
    pricePer1kTokensEuro: 0.01
  },
  gross: {
    label: 'groß',
    parameterBand: 'großes Modell',
    energyPer1kTokensWh: 0.0036,
    pricePer1kTokensEuro: 0.06
  }
};
