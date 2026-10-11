import { GRID_SIZE } from './HullParts.js';

export function polygon(part, x, y, angle) {
  const w = part.width * GRID_SIZE / 2;
  const h = part.height * GRID_SIZE / 2;
  const vertices = part.id.toLowerCase().endsWith('half')
    ? [[-w, -h], [-w, h], [w, h]]
    : [[-w, -h], [w, -h], [w, h], [-w, h]];
  const radians = angle * Math.PI / 180;
  return vertices.map(([vx, vy]) => ({ x: x + vx * Math.cos(radians) - vy * Math.sin(radians), y: y + vx * Math.sin(radians) + vy * Math.cos(radians) }));
}

// 分離軸判定。辺だけの接触は許可し、三角形の空き側も利用できる。
export function overlaps(a, b) {
  for (const shape of [a, b]) {
    for (let i = 0; i < shape.length; i++) {
      const p = shape[i], q = shape[(i + 1) % shape.length];
      const axis = { x: p.y - q.y, y: q.x - p.x };
      const project = (points) => points.map(v => v.x * axis.x + v.y * axis.y);
      const ap = project(a), bp = project(b);
      if (Math.max(...ap) <= Math.min(...bp) + 0.0001 || Math.max(...bp) <= Math.min(...ap) + 0.0001) return false;
    }
  }
  return true;
}

export function contains(points, point) {
  let sign = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
    if (Math.abs(cross) < 0.0001) continue;
    if (sign && Math.sign(cross) !== sign) return false;
    sign = Math.sign(cross);
  }
  return true;
}
