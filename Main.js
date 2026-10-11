import { Application } from 'pixi.js';
import { createHullMonitor } from './HullMonitor.js';
import { createDesignControls } from './DesignControls.js';

/** 設計＆戦闘ゲームのエントリーポイント。 */
export async function main({ parent = document.body } = {}) {
  const app = new Application();
  await app.init({ background: '#081218', resizeTo: window, antialias: false, preference: 'webgl' });
  parent.appendChild(app.canvas);
  const hull = createHullMonitor();
  app.stage.addChild(hull.monitor);
  const controls = createDesignControls(parent);
  const layout = () => hull.resize(app.screen.width, app.screen.height);
  app.renderer.on('resize', layout);
  layout();

  const keys = new Set();
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
  const keydown = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (movementKeys.has(event.code)) { event.preventDefault(); keys.add(event.code); }
  };
  const keyup = (event) => keys.delete(event.code);
  const clearKeys = () => keys.clear();
  const visibility = () => { if (document.hidden) clearKeys(); };
  const tick = (ticker) => {
    let x = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
    let y = Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
    const length = Math.hypot(x, y);
    if (length) {
      const distance = 360 * Math.min(ticker.deltaMS, 50) / 1000 / hull.camera.zoom;
      hull.pan(x / length * distance, y / length * distance);
    }
  };
  const wheel = (event) => {
    event.preventDefault();
    const rect = app.canvas.getBoundingClientRect();
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
    hull.zoomAt((event.clientX - rect.left) * app.screen.width / rect.width,
      (event.clientY - rect.top) * app.screen.height / rect.height,
      Math.exp(-Math.max(-500, Math.min(500, delta)) * 0.0015));
  };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', clearKeys);
  document.addEventListener('visibilitychange', visibility);
  app.canvas.addEventListener('wheel', wheel, { passive: false });
  app.ticker.add(tick);

  return {
    app, world: hull.shipLayer, hull, controls,
    destroy() {
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', visibility);
      app.canvas.removeEventListener('wheel', wheel);
      app.ticker.remove(tick);
      app.renderer.off('resize', layout);
      controls.destroy();
      app.destroy(true, { children: true });
    },
  };
}
