import { findPart } from './ArmorParts.js';
import { polygon } from './HullGeometry.js';

const cross = (a, b, p) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
const signedArea = points => points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - q.x * p.y; }, 0) / 2;

// 凸多角形の交差面積で、複数HULLの合計がENGINE全体を覆うか確認する。
function intersectionArea(subject, clip) {
  let result = subject;
  const sign = Math.sign(signedArea(clip));
  for (let i = 0; i < clip.length && result.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length], input = result;
    result = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j], q = input[(j + 1) % input.length];
      const dp = cross(a, b, p) * sign, dq = cross(a, b, q) * sign;
      if (dp >= -0.000001) result.push(p);
      if ((dp >= -0.000001) !== (dq >= -0.000001)) {
        const t = dp / (dp - dq);
        result.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
      }
    }
  }
  return Math.abs(signedArea(result));
}

export function fullySupported(engine, blocks) {
  const part = findPart(engine.partId);
  const shape = polygon(part, engine.x, engine.y, engine.angle);
  const covered = blocks.filter(block => findPart(block.partId).category === 'HULL')
    .reduce((sum, block) => sum + intersectionArea(shape, polygon(findPart(block.partId), block.x, block.y, block.angle)), 0);
  return Math.abs(covered - Math.abs(signedArea(shape))) < 0.001;
}
