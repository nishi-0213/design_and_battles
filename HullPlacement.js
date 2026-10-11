import { Assets, Container, Rectangle, Sprite, Texture, Graphics } from 'pixi.js';
import { GRID_SIZE } from './HullParts.js';
import { allParts, findPart } from './ArmorParts.js';
import { polygon, overlaps, contains } from './HullGeometry.js';
import { disconnectedBlocks } from './ShipConnectivity.js';
import { fullySupported } from './EngineSupport.js';
import { blockedRockets, exhaustSector } from './RocketExhaust.js';
import { canOverlap } from './PlacementRules.js';

export async function createHullPlacement(app, hull) {
  const textures = new Map();
  await Promise.all(allParts.filter(part => part.url).map(async (part) => {
    const loaded = await Assets.load(part.url);
    loaded.source.scaleMode = 'nearest';
    textures.set(part.id, part.textureFrame
      ? new Texture({ source: loaded.source, frame: new Rectangle(part.textureFrame.x, part.textureFrame.y, part.textureFrame.width, part.textureFrame.height) })
      : loaded);
  }));
  const fixedEngineLayer = new Container();
  fixedEngineLayer.label = 'fixed-engine-layer';
  hull.shipLayer.addChild(fixedEngineLayer);
  const backgroundLayer = new Container();
  backgroundLayer.label = 'hull-background';
  hull.shipLayer.addChild(backgroundLayer);
  const armorLayer = new Container();
  armorLayer.label = 'armor-layer';
  hull.shipLayer.addChild(armorLayer);
  const engineLayer = new Container();
  engineLayer.label = 'engine-layer';
  hull.shipLayer.addChild(engineLayer);
  const preview = new Sprite();
  preview.anchor.set(0.5);
  preview.alpha = 0.5;
  preview.visible = false;
  hull.shipLayer.addChild(preview);
  const exhaustOverlay = new Graphics();
  exhaustOverlay.label = 'rocket-exhaust';
  exhaustOverlay.eventMode = 'none';
  hull.shipLayer.addChild(exhaustOverlay);
  const placed = [];
  let selected = null;
  let angle = 0;
  let pointer = null;
  let moving = false;
  let valid = true;
  let onPickup = () => {};
  let onChange = () => {};
  let deleting = false;
  let onAlert = () => {};
  function applyMask(sprite, part) {
    if (sprite.mask) { const old = sprite.mask; sprite.mask = null; old.destroy(); }
    if (part.category === 'ARMOR' && part.id.endsWith('half')) {
      const mask = new Graphics().poly([-32, -32, -32, 32, 32, 32]).fill(0xffffff);
      sprite.addChild(mask);
      sprite.mask = mask;
    }
  }
  function layerFor(part) { return part.engineType === 'fixed' ? fixedEngineLayer : part.category === 'ENGINE' ? engineLayer : part.category === 'ARMOR' ? armorLayer : backgroundLayer; }
  function hitIndex(local) {
    // フレーム背面の固定式も操作できるようENGINEを優先し、同カテゴリは新しい配置から調べる。
    for (const category of ['ENGINE', 'ARMOR', 'HULL', 'BRIDGE']) {
      for (let i = placed.length - 1; i >= 0; i--) {
        const item = placed[i], part = findPart(item.partId);
        if (part.category === category && contains(polygon(part, item.x, item.y, item.angle), local)) return i;
      }
    }
    return -1;
  }

  function updateExhaust() {
    exhaustOverlay.clear();
    exhaustOverlay.visible = false;
    if (!pointer) return;
    const local = hull.shipLayer.toLocal(pointer);
    const engine = placed.find(block => findPart(block.partId).engineType === 'fixed' && contains(polygon(findPart(block.partId), block.x, block.y, block.angle), local));
    if (!engine) return;
    const sector = exhaustSector(engine);
    exhaustOverlay.visible = true;
    exhaustOverlay.moveTo(sector.x, sector.y)
      .arc(sector.x, sector.y, sector.radius, sector.direction - sector.halfAngle, sector.direction + sector.halfAngle)
      .closePath().fill({ color: 0xe63333, alpha: 0.3 }).stroke({ color: 0xff5555, alpha: 0.65, width: 1 });
  }
  function update() {
    updateExhaust();
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
    if (selected.category === 'ENGINE') valid = valid && fullySupported({ partId: selected.id, x: preview.x, y: preview.y, angle }, placed);
    preview.tint = valid ? 0xffffff : 0xff4444;
  }
  function select(part) {
    if (moving || part?.fixed) return false;
    deleting = false;
    app.canvas.style.cursor = '';
    selected = part;
    angle = 0;
    if (part) {
      if (part.engineType === 'fixed') fixedEngineLayer.addChild(preview); else hull.shipLayer.addChild(preview);
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
      if (index >= 0 && findPart(placed[index].partId).fixed) { onAlert('BRIDGEは削除できません'); return; }
      if (index >= 0) { const [item] = placed.splice(index, 1); item.sprite.destroy({ children: true }); onChange(); }
      return;
    }
    if (!selected) {
      const local = hull.shipLayer.toLocal(pointer);
      const index = hitIndex(local);
      if (index < 0) return;
      if (findPart(placed[index].partId).fixed) { onAlert('BRIDGEは移動・削除できません'); return; }
      const [item] = placed.splice(index, 1);
      select(findPart(item.partId));
      angle = selected.engineType === 'gimballed' ? 0 : item.angle;
      moving = true;
      item.sprite.destroy({ children: true });
      onPickup(item.partId);
      onChange();
      update();
      return;
    }
    if (!valid) { onAlert(selected.category === 'ENGINE' ? 'ENGINEは指定寸法のHULLに位置・向きを完全一致させてください（他パーツとの重なりも不可）' : '他のブロックと重なるため配置できません'); return; }
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
  const bridgeSprite = new Sprite({ texture: textures.get('bridge') });
  bridgeSprite.anchor.set(0.5); bridgeSprite.width = bridgeSprite.height = 128;
  backgroundLayer.addChild(bridgeSprite);
  placed.push({ partId: 'bridge', x: 0, y: 0, angle: 0, sprite: bridgeSprite });
  app.canvas.addEventListener('pointermove', move);
  app.canvas.addEventListener('pointerenter', move);
  app.canvas.addEventListener('pointerleave', leave);
  app.canvas.addEventListener('pointerdown', place);
  app.ticker.add(update);
  return {
    preview, placed, backgroundLayer, armorLayer, engineLayer, fixedEngineLayer, exhaustOverlay, select,
    onAlert(callback) { onAlert = callback; },
    validateSave() {
      if (placed.some(block => findPart(block.partId).category === 'ENGINE' && !fullySupported(block, placed))) throw new Error('HULLに完全に取り付けられていないENGINEがあります。保存できません');
      const blocked = blockedRockets(placed);
      if (blocked.length) throw new Error(`固定式ロケット${blocked.length}個の噴射範囲にブロックがあります。保存できません`);
      const count = disconnectedBlocks(placed);
      if (count) throw new Error(`BRIDGEに接続していないブロックが${count}個あります。保存できません`);
    },
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
      // 旧セーブのS-12は正位置へ移行する。正方形なので占有領域は変わらない。
      blocks = blocks.map(block => findPart(block.partId)?.engineType === 'gimballed' && [0, 90, 180, 270].includes(block.angle)
        ? { ...block, angle: 0 } : block);
      // 旧データには中央のBRIDGEを追加する。衝突する場合は元データを保持して読込を拒否。
      if (!blocks.some(block => block.partId === 'bridge')) blocks = [{ partId: 'bridge', x: 0, y: 0, angle: 0 }, ...blocks];
      if (blocks.filter(block => block.partId === 'bridge').length !== 1 || blocks.some(block => block.partId === 'bridge' && (block.x !== 0 || block.y !== 0 || block.angle !== 0))) throw new Error('BRIDGEは中央に1個配置する必要があります');
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
      if (blocks.some(block => findPart(block.partId).category === 'ENGINE' && !fullySupported(block, blocks))) throw new Error('保存データのENGINEがHULLに完全に取り付けられていません');
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
    rotate() {
      if (!selected) return;
      if (!selected.rotationStep) { onAlert('S-12は設計時は正位置固定です。無段階の回転は戦闘時の機能です'); return; }
      angle = (angle + selected.rotationStep) % 360;
      update();
    },
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
