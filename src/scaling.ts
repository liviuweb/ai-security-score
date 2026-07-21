export interface ScalingImpact {
  totalEnergyWh: number;
  totalCo2Gram: number;
  totalCostEuro: number;
  carKm: number;
  phoneCharges: number;
  streamingHours: number;
  trees: number;
  householdDays: number;
}

export function calculateScalingImpact(
  requestsPerDay: number,
  baseTokensPerRequest: number,
  energyPer1kTokensWh: number,
  pricePer1kTokensEuro = 0.01,
  co2PerWhGram = 0.4,
): ScalingImpact {
  const totalEnergyWh = requestsPerDay * (baseTokensPerRequest / 1000) * energyPer1kTokensWh;
  const totalCo2Gram = totalEnergyWh * co2PerWhGram;
  const totalCostEuro = requestsPerDay * (baseTokensPerRequest / 1000) * pricePer1kTokensEuro;

  return {
    totalEnergyWh,
    totalCo2Gram,
    totalCostEuro,
    carKm: totalCo2Gram / 120,
    phoneCharges: totalCo2Gram / 4,
    streamingHours: totalCo2Gram / 24,
    trees: totalCo2Gram / 25,
    householdDays: totalCo2Gram / 600,
  };
}
