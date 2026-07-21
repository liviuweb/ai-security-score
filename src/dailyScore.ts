import type { DailyAggregate, Letter, UsageEvent } from './usageTypes';

export const CO2_BUDGET_G = 5;

export function toDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function burdenToLetter(burden: number): Letter {
  if (burden <= 0.18) return 'A';
  if (burden <= 0.32) return 'B';
  if (burden <= 0.5) return 'C';
  if (burden <= 0.7) return 'D';
  return 'E';
}

export function aggregateDay(events: UsageEvent[]): DailyAggregate {
  const dateKey = toDateKey(events[0]?.timestamp ?? Date.now());

  let totalCo2Gram = 0;
  let totalCostEuro = 0;
  let totalEffortWh = 0;
  let totalTokens = 0;
  let weightedAppropriateness = 0;

  for (const event of events) {
    totalCo2Gram += event.co2Gram;
    totalCostEuro += event.costEuro;
    totalEffortWh += event.effortWh;
    totalTokens += event.tokens;
    weightedAppropriateness += event.appropriateness * event.tokens;
  }

  const avgEfficiency = totalTokens > 0 ? weightedAppropriateness / totalTokens : 1;
  const inefficiency = 1 - avgEfficiency;
  const volumeLoad = Math.min(1, totalCo2Gram / CO2_BUDGET_G);
  const dailyBurden = volumeLoad * (0.4 + 0.6 * inefficiency);

  return {
    dateKey,
    events,
    totalCo2Gram,
    totalCostEuro,
    totalEffortWh,
    totalTokens,
    avgEfficiency,
    volumeLoad,
    dailyBurden,
    letter: burdenToLetter(dailyBurden),
  };
}

export function groupByDay(events: UsageEvent[]): DailyAggregate[] {
  const buckets = new Map<string, UsageEvent[]>();

  for (const event of events) {
    const key = toDateKey(event.timestamp);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.push(event);
    } else {
      buckets.set(key, [event]);
    }
  }

  return Array.from(buckets.values())
    .map((dayEvents) => aggregateDay(dayEvents))
    .sort((a, b) => (a.dateKey < b.dateKey ? 1 : a.dateKey > b.dateKey ? -1 : 0));
}
