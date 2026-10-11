import { findPart } from './ArmorParts.js';
import { GRID_SIZE } from './HullParts.js';
import { polygon, contains } from './HullGeometry.js';

/** Yak-21は滑走路の真上1マスに、横位置を揃えて隣接する。 */
export function planeSupported(plane, blocks) {
  return plane.angle === 0 && blocks.some(block => block.partId === 'runway-2x1' && block.angle === 0
    && Math.abs(plane.x - block.x) < 0.0001
    && Math.abs(plane.y - (block.y - GRID_SIZE)) < 0.0001);
}
export function planeMountAt(part, angle, pointer, blocks) {
  if (angle !== 0) return null;
  for (const block of blocks) {
    if (block.partId !== 'runway-2x1' || block.angle !== 0) continue;
    const mount = { partId: part.id, x: block.x, y: block.y - GRID_SIZE, angle };
    if (contains(polygon(findPart(part.id), mount.x, mount.y, angle), pointer)) return mount;
  }
  return null;
}
