import { findPart } from './ArmorParts.js';
import { polygon, contains } from './HullGeometry.js';
function dimensions(part, angle) {
  return angle % 180 === 90 ? [part.height, part.width] : [part.width, part.height];
}
export function planeSupported(plane, blocks) {
  const size = dimensions(findPart(plane.partId), plane.angle);
  return blocks.some(block => {
    if (block.partId !== 'runway-2x1') return false;
    const target = dimensions(findPart(block.partId), block.angle);
    return Math.abs(plane.x - block.x) < 0.0001 && Math.abs(plane.y - block.y) < 0.0001
      && size.every((value, i) => value === target[i]);
  });
}
export function planeMountAt(part, angle, pointer, blocks) {
  for (const block of blocks) {
    if (block.partId !== 'runway-2x1' || !contains(polygon(findPart(block.partId), block.x, block.y, block.angle), pointer)) continue;
    const mount = { partId: part.id, x: block.x, y: block.y, angle };
    if (planeSupported(mount, blocks)) return mount;
  }
  return null;
}
