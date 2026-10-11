import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { GRID_SIZE, hullParts } from './HullParts.js';

export async function createHullPlacement(app, hull) {
  const textures = new Map();
  await Promise.all(hullParts.map(async (part) => {
    const loaded = await Assets.load(part.url);
    loaded.source.scaleMode = 'nearest';
    textures.set(part.id, part.textureFrame
      ? new Texture({ source: loaded.source, frame: new Rectangle(part.textureFrame.x, part.textureFrame.y, part.textureFrame.width, part.textureFrame.height) })
      : loaded);
  }));
  const backgroundLayer = new Container();
  backgroundLayer.label = 'hull-background';
  hull.shipLayer.addChildAt(backgroundLayer, 0);
  const preview = new Sprite();
  preview.anchor.set(0.5);
  preview.alpha = 0.5;
  preview.visible = false;
  hull.shipLayer.addChild(preview);
  const placed = [];
  let selected = null;
  let angle = 0;
  let pointer = null;

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
  }
  function select(part) {
    selected = part;
    angle = 0;
    if (part) {
      preview.texture = textures.get(part.id);
      preview.width = part.width * GRID_SIZE;
      preview.height = part.height * GRID_SIZE;
    }
    update();
  }
  function move(event) {
    const rect = app.canvas.getBoundingClientRect();
    pointer = { x: (event.clientX - rect.left) * app.screen.width / rect.width,
      y: (event.clientY - rect.top) * app.screen.height / rect.height };
    update();
  }
  const leave = () => { pointer = null; update(); };
  function place(event) {
    if (event.button !== 0 || !selected) return;
    move(event);
    const sprite = new Sprite({ texture: textures.get(selected.id) });
    sprite.anchor.set(0.5);
    sprite.width = selected.width * GRID_SIZE;
    sprite.height = selected.height * GRID_SIZE;
    sprite.position.copyFrom(preview.position);
    sprite.angle = angle;
    backgroundLayer.addChild(sprite);
    placed.push({ partId: selected.id, x: sprite.x, y: sprite.y, angle, sprite });
  }
  app.canvas.addEventListener('pointermove', move);
  app.canvas.addEventListener('pointerenter', move);
  app.canvas.addEventListener('pointerleave', leave);
  app.canvas.addEventListener('pointerdown', place);
  app.ticker.add(update);
  return {
    preview, placed, backgroundLayer, select,
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
