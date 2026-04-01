export interface WaterTier {
  min: number;
  max: number | null;
  pricePerM3: number;
}

export interface WaterWastewater {
  rate: number;
}

export interface WaterFixedCharges {
  subscriptionFee: number;
}

export interface WaterTaxes {
  kdvRate: number;
}

export interface WaterTariff {
  authority: string;
  water: {
    tiers: WaterTier[];
  };
  wastewater: WaterWastewater;
  fixedCharges: WaterFixedCharges;
  taxes: WaterTaxes;
}

export interface WaterInput {
  consumption: number;
  city: string;
}

export interface WaterBillBreakdown {
  tier1M3: number;
  tier2M3: number;
  tier3M3: number;
  tier1Cost: number;
  tier2Cost: number;
  tier3Cost: number;
  waterCost: number;
  wastewaterCost: number;
  subscriptionFee: number;
  subtotal: number;
  kdv: number;
  total: number;
  pricePerM3: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateTierCost(consumption: number, tiers: WaterTier[]): { costs: number[]; m3s: number[] } {
  const costs: number[] = [];
  const m3s: number[] = [];
  let remaining = consumption;

  for (const tier of tiers) {
    if (remaining <= 0) {
      costs.push(0);
      m3s.push(0);
      continue;
    }

    const tierMax = tier.max ?? Infinity;
    const tierRange = tierMax - tier.min + 1;
    const usedInTier = Math.min(remaining, tierRange);

    costs.push(round(usedInTier * tier.pricePerM3));
    m3s.push(usedInTier);
    remaining -= usedInTier;
  }

  return { costs, m3s };
}

export function calculateWaterBill(
  input: WaterInput,
  tariffs: WaterTariff
): WaterBillBreakdown {
  const { costs, m3s } = calculateTierCost(input.consumption, tariffs.water.tiers);

  const tier1M3 = m3s[0] ?? 0;
  const tier2M3 = m3s[1] ?? 0;
  const tier3M3 = m3s[2] ?? 0;

  const tier1Cost = costs[0] ?? 0;
  const tier2Cost = costs[1] ?? 0;
  const tier3Cost = costs[2] ?? 0;

  const waterCost = round(tier1Cost + tier2Cost + tier3Cost);
  const wastewaterCost = round(waterCost * tariffs.wastewater.rate);
  const subscriptionFee = tariffs.fixedCharges.subscriptionFee;

  const subtotal = round(waterCost + wastewaterCost + subscriptionFee);

  const kdv = round(subtotal * tariffs.taxes.kdvRate);
  const total = round(subtotal + kdv);

  const pricePerM3 = input.consumption > 0 ? round(total / input.consumption) : 0;

  return {
    tier1M3,
    tier2M3,
    tier3M3,
    tier1Cost,
    tier2Cost,
    tier3Cost,
    waterCost,
    wastewaterCost,
    subscriptionFee,
    subtotal,
    kdv,
    total,
    pricePerM3,
  };
}
