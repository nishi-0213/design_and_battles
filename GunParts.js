const asset = (name) => `${import.meta.env.BASE_URL}assets/gun/${name}.png`;
export const gunParts = [
  { id: 'gun-AK-200', label: 'AK-200 30mmガトリング', width: 2, height: 2, category: 'GUN', mass: 4, rotationStep: 90, url: asset('AK-200') },
  { id: 'gun-24-K', label: '24-K 57mm砲', width: 2, height: 2, category: 'GUN', mass: 4, rotationStep: 90, url: asset('24-K') },
  { id: 'gun-AK-82', label: 'AK-82 76mm砲', width: 2, height: 2, category: 'GUN', mass: 4, rotationStep: 90, url: asset('AK-82') },
  { id: 'gun-A-100', label: 'A-100 100mm砲', width: 2, height: 2, category: 'GUN', mass: 4, rotationStep: 90, url: asset('A-100') },
  { id: 'gun-AK-130', label: 'AK-130 130mm砲', width: 2, height: 2, category: 'GUN', mass: 4, rotationStep: 90, url: asset('AK-130') },
  { id: 'gun-AK-130-6', label: 'AK-130-6 130mm砲6連装', width: 2, height: 2, category: 'GUN', mass: 4, rotationStep: 90, url: asset('AK-130-6') },
  { id: 'gun-RBU-4200', label: 'RBU-4200 空対空ロケット砲', width: 2, height: 2, category: 'GUN', mass: 4, rotationStep: 90, url: asset('RBU-4200') },
];
