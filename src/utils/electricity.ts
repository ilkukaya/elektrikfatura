export interface Tier {
  min: number;
  max: number | null;
  pricePerKwh: number;
}

export interface FixedCharges {
  distributionFee: number;
  meterReadingFee: number;
  transmissionPerKwh: number;
  distributionPerKwh: number;
}

export interface Taxes {
  etvPerKwh: number;
  trtBandRate: number;
  municipalTaxRate: number;
  kdvRate: number;
}

export interface ElectricityTariff {
  tiers: Tier[];
  fixedCharges: FixedCharges;
  taxes: Taxes;
}

export interface MultiTimeTariff {
  gunduz: { tiers: Tier[] };
  puk: { tiers: Tier[] };
  gece: { tiers: Tier[] };
  fixedCharges: FixedCharges;
  taxes: Taxes;
}

export interface ElectricityInput {
  consumption: number;
  subscriberType: 'mesken' | 'ticarethane' | 'sanayi';
  meterType: 'tek-zamanli' | 'cok-zamanli';
  distributionCompany: string;
  peakConsumption?: number;
  offPeakConsumption?: number;
}

export interface ElectricityBillBreakdown {
  tier1kWh: number;
  tier2kWh: number;
  tier3kWh: number;
  tier1Cost: number;
  tier2Cost: number;
  tier3Cost: number;
  energyCost: number;
  distributionCost: number;
  transmissionCost: number;
  measurementCost: number;
  powerCost: number;
  subtotal: number;
  etv: number;
  trtBand: number;
  municipalTax: number;
  kdv: number;
  total: number;
  pricePerKwh: number;
}

export interface MultiTimeBillBreakdown extends ElectricityBillBreakdown {
  gunduzCost: number;
  pukCost: number;
  geceCost: number;
}

