import { Assets, Container, Rectangle, Sprite, Texture, Graphics } from 'pixi.js';
import { GRID_SIZE } from './HullParts.js';
import { allParts, findPart } from './ArmorParts.js';
import { polygon, overlaps, contains } from './HullGeometry.js';
import { canOverlap } from './PlacementRules.js';

export async function createHullPlacement(app, hull) {
  const textures = new Map();
  await Promise.all(allParts.map(async (part) => {
    const loaded = await Assets.load(part.url);
    loaded.source.scaleMode = 'nearest';
    textures.set(part.id, part.textureFrame
      ? new Texture({ source: loaded.source, frame: new Rectangle(part.textureFrame.x, part.textureFrame.y, part.textureFrame.width, part.textureFrame.height) })
      : loaded);
  }));
  const backgroundLayer = new Container();
  backgroundLayer.label = 'hull-background';
  hull.shipLayer.addChildAt(backgroundLayer, 0);
  const armorLayer = new Container();
  armorLayer.label = 'armor-layer';
  hull.shipLayer.addChild(armorLayer);
  const preview = new Sprite();
  preview.anchor.set(0.5);
  preview.alpha = 0.5;
  preview.visible = false;
  hull.shipLayer.addChild(preview);
  const placed = [];
  let selected = null;
  let angle = 0;
  let pointer = null;
  let moving = false;
  let valid = true;
  let onPickup = () => {};
  let onChange = () => {};
  let deleting = false;
  function applyMask(sprite, part) {
    if (sprite.mask) { const old = sprite.mask; sprite.mask = null; old.destroy(); }
    if (part.category === 'ARMOR' && part.id.endsWith('half')) {
      const mask = new Graphics().poly([-32, -32, -32, 32, 32, 32]).fill(0xffffff);
      sprite.addChild(mask);
      sprite.mask = mask;
    }
  }
  function layerFor(part) { return part.category === 'ARMOR' ? armorLayer : backgroundLayer; }
  function hitIndex(local) {
    // 装甲を優先し、同一レイヤー内では最後に配置したパーツから調べる。
    for (const category of ['ARMOR', 'HULL']) {
      for (let i = placed.length - 1; i >= 0; i--) {
        const item = placed[i], part = findPart(item.partId);
        if (part.category === category && contains(polygon(part, item.x, item.y, item.angle), local)) return i;
      }
    }
    return -1;
  }

  function update() {
    preview.visible = Boolean(selected && pointer);
    if (!preview.visible) return;
    const local = hull.shipLayer.toLocal(pointer);
    const sideways = angle % 180 === 90;
    const w = (sideways ? selected.height : selected.width) * GRID_SIZE;
    const h = (sideways ? selected.width : selected.height) * GRID_SIZE;
    preview.position.set(Math.floor(local.x / GRID_SIZE) * GRID_SIZE + w / 2,
      Math.floor(local.y / GRID_SIZE) * GRID_SIZE + h / 2);
    preview.angle = angle;
    const shape = polygon(selected, preview.x, preview.y, angle);
    valid = !placed.some(item => !canOverlap(selected.category, findPart(item.partId).category) && overlaps(shape, polygon(findPart(item.partId), item.x, item.y, item.angle)));
    preview.tint = valid ? 0xffffff : 0xff4444;
  }
  function select(part) {
    if (moving) return false;
    deleting = false;
    app.canvas.style.cursor = '';
    selected = part;
    angle = 0;
    if (part) {
      preview.texture = textures.get(part.id);
      applyMask(preview, part);
      preview.width = part.width * GRID_SIZE;
      preview.height = part.height * GRID_SIZE;
    }
    update();
    return true;
  }
  function move(event) {
    const rect = app.canvas.getBoundingClientRect();
    pointer = { x: (event.clientX - rect.left) * app.screen.width / rect.width,
      y: (event.clientY - rect.top) * app.screen.height / rect.height };
    update();
  }
  const leave = () => { pointer = null; update(); };
  function place(event) {
    if (event.button !== 0) return;
    move(event);
    if (deleting) {
      const index = hitIndex(hull.shipLayer.toLocal(pointer));
      if (index >= 0) { const [item] = placed.splice(index, 1); item.sprite.destroy({ children: true }); onChange(); }
      return;
    }
    if (!selected) {
      const local = hull.shipLayer.toLocal(pointer);
      const index = hitIndex(local);
      if (index < 0) return;
      const [item] = placed.splice(index, 1);
      select(findPart(item.partId));
      angle = item.angle;
      moving = true;
      item.sprite.destroy({ children: true });
      onPickup(item.partId);
      onChange();
      update();
      return;
    }
    if (!valid) return;
    const sprite = new Sprite({ texture: textures.get(selected.id) });
    sprite.anchor.set(0.5);
    sprite.width = selected.width * GRID_SIZE;
    sprite.height = selected.height * GRID_SIZE;
    sprite.position.copyFrom(preview.position);
    sprite.angle = angle;
    applyMask(sprite, selected);
    layerFor(selected).addChild(sprite);
    placed.push({ partId: selected.id, x: sprite.x, y: sprite.y, angle, sprite });
    onChange();
    if (moving) { moving = false; select(null); onPickup(null); }
    update();
  }
  app.canvas.addEventListener('pointermove', move);
  app.canvas.addEventListener('pointerenter', move);
  app.canvas.addEventListener('pointerleave', leave);
  app.canvas.addEventListener('pointerdown', place);
  app.ticker.add(update);
  return {
    preview, placed, backgroundLayer, armorLayer, select,
    onChange(callback) { onChange = callback; },
    get mass() { return placed.reduce((sum, item) => sum + findPart(item.partId).mass, 0); },
    get deleting() { return deleting; },
    toggleDelete() {
      if (moving) return false;
      const next = !deleting;
      select(null);
      deleting = next;
      app.canvas.style.cursor = deleting ? 'crosshair' : '';
      return true;
    },
    get moving() { return moving; },
    onPickup(callback) { onPickup = callback; },
    cancel() { moving = false; select(null); },
    serialize() { return placed.map(({ partId, x, y, angle }) => ({ partId, x, y, angle })); },
    restore(blocks) {
      const shapes = [];
      for (const block of blocks) {
        const part = findPart(block.partId);
        if (!part || ![block.x, block.y, block.angle].every(Number.isFinite) || ![0, 90, 180, 270].includes(block.angle)) throw new Error('保存データのパーツ情報が不正です');
        const sideways = block.angle % 180 === 90;
        const w = (sideways ? part.height : part.width) * GRID_SIZE;
        const h = (sideways ? part.width : part.height) * GRID_SIZE;
        if (Math.abs((block.x - w / 2) / GRID_SIZE - Math.round((block.x - w / 2) / GRID_SIZE)) > 0.0001 || Math.abs((block.y - h / 2) / GRID_SIZE - Math.round((block.y - h / 2) / GRID_SIZE)) > 0.0001) throw new Error('保存データのグリッド位置が不正です');
        const shape = polygon(part, block.x, block.y, block.angle);
        if (shapes.some(other => !canOverlap(part.category, other.category) && overlaps(shape, other.shape))) throw new Error('保存データのパーツが重なっています');
        shapes.push({ category: part.category, shape });
      }
      for (const item of placed) item.sprite.destroy({ children: true });
      placed.length = 0;
      for (const block of blocks) {
        const part = findPart(block.partId);
        const sprite = new Sprite({ texture: textures.get(part.id) });
        sprite.anchor.set(0.5);
        sprite.width = part.width * GRID_SIZE;
        sprite.height = part.height * GRID_SIZE;
        sprite.position.set(block.x, block.y);
        sprite.angle = block.angle;
        applyMask(sprite, part);
        layerFor(part).addChild(sprite);
        placed.push({ ...block, sprite });
      }
      onChange();
      update();
    },
    rotate() { if (selected) { angle = (angle + selected.rotationStep) % 360; update(); } },
    destroy() {
      app.canvas.removeEventListener('pointermove', move);
      app.canvas.removeEventListener('pointerenter', move);
      app.canvas.removeEventListener('pointerleave', leave);
      app.canvas.removeEventListener('pointerdown', place);
      app.ticker.remove(update);
      // Assets の共有テクスチャは Application の破棄時にも破棄しない。
    },
  };
}
