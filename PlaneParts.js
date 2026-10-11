const asset = name => `${import.meta.env.BASE_URL}assets/plane/${name}.png`;
export const planeParts = [
  { id: 'runway-2x1', label: 'RUNWAY 2x1', category: 'RUNWAY', width: 1, height: 2, mass: 2, rotationStep: 90, url: asset('runway-2x1') },
  { id: 'plane-Yak-21', label: 'Yak-21', category: 'PLANE', width: 2, height: 1, mass: 2, rotationStep: 90, url: asset('Yak-21') },
];
