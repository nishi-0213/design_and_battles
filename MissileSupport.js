import { findPart } from './ArmorParts.js';
import { fuelSupported, fuelMountAt } from './FuelSupport.js';
import { fullySupported } from './EngineSupport.js';
import { polygon, contains } from './HullGeometry.js';
import { GRID_SIZE } from './HullParts.js';
function hullCells(blocks) {
  return blocks.filter(h => ['1x1', '1x2', '2x2'].includes(h.partId)).flatMap(h => {
    const part = findPart(h.partId), rotated = h.angle % 180 === 90;
    const width = rotated ? part.height : part.width, height = rotated ? part.width : part.height;
    const cells = [];
    for (let x = 0; x < width; x++) for (let y = 0; y < height; y++) cells.push({
      x: h.x + (x + 0.5 - width / 2) * GRID_SIZE, y: h.y + (y + 0.5 - height / 2) * GRID_SIZE });
    return cells;
  });
}
export function missileSupported(missile, blocks) {
  const part = findPart(missile.partId);
  if (part.width === 1 && part.height === 1) return hullCells(blocks).some(h => Math.abs(h.x - missile.x) < 0.0001 && Math.abs(h.y - missile.y) < 0.0001);
  return part.height === 4 ? fullySupported(missile, blocks) : fuelSupported(missile, blocks);
}
export function missileMountAt(part, angle, pointer, blocks) {
  if (part.height === 1) {
    const cell = hullCells(blocks).find(h => contains(polygon(part, h.x, h.y, angle), pointer));
    return cell ? { ...cell, partId: part.id, angle } : null;
  }
  if (part.height === 2) return fuelMountAt(part, angle, pointer, blocks);
  for (const h of blocks) {
    if (h.partId !== (part.height === 4 ? '2x2' : '1x1')) continue;
    for (const sign of part.height === 4 ? [-1, 1] : [0]) {
      const horizontal = angle % 180 === 90;
      const mount = { partId: part.id, angle, x: h.x + (horizontal ? sign * GRID_SIZE : 0),
        y: h.y + (horizontal ? 0 : sign * GRID_SIZE) };
      if (contains(polygon(part, mount.x, mount.y, angle), pointer) && missileSupported(mount, blocks)) return mount;
    }
  }
  return null;
}
