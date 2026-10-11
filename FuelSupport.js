import { findPart } from './ArmorParts.js';
import { GRID_SIZE } from './HullParts.js';

/** 同寸法HULL、または小タンクを2x2 HULLの半分に完全一致させる。 */
export function fuelSupported(tank, blocks) {
  const part = findPart(tank.partId);
  const sideways = tank.angle % 180 === 90;
  const width = sideways ? part.height : part.width;
  const height = sideways ? part.width : part.height;
  return blocks.some(block => {
    if (part.width === 1 && block.partId === '2x2') {
      const vertical = height > width;
      return [-1, 1].some(sign =>
        Math.abs(tank.x - block.x - (vertical ? sign * GRID_SIZE / 2 : 0)) < 0.0001
        && Math.abs(tank.y - block.y - (vertical ? 0 : sign * GRID_SIZE / 2)) < 0.0001);
    }
    if (block.partId !== (part.width === 1 ? '1x2' : '2x2')) return false;
    const hull = findPart(block.partId), rotated = block.angle % 180 === 90;
    return Math.abs(block.x - tank.x) < 0.0001 && Math.abs(block.y - tank.y) < 0.0001
      && width * GRID_SIZE === (rotated ? hull.height : hull.width) * GRID_SIZE
      && height * GRID_SIZE === (rotated ? hull.width : hull.height) * GRID_SIZE;
  });
}

/** HULL上のポインターを対応する取付位置へ合わせる。 */
export function fuelMountAt(part, angle, pointer, blocks) {
  for (const block of blocks) {
    if (!['1x2', '2x2'].includes(block.partId)) continue;
    const hull = findPart(block.partId), rotated = block.angle % 180 === 90;
    const halfWidth = (rotated ? hull.height : hull.width) * GRID_SIZE / 2;
    const halfHeight = (rotated ? hull.width : hull.height) * GRID_SIZE / 2;
    if (pointer.x < block.x - halfWidth || pointer.x >= block.x + halfWidth
      || pointer.y < block.y - halfHeight || pointer.y >= block.y + halfHeight) continue;
    let x = block.x, y = block.y;
    if (part.width === 1 && block.partId === '2x2') {
      if (angle % 180 === 90) y += (pointer.y < block.y ? -1 : 1) * GRID_SIZE / 2;
      else x += (pointer.x < block.x ? -1 : 1) * GRID_SIZE / 2;
    }
    const mount = { partId: part.id, x, y, angle };
    if (fuelSupported(mount, blocks)) return mount;
  }
  return null;
}
