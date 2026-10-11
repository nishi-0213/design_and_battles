import { findPart } from './ArmorParts.js';

const fulfillment = (supply, demand) => demand > 0 ? Math.min(1, supply / demand) : 1;
export function shipStats(blocks) {
  const totals = { mass: 0, fuel: 0, thrust: 0, ammo: 0, ammoRequired: 0,
    powerSupply: 0, powerDemand: 0, populationSupply: 0, populationDemand: 0 };
  for (const block of blocks) {
    const part = findPart(block.partId);
    totals.mass += part.mass;
    totals.fuel += part.fuel ?? 0;
    totals.thrust += part.thrust ?? 0;
    totals.ammo += part.ammo ?? 0;
    totals.ammoRequired += part.ammoConsumption ?? 0;
    totals.powerSupply += part.powerSupply ?? 0;
    totals.powerDemand += part.powerConsumption ?? 0;
    totals.populationSupply += part.populationSupply ?? 0;
    if (!['HULL', 'ARMOR'].includes(part.category)) {
      totals.populationDemand += Math.max(20, Math.min(60, part.width * part.height * 10));
    }
  }
  totals.rotationMultiplier = fulfillment(totals.powerSupply, totals.powerDemand)
    * fulfillment(totals.populationSupply, totals.populationDemand);
  return totals;
}

/** 戦闘時の基準旋回速度へ供給不足倍率を適用。設計時のR回転とは独立。 */
export function effectiveRotationSpeed(part, baseSpeed, stats) {
  return ['GUN', 'ENGINE'].includes(part.category) ? baseSpeed * stats.rotationMultiplier : baseSpeed;
}
