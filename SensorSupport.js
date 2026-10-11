import { findPart } from './ArmorParts.js';
import { polygon, contains } from './HullGeometry.js';
import { GRID_SIZE } from './HullParts.js';
const epsilon = 0.0001;
/** 台座の下辺全体が、他ブロックの水平な上辺で支えられること。 */
export function sensorSupported(sensor, blocks) {
  const bottom = sensor.y + GRID_SIZE, left = sensor.x - GRID_SIZE, right = sensor.x + GRID_SIZE;
  const edges = [];
  for (const block of blocks) {
    const points = polygon(findPart(block.partId), block.x, block.y, block.angle);
    if (Math.abs(Math.min(...points.map(p => p.y)) - bottom) > epsilon) continue;
    points.forEach((p, i) => {
      const q = points[(i + 1) % points.length];
      if (Math.abs(p.y - bottom) < epsilon && Math.abs(q.y - bottom) < epsilon) edges.push([Math.min(p.x, q.x), Math.max(p.x, q.x)]);
    });
  }
  edges.sort((a, b) => a[0] - b[0]);
  let covered = left;
  for (const [start, end] of edges) {
    if (start > covered + epsilon) break;
    covered = Math.max(covered, end);
    if (covered >= right - epsilon) return true;
  }
  return false;
}
export function sensorMountAt(part, angle, pointer, blocks) {
  for (const block of blocks) {
    const shape = polygon(findPart(block.partId), block.x, block.y, block.angle);
    const y = Math.min(...shape.map(p => p.y)) - GRID_SIZE;
    for (const x of [Math.round(pointer.x / GRID_SIZE) * GRID_SIZE, Math.round(block.x / GRID_SIZE) * GRID_SIZE]) {
      const mount = { partId: part.id, x, y, angle };
      if (contains(polygon(part, x, y, angle), pointer) && sensorSupported(mount, blocks)) return mount;
    }
  }
  return null;
}
