const asset = (name) => `${import.meta.env.BASE_URL}assets/fuel/${name}.png`;
// 燃料量・重量はバランス調整前の仮値。
export const fuelParts = [
  { id: 'fuel-1x2', label: '1x2', width: 1, height: 2, category: 'FUEL', mass: 2, fuel: 100, rotationStep: 90, url: asset('1x2') },
  { id: 'fuel-2x2', label: '2x2', width: 2, height: 2, category: 'FUEL', mass: 4, fuel: 200, rotationStep: 90, url: asset('2x2') },
];
