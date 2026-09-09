export type Unit = 'lb' | 'kg';

export function lbToKg(lb: number): number {
  return lb * 0.4536;
}

export function kgToLb(kg: number): number {
  return kg / 0.4536;
}

/** Weight amount in the user's unit, rounded — "91" for 200 lb shown in kg. */
export function weightAmount(lb: number, unit: Unit): number {
  return Math.round(unit === 'kg' ? lbToKg(lb) : lb);
}

/** "200 lb" / "91 kg" */
export function formatWeight(lb: number, unit: Unit): string {
  return `${weightAmount(lb, unit)} ${unit}`;
}
