import { findPart } from './ArmorParts.js';
import { GRID_SIZE } from './HullParts.js';

const equal = (a, b) => Math.abs(a - b) < 0.0001;
function footprint(block) {
  const part = findPart(block.partId), sideways = block.angle % 180 === 90;
  return { x: block.x, y: block.y, width: (sideways ? part.height : part.width) * GRID_SIZE,
    height: (sideways ? part.width : part.height) * GRID_SIZE };
}
function same(a, b) { return ['x', 'y', 'width', 'height'].every(key => equal(a[key], b[key])); }

/** ENGINEの寸法ごとに指定された矩形HULLとの完全一致を要求する。 */
export function fullySupported(engine, blocks) {
  const part = findPart(engine.partId), area = footprint(engine);
  if (part.width === 2 && part.height === 1) {
    return blocks.some(block => block.partId === '1x2' && same(footprint(block), area));
  }
  if (part.width === 2 && part.height === 2) {
    return blocks.some(block => block.partId === '2x2' && same(footprint(block), area));
  }
  if (part.width === 4 && part.height === 2) {
    const horizontal = area.width > area.height;
    const targets = [-1, 1].map(sign => ({ x: area.x + (horizontal ? sign * GRID_SIZE : 0),
      y: area.y + (horizontal ? 0 : sign * GRID_SIZE), width: 2 * GRID_SIZE, height: 2 * GRID_SIZE }));
    return targets.every(target => blocks.some(block => block.partId === '2x2' && same(footprint(block), target)));
  }
  return false;
}
