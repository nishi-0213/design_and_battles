import { Assets, Container, Graphics, Sprite } from 'pixi.js';
import { findPart } from './ArmorParts.js';

const layer = part => part.category === 'MISSILE' || part.engineType === 'fixed' ? 0 : ['HULL', 'BRIDGE'].includes(part.category) ? 1 : part.category === 'ARMOR' ? 2 : ['GUN', 'PLANE', 'SENSOR'].includes(part.category) ? 4 : 3;

/** 保存された機体を設計時と同じ向き・描画順で組み立てる。 */
export async function createBattleShip(ship) {
  const blocks = ship.blocks.map(block => ({ ...block, part: findPart(block.partId) }));
  const textures = new Map(await Promise.all([...new Set(blocks.map(block => block.part.url))].map(async url => [url, await Assets.load(url)])));
  const container = new Container();
  const guns = [];
  const entries = [];
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const block of blocks.sort((a, b) => layer(a.part) - layer(b.part))) {
    const sprite = new Sprite(textures.get(block.part.url));
    sprite.texture.source.scaleMode = 'nearest';
    sprite.anchor.set(0.5);
    sprite.width = block.part.width * 64; sprite.height = block.part.height * 64;
    sprite.position.set(block.x, block.y); sprite.angle = block.angle || 0;
    if (block.part.category === 'ARMOR' && block.part.id.endsWith('half')) {
      const mask = new Graphics().poly([-32,-32,-32,32,32,32]).fill(0xffffff);
      sprite.addChild(mask); sprite.mask = mask;
    }
    container.addChild(sprite);
    entries.push({ sprite, block, part: block.part, destroyed: false, nextShot: 0 });
    if (block.part.category === 'GUN') guns.push(sprite);
    const rotated = block.angle % 180 !== 0;
    const w = (rotated ? block.part.height : block.part.width) * 64;
    const h = (rotated ? block.part.width : block.part.height) * 64;
    left = Math.min(left, block.x - w / 2); right = Math.max(right, block.x + w / 2);
    top = Math.min(top, block.y - h / 2); bottom = Math.max(bottom, block.y + h / 2);
  }
  if (!blocks.length) { left = top = -32; right = bottom = 32; }
  container.pivot.set((left + right) / 2, (top + bottom) / 2);
  return { container, guns, entries, width: right - left, height: bottom - top };
}
