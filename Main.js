import { Application, Text } from 'pixi.js';
import { createHullMonitor } from './HullMonitor.js';

/** 設計＆戦闘ゲームのエントリーポイント。 */
export async function main({ parent = document.body } = {}) {
  const app = new Application();

  await app.init({
    background: '#101827',
    resizeTo: window,
    antialias: true,
    preference: 'webgl', // GLSL フィルターを使うため WebGL を選択する。
  });

  parent.appendChild(app.canvas);

  const hull = createHullMonitor();
  app.stage.addChild(hull.monitor);

  const title = new Text({
    text: '設計＆戦闘',
    style: {
      fontFamily: 'sans-serif',
      fontSize: 28,
      fill: 0xe8f3ff,
    },
  });
  title.position.set(24, 24);
  app.stage.addChild(title);

  const layout = () => {
    const scale = Math.max(0.01, Math.min(1, (app.screen.width - 32) / hull.width, (app.screen.height - 144) / hull.height));
    hull.monitor.scale.set(scale);
    hull.monitor.position.set(
      (app.screen.width - hull.width * scale) / 2,
      (app.screen.height - hull.height * scale) / 2,
    );
  };
  app.renderer.on('resize', layout);
  layout();

  return {
    app,
    world: hull.shipLayer,
    hull,
    destroy() {
      app.renderer.off('resize', layout);
      app.destroy(true, { children: true });
    },
  };
}
