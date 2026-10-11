import { GRID_SIZE } from './HullParts.js';
import { findPart } from './ArmorParts.js';
import { polygon, contains } from './HullGeometry.js';

export const EXHAUST_RADIUS = 3 * GRID_SIZE;
export const EXHAUST_ANGLE = Math.PI / 6;

export function exhaustSector(engine) {
  const part = findPart(engine.partId), rotation = engine.angle * Math.PI / 180;
  const offset = part.height * GRID_SIZE / 2;
  return { x: engine.x - Math.sin(rotation) * offset, y: engine.y + Math.cos(rotation) * offset,
    direction: rotation + Math.PI / 2, radius: EXHAUST_RADIUS, halfAngle: EXHAUST_ANGLE / 2 };
}

function clipPlane(points, distance) {
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const da = distance(a), db = distance(b);
    if (da >= 0) result.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return result;
}

// 30度のくさびで切り取り、円弧までの最短距離で正確な扇との交差を判定する。
export function intersectsExhaust(sector, shape) {
  let points = shape.map(p => ({ x: p.x - sector.x, y: p.y - sector.y }));
  const left = sector.direction - sector.halfAngle, right = sector.direction + sector.halfAngle;
  points = clipPlane(points, p => Math.cos(left) * p.y - Math.sin(left) * p.x);
  points = clipPlane(points, p => Math.sin(right) * p.x - Math.cos(right) * p.y);
  const area = Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - q.x * p.y; }, 0)) / 2;
  if (area < 0.0001) return false; // 境界だけの接触は障害物にしない。
  let nearest = contains(points, { x: 0, y: 0 }) ? 0 : Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length], dx = b.x - a.x, dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, -(a.x * dx + a.y * dy) / lengthSquared)) : 0;
    nearest = Math.min(nearest, (a.x + t * dx) ** 2 + (a.y + t * dy) ** 2);
  }
  return nearest < sector.radius ** 2 - 0.0001;
}

export function blockedRockets(blocks) {
  return blocks.filter(engine => findPart(engine.partId).engineType === 'fixed' && blocks.some(block => block !== engine &&
    intersectsExhaust(exhaustSector(engine), polygon(findPart(block.partId), block.x, block.y, block.angle))));
}
