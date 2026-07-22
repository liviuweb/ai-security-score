export type Letter = 'A' | 'B' | 'C' | 'D' | 'E';

export interface UsageEvent {
  id: string;
  timestamp: number;
  source: string;
  taskType: string;
  modelSize: 'klein' | 'mittel' | 'gross';
  tokens: number;
  co2Gram: number;
  costEuro: number;
  effortWh: number;
  appropriateness: number;
}

export interface DailyAggregate {
  dateKey: string;
  events: UsageEvent[];
  totalCo2Gram: number;
  totalCostEuro: number;
  totalEffortWh: number;
  totalTokens: number;
  avgEfficiency: number;
  volumeLoad: number;
  dailyBurden: number;
  letter: Letter;
}
