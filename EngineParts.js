const asset = (name) => `${import.meta.env.BASE_URL}assets/engine/${name}.png`;
export const engineParts = [
  { id: 'engine-RD-90', label: 'RD-90', width: 1, height: 2, category: 'ENGINE', mass: 2, rotationStep: 90, engineType: 'fixed', url: asset('RD-90') },
  { id: 'engine-RD-130', label: 'RD-130', width: 1, height: 2, category: 'ENGINE', mass: 2, rotationStep: 90, engineType: 'fixed', url: asset('RD-130') },
  { id: 'engine-RD-22-4', label: 'RD-22-4', width: 2, height: 4, category: 'ENGINE', mass: 8, rotationStep: 90, engineType: 'fixed', url: asset('RD-22-4') },
  { id: 'engine-S-12', label: 'S-12', width: 2, height: 2, category: 'ENGINE', mass: 4, rotationStep: 0, engineType: 'gimballed', url: asset('S-12') },
];
