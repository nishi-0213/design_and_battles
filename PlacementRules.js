// 許可されたカテゴリの組み合わせのみ重ね配置できる。
// HULL/HULL、ARMOR/ARMOR、HULL/ARMOR は現時点では許可しない。
// 今後合意した組み合わせを ['HULL', 'ENGINE'] のように追加する。
export const overlapAllowedPairs = [['ENGINE', 'HULL'], ['GUN', 'HULL'], ['FUEL', 'HULL'], ['AMMO', 'HULL'], ['GENERATOR', 'HULL'], ['CABIN', 'HULL'], ['MISSILE', 'HULL']];

export function canOverlap(categoryA, categoryB) {
  return overlapAllowedPairs.some(([a, b]) =>
    (a === categoryA && b === categoryB) || (a === categoryB && b === categoryA));
}
