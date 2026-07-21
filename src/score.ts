import { modelProfiles, type ModelClass, type Scenario, type TaskType } from './scenarios';

export interface ScoreResult {
  letter: 'A' | 'B' | 'C' | 'D' | 'E';
  appropriateness: number;
  effortWh: number;
  co2Gram: number;
  costEuro: number;
  benefitIndex: number;
  explanation: string;
  methodHint: string;
}

const taskBenefitMap: Record<TaskType, number> = {
  trivial: 0.2,
  fakten: 0.45,
  kreativ: 0.6,
  analyse: 0.85,
  code: 0.8,
  generierung: 0.92,
};

// Model size on a 1–3 scale matching the required-size range below
const modelSizeFactor: Record<ModelClass, number> = {
  klein: 1,
  mittel: 2,
  gross: 3,
};

const electricityToCo2GramPerWh = 0.4;

export function calculateScore(scenario: Scenario, modelClass: ModelClass): ScoreResult {
  const profile = modelProfiles[modelClass];
  const effortWh = (scenario.estimatedTokens / 1000) * profile.energyPer1kTokensWh;
  const co2Gram = effortWh * electricityToCo2GramPerWh;
  const costEuro = (scenario.estimatedTokens / 1000) * profile.pricePer1kTokensEuro;
  const benefitIndex = taskBenefitMap[scenario.taskType];

  // Map task complexity (0–1) onto the same 1–3 model-size scale
  const requiredSize = 1 + benefitIndex * 2;
  const modelSize = modelSizeFactor[modelClass];

  // Penalty when the model is bigger than the task needs (waste)
  const overAllocation = Math.max(0, modelSize - requiredSize) / 2;
  // Softer penalty when the model is smaller than the task needs (under-resourced)
  const underAllocation = Math.max(0, requiredSize - modelSize) / 4;

  const appropriateness = Math.max(0, Math.min(1, 1 - overAllocation - underAllocation));

  let letter: ScoreResult['letter'];
  if (appropriateness >= 0.82) letter = 'A';
  else if (appropriateness >= 0.68) letter = 'B';
  else if (appropriateness >= 0.5) letter = 'C';
  else if (appropriateness >= 0.3) letter = 'D';
  else letter = 'E';

  const explanation = buildExplanation(scenario, modelClass, letter, benefitIndex, co2Gram);
  const methodHint = `Schätzung auf Basis öffentlich verfügbarer Größenordnungen für Modellenergie pro 1k Tokens; CO₂-Wert grob mit ${electricityToCo2GramPerWh.toFixed(2)} g CO₂/Wh berechnet.`;

  return { letter, appropriateness, effortWh, co2Gram, costEuro, benefitIndex, explanation, methodHint };
}

const modelLabelDative: Record<ModelClass, string> = {
  klein: 'kleinen',
  mittel: 'mittleren',
  gross: 'großen',
};

export function formatCo2Value(gram: number): string {
  if (gram === 0) return '0 g';
  if (gram < 0.001) return `${Math.round(gram * 1_000_000)} µg`;
  if (gram < 1) return `${gram.toFixed(3)} g`;
  if (gram < 1000) return `${gram.toFixed(1)} g`;
  return `${(gram / 1000).toFixed(2)} kg`;
}

export function formatEnergyValue(wh: number): string {
  if (wh === 0) return '0 Wh';
  if (wh < 0.05) return `${(wh * 1000).toFixed(1)} mWh`;
  if (wh < 1_000) return `${wh.toFixed(1)} Wh`;
  if (wh < 1_000_000) return `${(wh / 1000).toFixed(2)} kWh`;
  return `${(wh / 1_000_000).toFixed(2)} MWh`;
}

export function formatCostValue(euro: number): string {
  if (euro === 0) return '0 ct';
  if (euro < 0.01) return `${(euro * 100).toFixed(2)} ct`;
  if (euro < 0.10) return `${(euro * 100).toFixed(1)} ct`;
  if (euro < 1_000) return `${euro.toFixed(2)} €`;
  if (euro < 1_000_000) return `${euro.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`;
  return `${(euro / 1_000_000).toFixed(1).replace('.', ',')} Mio. €`;
}

function buildExplanation(
  scenario: Scenario,
  modelClass: ModelClass,
  letter: ScoreResult['letter'],
  benefitIndex: number,
  co2Gram: number,
): string {
  const label = modelLabelDative[modelClass];
  const co2 = formatCo2Value(co2Gram);
  const isUnderResourced = benefitIndex > 0.6 && modelClass === 'klein';

  if (letter === 'E') {
    return `„${scenario.title}" braucht kein ${label} Modell – der Energieaufwand (${co2} CO₂) steht in keinem sinnvollen Verhältnis zum Aufgabenbedarf.`;
  }
  if (letter === 'D') {
    return `„${scenario.title}" überfordert ein ${label} Modell kaum. Der Energieaufwand (${co2} CO₂) ist schwer zu begründen.`;
  }
  if (letter === 'C') {
    if (isUnderResourced) {
      return `„${scenario.title}" stellt hohe Anforderungen, die ein ${label} Modell möglicherweise nicht vollständig erfüllen kann (${co2} CO₂).`;
    }
    return `„${scenario.title}" passt nur bedingt zu einem ${label} Modell. Aufwand und Bedarf sind nicht optimal aufeinander abgestimmt (${co2} CO₂).`;
  }
  if (letter === 'B') {
    return `„${scenario.title}" ist für ein ${label} Modell gut vertretbar – Aufwand und Nutzen stehen in sinnvollem Verhältnis (${co2} CO₂).`;
  }
  return `„${scenario.title}" rechtfertigt ein ${label} Modell. Nutzen und Aufwand passen gut zusammen (${co2} CO₂).`;
}
