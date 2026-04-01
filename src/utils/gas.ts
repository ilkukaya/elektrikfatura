export interface GasTier {
  min: number;
  max: number | null;
  pricePerSm3: number;
}

export interface GasFixedCharges {
  distributionFee: number;
  meterReadingFee: number;
}

export interface GasTaxes {
  kdvRate: number;
  otvRate: number;
}

export interface GasTariff {
  tiers: GasTier[];
  fixedCharges: GasFixedCharges;
  taxes: GasTaxes;
}

export interface GasInput {
  consumption: number;
  subscriberType: 'mesken' | 'ticarethane' | 'sanayi';
  distributionCompany: string;
}

export interface GasBillBreakdown {
  tier1Sm3: number;
  tier2Sm3: number;
  tier3Sm3: number;
  tier1Cost: number;
  tier2Cost: number;
  tier3Cost: number;
  gasCost: number;
  distributionFee: number;
  meterReadingFee: number;
  subtotal: number;
  otv: number;
  kdv: number;
  total: number;
  pricePerSm3: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateTierCost(consumption: number, tiers: GasTier[]): { costs: number[]; sm3s: number[] } {
  const costs: number[] = [];
  const sm3s: number[] = [];
  let remaining = consumption;

  for (const tier of tiers) {
    if (remaining <= 0) {
      costs.push(0);
      sm3s.push(0);
      continue;
    }

    const tierMax = tier.max ?? Infinity;
    const tierRange = tierMax - tier.min + 1;
    const usedInTier = Math.min(remaining, tierRange);

    costs.push(round(usedInTier * tier.pricePerSm3));
    sm3s.push(usedInTier);
    remaining -= usedInTier;
  }

  return { costs, sm3s };
}

export function calculateGasBill(
  input: GasInput,
  tariffs: GasTariff
): GasBillBreakdown {
  const { costs, sm3s } = calculateTierCost(input.consumption, tariffs.tiers);

  const tier1Sm3 = sm3s[0] ?? 0;
  const tier2Sm3 = sm3s[1] ?? 0;
  const tier3Sm3 = sm3s[2] ?? 0;

  const tier1Cost = costs[0] ?? 0;
  const tier2Cost = costs[1] ?? 0;
  const tier3Cost = costs[2] ?? 0;

  const gasCost = round(tier1Cost + tier2Cost + tier3Cost);
  const distributionFee = tariffs.fixedCharges.distributionFee;
  const meterReadingFee = tariffs.fixedCharges.meterReadingFee;

  const subtotal = round(gasCost + distributionFee + meterReadingFee);

  const otv = round(subtotal * tariffs.taxes.otvRate);
  const beforeKdv = round(subtotal + otv);
  const kdv = round(beforeKdv * tariffs.taxes.kdvRate);
  const total = round(beforeKdv + kdv);

  const pricePerSm3 = input.consumption > 0 ? round(total / input.consumption) : 0;

  return {
    tier1Sm3,
    tier2Sm3,
    tier3Sm3,
    tier1Cost,
    tier2Cost,
    tier3Cost,
    gasCost,
    distributionFee,
    meterReadingFee,
    subtotal,
    otv,
    kdv,
    total,
    pricePerSm3,
  };
}
