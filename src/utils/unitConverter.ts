// 1돈 = 3.75g
export const DON_TO_GRAM = 3.75;

export function gramToDon(g: number): number {
  return g / DON_TO_GRAM;
}

export function donToGram(don: number): number {
  return don * DON_TO_GRAM;
}

export function tonToKg(ton: number): number {
  return ton / 1000;
}

export function kgToGram(kg: number): number {
  return kg * 1000;
}