function calculateTierCost(consumption: number, tiers: Tier[]): { costs: number[]; kwhs: number[] } {
  const costs: number[] = [];
  const kwhs: number[] = [];
  let remaining = consumption;

  for (const tier of tiers) {
    if (remaining <= 0) {
      costs.push(0);
      kwhs.push(0);
      continue;
    }

    const tierMax = tier.max ?? Infinity;
    const tierRange = tierMax - tier.min + 1;
    const usedInTier = Math.min(remaining, tierRange);

    costs.push(round(usedInTier * tier.pricePerKwh));
    kwhs.push(usedInTier);
    remaining -= usedInTier;
  }

  return { costs, kwhs };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateElectricityBill(
  input: ElectricityInput,
  tariffs: ElectricityTariff | MultiTimeTariff
): ElectricityBillBreakdown | MultiTimeBillBreakdown {
  if (input.meterType === 'cok-zamanli' && isMultiTimeTariff(tariffs)) {
    return calculateMultiTimeBill(input, tariffs);
  }

  const tariff = tariffs as ElectricityTariff;
  const { costs, kwhs } = calculateTierCost(input.consumption, tariff.tiers);

  const tier1kWh = kwhs[0] ?? 0;
  const tier2kWh = kwhs[1] ?? 0;
  const tier3kWh = kwhs[2] ?? 0;

  const tier1Cost = costs[0] ?? 0;
  const tier2Cost = costs[1] ?? 0;
  const tier3Cost = costs[2] ?? 0;

  const energyCost = round(tier1Cost + tier2Cost + tier3Cost);
  const transmissionCost = round(input.consumption * tariff.fixedCharges.transmissionPerKwh);
  const distributionCost = round(input.consumption * tariff.fixedCharges.distributionPerKwh);
  const powerCost = tariff.fixedCharges.distributionFee;
  const measurementCost = tariff.fixedCharges.meterReadingFee;

  const subtotal = round(energyCost + transmissionCost + distributionCost + powerCost + measurementCost);

  const etv = round(input.consumption * tariff.taxes.etvPerKwh);
  const baseForTaxes = round(subtotal + etv);
  const trtBand = round(baseForTaxes * tariff.taxes.trtBandRate);
  const municipalTax = round(baseForTaxes * tariff.taxes.municipalTaxRate);

  const beforeKdv = round(baseForTaxes + trtBand + municipalTax);
  const kdv = round(beforeKdv * tariff.taxes.kdvRate);
  const total = round(beforeKdv + kdv);

  const pricePerKwh = input.consumption > 0 ? round(total / input.consumption) : 0;

  return {
    tier1kWh,
    tier2kWh,
    tier3kWh,
    tier1Cost,
    tier2Cost,
    tier3Cost,
    energyCost,
    distributionCost,
    transmissionCost,
    measurementCost,
    powerCost,
    subtotal,
    etv,
    trtBand,
    municipalTax,
    kdv,
    total,
    pricePerKwh,
  };
}

function calculateMultiTimeBill(
  input: ElectricityInput,
  tariffs: MultiTimeTariff
): MultiTimeBillBreakdown {
  const gunduzConsumption = input.peakConsumption ?? 0;
  const geceConsumption = input.offPeakConsumption ?? 0;
  const pukConsumption = input.consumption - gunduzConsumption - geceConsumption;

  const gunduzResult = calculateTierCost(gunduzConsumption, tariffs.gunduz.tiers);
  const geceResult = calculateTierCost(geceConsumption, tariffs.gece.tiers);
  const pukResult = calculateTierCost(Math.max(0, pukConsumption), tariffs.puk.tiers);

  const gunduzCost = gunduzResult.costs.reduce((a, b) => a + b, 0);
  const geceCost = geceResult.costs.reduce((a, b) => a + b, 0);
  const pukCost = pukResult.costs.reduce((a, b) => a + b, 0);

  const energyCost = round(gunduzCost + geceCost + pukCost);
  const totalConsumption = input.consumption;

  const transmissionCost = round(totalConsumption * tariffs.fixedCharges.transmissionPerKwh);
  const distributionCost = round(totalConsumption * tariffs.fixedCharges.distributionPerKwh);
  const powerCost = tariffs.fixedCharges.distributionFee;
  const measurementCost = tariffs.fixedCharges.meterReadingFee;

  const subtotal = round(energyCost + transmissionCost + distributionCost + powerCost + measurementCost);

  const etv = round(totalConsumption * tariffs.taxes.etvPerKwh);
  const baseForTaxes = round(subtotal + etv);
  const trtBand = round(baseForTaxes * tariffs.taxes.trtBandRate);
  const municipalTax = round(baseForTaxes * tariffs.taxes.municipalTaxRate);

  const beforeKdv = round(baseForTaxes + trtBand + municipalTax);
  const kdv = round(beforeKdv * tariffs.taxes.kdvRate);
  const total = round(beforeKdv + kdv);

  const pricePerKwh = totalConsumption > 0 ? round(total / totalConsumption) : 0;

  const allKwhs = [...gunduzResult.kwhs, ...geceResult.kwhs, ...pukResult.kwhs];
  const allCosts = [...gunduzResult.costs, ...geceResult.costs, ...pukResult.costs];

  return {
    tier1kWh: allKwhs[0] ?? 0,
    tier2kWh: allKwhs[1] ?? 0,
    tier3kWh: allKwhs[2] ?? 0,
    tier1Cost: allCosts[0] ?? 0,
    tier2Cost: allCosts[1] ?? 0,
    tier3Cost: allCosts[2] ?? 0,
    energyCost,
    distributionCost,
    transmissionCost,
    measurementCost,
    powerCost,
    subtotal,
    etv,
    trtBand,
    municipalTax,
    kdv,
    total,
    pricePerKwh,
    gunduzCost: round(gunduzCost),
    pukCost: round(pukCost),
    geceCost: round(geceCost),
  };
}

function isMultiTimeTariff(tariff: ElectricityTariff | MultiTimeTariff): tariff is MultiTimeTariff {
  return 'gunduz' in tariff && 'gece' in tariff && 'puk' in tariff;
}

export function getDistributionCompany(
  provinceSlug: string,
  provinces: Array<{ slug: string; distributionCompany: string | { asian: string; european: string } }>
): string {
  const province = provinces.find((p) => p.slug === provinceSlug);

  if (!province) return 'BAŞKENT EDAŞ';

  const dist = province.distributionCompany;
  if (typeof dist === 'object' && dist !== null) {
    return `${dist.asian} / ${dist.european}`;
  }

  return dist as string;
}
