// Datenmodell für den Unternehmens-Modus. Reine Daten + Berechnungen, kein React.
// Nutzt die bestehende calculateScore()-Logik aus score.ts (unverändert) — baut pro
// Use-Case ein temporäres Scenario-Objekt, genau wie beim Custom-Prompt im Rechner.
import { calculateScore, type ScoreResult } from './score';
import type { ModelClass, Scenario, TaskType } from './scenarios';

// Ruhiger Indigo/Slate-Akzent für den Unternehmens-Modus — bewusst kein Theme-Wechsel,
// nur ein wiederverwendbares Signalfarbe für B2B-spezifische Marker (Business-Badge im
// Topbar, Cockpit-Kacheln, Overlay). Einmal hier definiert, überall importiert.
export const B2B_ACCENT = '#3B4A6B';
// Derselbe Farbton wie B2B_ACCENT, nur transparent — für dezente Tint-Flächen statt Volltonflächen.
export const B2B_ACCENT_TINT = 'rgba(59, 74, 107, 0.08)';

export interface UseCase {
  id: string;
  name: string;
  taskType: TaskType;
  currentModel: ModelClass;
  recommendedModel: ModelClass;
  requestsPerDay: number;
  tokensPerRequest: number;
}

// Sechs realistische Anwendungsfälle eines mittleren Unternehmens — bewusst gemischt:
// einige laufen schon angemessen (currentModel === recommendedModel), andere sind klar
// überdimensioniert, damit im UI ein sichtbares Einsparpotenzial entsteht.
export const BUSINESS_USE_CASES: UseCase[] = [
  {
    id: 'faq-chatbot',
    name: 'FAQ-Chatbot',
    taskType: 'trivial',
    currentModel: 'gross',
    recommendedModel: 'klein',
    requestsPerDay: 4000,
    tokensPerRequest: 300,
  },
  {
    id: 'code-assistent',
    name: 'Code-Assistent',
    taskType: 'code',
    currentModel: 'gross',
    recommendedModel: 'gross',
    requestsPerDay: 250,
    tokensPerRequest: 3000,
  },
  {
    id: 'doku-analyse',
    name: 'Doku-Analyse',
    taskType: 'analyse',
    currentModel: 'gross',
    recommendedModel: 'gross',
    requestsPerDay: 80,
    tokensPerRequest: 9000,
  },
  {
    id: 'meeting-zusammenfassung',
    name: 'Meeting-Zusammenfassung',
    taskType: 'fakten',
    currentModel: 'gross',
    recommendedModel: 'mittel',
    requestsPerDay: 150,
    tokensPerRequest: 900,
  },
  {
    id: 'marketing-texte',
    name: 'Marketing-Texte',
    taskType: 'kreativ',
    currentModel: 'mittel',
    recommendedModel: 'mittel',
    requestsPerDay: 60,
    tokensPerRequest: 1500,
  },
  {
    id: 'interne-suche',
    name: 'Interne Suche',
    taskType: 'trivial',
    currentModel: 'mittel',
    recommendedModel: 'klein',
    requestsPerDay: 2000,
    tokensPerRequest: 250,
  },
];

export function toScenario(useCase: UseCase): Scenario {
  return {
    id: useCase.id,
    title: useCase.name,
    prompt: useCase.name,
    taskType: useCase.taskType,
    estimatedTokens: useCase.tokensPerRequest,
    description: 'Unternehmens-Anwendungsfall',
  };
}

export interface FleetSummary {
  totalCo2PerMonth: number;
  totalCostPerMonth: number;
  savingsCo2PerMonth: number;
  savingsCostPerMonth: number;
  compliantCount: number;
  totalCount: number;
}

export type Letter = ScoreResult['letter'];

export interface CompliancePolicy {
  maxScoreForTrivial: Letter; // triviale Aufgaben dürfen höchstens diese Note haben
  minScoreOverall: Letter; // kein Use-Case darf schlechter sein als das
}

export const DEFAULT_COMPLIANCE_POLICY: CompliancePolicy = {
  maxScoreForTrivial: 'B',
  minScoreOverall: 'C',
};

const LETTER_RANK: Record<Letter, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };

export function checkCompliance(useCase: UseCase, policy: CompliancePolicy): boolean {
  const result = calculateScore(toScenario(useCase), useCase.currentModel);
  const rank = LETTER_RANK[result.letter];

  if (rank < LETTER_RANK[policy.minScoreOverall]) return false;
  if (useCase.taskType === 'trivial' && rank < LETTER_RANK[policy.maxScoreForTrivial]) return false;
  return true;
}

export const DAYS_PER_MONTH = 30;

export function calculateFleet(
  useCases: UseCase[],
  policy: CompliancePolicy = DEFAULT_COMPLIANCE_POLICY,
): FleetSummary {
  let totalCo2PerMonth = 0;
  let totalCostPerMonth = 0;
  let recommendedCo2PerMonth = 0;
  let recommendedCostPerMonth = 0;
  let compliantCount = 0;

  useCases.forEach((useCase) => {
    const scenario = toScenario(useCase);
    const monthlyRequests = useCase.requestsPerDay * DAYS_PER_MONTH;

    const currentResult = calculateScore(scenario, useCase.currentModel);
    totalCo2PerMonth += currentResult.co2Gram * monthlyRequests;
    totalCostPerMonth += currentResult.costEuro * monthlyRequests;

    const recommendedResult = calculateScore(scenario, useCase.recommendedModel);
    recommendedCo2PerMonth += recommendedResult.co2Gram * monthlyRequests;
    recommendedCostPerMonth += recommendedResult.costEuro * monthlyRequests;

    if (checkCompliance(useCase, policy)) compliantCount += 1;
  });

  return {
    totalCo2PerMonth,
    totalCostPerMonth,
    savingsCo2PerMonth: Math.max(0, totalCo2PerMonth - recommendedCo2PerMonth),
    savingsCostPerMonth: Math.max(0, totalCostPerMonth - recommendedCostPerMonth),
    compliantCount,
    totalCount: useCases.length,
  };
}

export interface FleetHistoryPoint {
  dateKey: string;
  co2Gram: number;
  costEuro: number;
}

// Deterministisches Pseudo-Rauschen (kein Math.random) — dieselbe Historie sieht bei
// jedem Render gleich aus, schwankt aber organisch statt linear.
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// WICHTIG: Simulierte Daten. Es gibt keine echte Browser-Extension, die Nutzung trackt —
// diese Funktion tut nur so, als hätte eine solche Extension die Fleet-Summe über den
// angegebenen Zeitraum mit leichtem Tag-zu-Tag-Rauschen mitgeschnitten.
export function generateFleetHistory(
  days: number,
  useCases: UseCase[] = BUSINESS_USE_CASES,
): FleetHistoryPoint[] {
  const summary = calculateFleet(useCases);
  const baseCo2PerDay = summary.totalCo2PerMonth / DAYS_PER_MONTH;
  const baseCostPerDay = summary.totalCostPerMonth / DAYS_PER_MONTH;

  const points: FleetHistoryPoint[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const swing = (pseudoRandom(i) - 0.5) * 0.3; // ± 15 %
    const factor = 1 + swing;

    points.push({
      dateKey: date.toISOString().slice(0, 10),
      co2Gram: baseCo2PerDay * factor,
      costEuro: baseCostPerDay * factor,
    });
  }

  return points;
}
