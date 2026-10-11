import { Application, Container, Graphics, Text } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';

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

  // 設計パーツや戦闘ユニットを配置するレイヤー。
  const world = new Container();
  app.stage.addChild(world);

  const ship = new Graphics()
    .poly([0, -36, 26, 28, 0, 16, -26, 28])
    .fill({ color: 0x66ddff })
    .stroke({ color: 0xcaf4ff, width: 2 });

  ship.filters = [new GlowFilter({
    color: 0x3399ff,
    distance: 12,
    outerStrength: 1.5,
  })];
  world.addChild(ship);

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
    world.position.set(app.screen.width / 2, app.screen.height / 2);
  };
  app.renderer.on('resize', layout);
  layout();

  return {
    app,
    world,
    destroy() {
      app.renderer.off('resize', layout);
      app.destroy(true, { children: true });
    },
  };
}
