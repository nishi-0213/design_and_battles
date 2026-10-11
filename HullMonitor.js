import { Container, Graphics, Text } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';

/** 機体と操作ボタンを配置する設計用モニター。座標はモニター左上基準。 */
export function createHullMonitor() {
  const width = 800;
  const height = 560;
  const monitor = new Container();
  monitor.label = 'hull-monitor';

  const frame = new Graphics()
    .rect(0, 0, width, height).fill(0x0b1820)
    .rect(0, 0, width, height).stroke({ color: 0x527c87, width: 2 })
    .rect(12, 12, width - 24, height - 24).stroke({ color: 0x223e48, width: 1 })
    .moveTo(24, 72).lineTo(width - 24, 72)
    .stroke({ color: 0x34535e, width: 1 });
  monitor.addChild(frame);

  const title = new Text({
    text: 'HULL SIZE',
    style: { fontFamily: 'monospace', fontSize: 26, fontWeight: 'bold', letterSpacing: 4, fill: 0xa4e6db },
  });
  title.position.set(28, 28);
  title.filters = [new GlowFilter({ color: 0x448f87, distance: 6, outerStrength: 0.5 })];
  monitor.addChild(title);

  // グリッドは表示上の補助線。ブロックサイズや配置ルールは未確定。
  const viewport = { x: 28, y: 92, width: 744, height: 356 };
  const grid = new Graphics().rect(viewport.x, viewport.y, viewport.width, viewport.height).fill(0x081218);
  for (let x = viewport.x; x <= viewport.x + viewport.width; x += 24) {
    grid.moveTo(x, viewport.y).lineTo(x, viewport.y + viewport.height);
  }
  for (let y = viewport.y; y <= viewport.y + viewport.height; y += 24) {
    grid.moveTo(viewport.x, y).lineTo(viewport.x + viewport.width, y);
  }
  grid.stroke({ color: 0x19313a, width: 1 });
  grid.rect(viewport.x, viewport.y, viewport.width, viewport.height).stroke({ color: 0x34535e, width: 1 });
  monitor.addChild(grid);

  const shipLayer = new Container();
  shipLayer.label = 'hull-blocks';
  shipLayer.position.set(width / 2, viewport.y + viewport.height / 2);
  const mask = new Graphics().rect(viewport.x, viewport.y, viewport.width, viewport.height).fill(0xffffff);
  monitor.addChild(mask, shipLayer);
  shipLayer.mask = mask;

  const controlsFrame = new Graphics()
    .rect(28, 472, 744, 60).fill(0x10212a)
    .rect(28, 472, 744, 60).stroke({ color: 0x34535e, width: 1 });
  const controlsLayer = new Container();
  controlsLayer.label = 'hull-controls';
  controlsLayer.position.set(28, 472);
  monitor.addChild(controlsFrame, controlsLayer);

  return { monitor, shipLayer, controlsLayer, width, height };
}
