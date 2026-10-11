import { Container, Graphics } from 'pixi.js';
import { GRID_SIZE } from './HullParts.js';

/** 全画面の設計モニター。カメラは機体と補助線だけに適用する。 */
export function createHullMonitor() {
  const monitor = new Container();
  monitor.label = 'hull-monitor';
  const grid = new Graphics();
  const shipLayer = new Container();
  shipLayer.label = 'hull-blocks';
  monitor.addChild(grid, shipLayer);
  const camera = { x: 0, y: 0, zoom: 1 };
  let width = 1;
  let height = 1;

  function render() {
    const cx = width / 2 - camera.x * camera.zoom;
    const cy = height / 2 - camera.y * camera.zoom;
    shipLayer.position.set(cx, cy);
    shipLayer.scale.set(camera.zoom);
    const step = GRID_SIZE * camera.zoom;
    grid.clear().rect(0, 0, width, height).fill(0x000000);
    for (let x = ((cx % step) + step) % step; x < width; x += step) {
      grid.moveTo(x, 0).lineTo(x, height);
    }
    for (let y = ((cy % step) + step) % step; y < height; y += step) {
      grid.moveTo(0, y).lineTo(width, y);
    }
    grid.stroke({ color: 0x222222, width: 1 });
    // 原点を示す軸は、空の機体エリアでも移動・倍率を確認できる目印。
    grid.moveTo(cx, 0).lineTo(cx, height).moveTo(0, cy).lineTo(width, cy)
      .stroke({ color: 0x666666, width: 1 });
  }

  return {
    monitor, shipLayer, camera,
    resize(w, h) { width = w; height = h; render(); },
    pan(dx, dy) { camera.x += dx; camera.y += dy; render(); },
    zoomAt(x, y, factor) {
      const next = Math.max(0.25, Math.min(4, camera.zoom * factor));
      camera.x += (x - width / 2) * (1 / camera.zoom - 1 / next);
      camera.y += (y - height / 2) * (1 / camera.zoom - 1 / next);
      camera.zoom = next;
      render();
    },
  };
}
