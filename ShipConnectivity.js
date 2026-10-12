import { findPart } from './ArmorParts.js';
import { polygon, overlaps } from './HullGeometry.js';
import { canOverlap } from './PlacementRules.js';

function sharedEdge(a, b) {
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = a[(i + 1) % a.length];
    const dx = q.x - p.x, dy = q.y - p.y;
    const length = Math.hypot(dx, dy);
    for (let j = 0; j < b.length; j++) {
      const r = b[j], s = b[(j + 1) % b.length];
      const distance = v => Math.abs(dx * (v.y - p.y) - dy * (v.x - p.x)) / length;
      if (distance(r) > 0.0001 || distance(s) > 0.0001) continue;
      const project = v => ((v.x - p.x) * dx + (v.y - p.y) * dy) / length;
      const start = Math.min(project(r), project(s)), end = Math.max(project(r), project(s));
      if (Math.min(length, end) - Math.max(0, start) > 0.0001) return true;
    }
  }
  return false;
}

export function disconnectedBlockIndices(blocks) {
  const start = blocks.findIndex(block => block.partId === 'bridge');
  if (start < 0) return blocks.map((_,index)=>index);
  const parts = blocks.map(block => findPart(block.partId));
  const shapes = blocks.map((block, i) => polygon(parts[i], block.x, block.y, block.angle));
  const reached = new Set([start]), queue = [start];
  for (let index = 0; index < queue.length; index++) {
    const i = queue[index];
    for (let j = 0; j < blocks.length; j++) {
      if (reached.has(j)) continue;
      if (sharedEdge(shapes[i], shapes[j]) || (canOverlap(parts[i].category, parts[j].category) && overlaps(shapes[i], shapes[j]))) {
        reached.add(j); queue.push(j);
      }
    }
  }
  return blocks.map((_,index)=>index).filter(index=>!reached.has(index));
}

export function disconnectedBlocks(blocks) { return disconnectedBlockIndices(blocks).length; }
