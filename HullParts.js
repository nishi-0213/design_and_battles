export const GRID_SIZE = 64;
const asset = (name) => `${import.meta.env.BASE_URL}assets/hull/${name}.png`;

// 回転刻みはパーツ定義に持たせ、将来の45度回転パーツにも対応できる形にする。
export const hullParts = [
  { id: '1x1', label: '1x1', width: 1, height: 1, rotationStep: 90, category: 'HULL', mass: 1, url: asset('1x1') },
  { id: '1x2', label: '1x2', width: 1, height: 2, rotationStep: 90, category: 'HULL', mass: 2, url: asset('1x2') },
  { id: '2x2', label: '2x2', width: 2, height: 2, rotationStep: 90, category: 'HULL', mass: 4, url: asset('2x2') },
  { id: '1x1half', label: '1x1half', width: 1, height: 1, rotationStep: 90, category: 'HULL', mass: 0.5, url: asset('1x1half') },
  { id: '2x2Half', label: '2x2Half', width: 2, height: 2, rotationStep: 90, category: 'HULL', mass: 2, url: asset('2x2Half') },
];
