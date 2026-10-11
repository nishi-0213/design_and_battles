const STORAGE_KEY = 'design-and-battles.ships.v1';

function readLibrary() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ships: [], latest: null };
  const library = JSON.parse(raw);
  if (!library || !Array.isArray(library.ships)) throw new Error('ブラウザー内の保存データを読み取れません');
  return library;
}

function normalizeShip(ship) {
  if (!ship || ![1, 2].includes(ship.version) || typeof ship.name !== 'string' || !Array.isArray(ship.blocks)) throw new Error('保存形式に対応していません');
  if (ship.version === 2) return ship;
  const fixedIds = new Set(['engine-RD-90', 'engine-RD-130', 'engine-RD-22-4']);
  // 旧形式の横長を、新しい縦長パーツの90度回転へ変換して占有範囲を保つ。
  return { ...ship, version: 2, blocks: ship.blocks.map(block => fixedIds.has(block.partId) && [0, 90, 180, 270].includes(block.angle)
    ? { ...block, angle: (block.angle + 90) % 360 } : block) };
}

export function latestShip() {
  const library = readLibrary();
  const ship = library.ships.find(ship => ship.name === library.latest);
  if (!ship) return null;
  return normalizeShip(ship);
}

export function listShips() {
  return readLibrary().ships.map(ship => {
    if (!ship || typeof ship.name !== 'string') throw new Error('保存された機体一覧を読み取れません');
    return { name: ship.name };
  });
}

export function loadShip(name) {
  const ship = readLibrary().ships.find(ship => ship?.name === name);
  return normalizeShip(ship);
}

export function saveShip(name, blocks) {
  const ship = { version: 2, name, gridSize: 64, savedAt: new Date().toISOString(), blocks };
  const json = JSON.stringify(ship, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').slice(0, 80) || 'ship'}.ship.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  try {
    const library = readLibrary();
    const index = library.ships.findIndex(item => item.name === name);
    if (index < 0) library.ships.push(ship); else library.ships[index] = ship;
    library.latest = name;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
    return '保存しました（ブラウザー内＋JSON）';
  } catch {
    return 'JSONを出力しました。ブラウザー内保存はできませんでした';
  }
}
