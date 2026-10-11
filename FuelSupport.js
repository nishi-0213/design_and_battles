import { findPart } from './ArmorParts.js';
import { GRID_SIZE } from './HullParts.js';

/** 同じ寸法の単一HULLに中心と回転後の範囲を完全一致させる。 */
export function fuelSupported(tank, blocks) {
  const part = findPart(tank.partId);
  const sideways = tank.angle % 180 === 90;
  const width = sideways ? part.height : part.width;
  const height = sideways ? part.width : part.height;
  return blocks.some(block => {
    if (block.partId !== (part.width === 1 ? '1x2' : '2x2')) return false;
    const hull = findPart(block.partId), rotated = block.angle % 180 === 90;
    return Math.abs(block.x - tank.x) < 0.0001 && Math.abs(block.y - tank.y) < 0.0001
      && width * GRID_SIZE === (rotated ? hull.height : hull.width) * GRID_SIZE
      && height * GRID_SIZE === (rotated ? hull.width : hull.height) * GRID_SIZE;
  });
}
