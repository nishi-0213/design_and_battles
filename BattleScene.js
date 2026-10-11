import { Application, Graphics, Filter, GlProgram, Sprite, Texture, UniformGroup } from 'pixi.js';
import { AdvancedBloomFilter } from 'pixi-filters';
import { createBattleShip } from './BattleShip.js';
import vertex from './shaders/desert.vert?raw';
import fragment from './shaders/desert.frag?raw';
import './battle.css';

/** 戦闘の背景描画。搭乗艦の移動と地面制限を管理する。 */
export async function createBattleScene(parent, { fleet, onBack }) {
  const root = document.createElement('section');
  root.className = 'battle-world';
  root.innerHTML = `<div class="battle-background"></div><div class="battle-hud"><div><strong>DESERT / AEROSPHERE</strong><p class="battle-boarding"></p></div><nav aria-label="背景の時間帯"><button data-phase="0">昼 [1]</button><button data-phase="1">夕方 [2]</button><button data-phase="2">夜 [3]</button><button class="battle-return">編成に戻る [Esc]</button></nav></div><p class="battle-debug" role="status">WASD: 移動 / R: リロード / 1・2・3: 時間帯切替</p>`;
  parent.appendChild(root);
  root.querySelector('.battle-boarding').textContent = `搭乗: ${fleet.boarding} / 自軍 ${fleet.player.length}艦 / 敵軍 ${fleet.opposition.length}艦`;
  const host = root.querySelector('.battle-background');
  const status = root.querySelector('.battle-debug');
  let app = null, filter = null, uniforms = null, phase = 0, generation = 0, dead = false, loading = false;
  let elapsed = 0, bloom = null, player = null;
  const keys = new Set();
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
  const clearKeys = () => keys.clear();
  const visibility = () => { if (document.hidden) clearKeys(); };
  function disposeRenderer() {
    app?.destroy(true, { children: true });
    filter?.destroy();
    bloom?.destroy(); bloom = null; player = null; clearKeys();
    app = null; filter = null; uniforms = null;
  }
  function setPhase(value) {
    phase = value;
    if (uniforms) uniforms.uniforms.uPhase = value;
    root.querySelectorAll('[data-phase]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.phase) === value)));
  }
  async function reload() {
    if (loading || dead) return;
    loading = true;
    const token = ++generation;
    disposeRenderer(); elapsed = 0;
    status.textContent = '背景をリロードしています…';
    const next = new Application();
    try {
      await next.init({ resizeTo: window, preference: 'webgl', antialias: false, resolution: 1, background: '#000' });
      if (dead || token !== generation) { next.destroy(true, { children: true }); return; }
      app = next;
      host.appendChild(app.canvas);
      uniforms = new UniformGroup({ uResolution: { value: new Float32Array([app.screen.width, app.screen.height]), type: 'vec2<f32>' }, uTime: { value: 0, type: 'f32' }, uPhase: { value: phase, type: 'f32' } });
      filter = new Filter({ glProgram: GlProgram.from({ vertex, fragment, name: 'desert-background', preferredFragmentPrecision: 'highp' }), resources: { desertUniforms: uniforms }, padding: 0, resolution: 1 });
      const background = new Sprite(Texture.WHITE);
      bloom = new AdvancedBloomFilter({ threshold: 0.65, bloomScale: 0.18, brightness: 1, blur: 4, quality: 3 });
      background.filters = [filter, bloom];
      app.stage.addChild(background);
      const ship = await createBattleShip(fleet.player.find(ship => ship.name === fleet.boarding));
      if (dead || token !== generation) { ship.container.destroy({ children: true }); return; }
      player = ship.container;
      player.label = 'boarding-ship';
      const ground = new Graphics();
      app.stage.addChild(ground, player);
      let groundY = 0, halfWidth = 0, halfHeight = 0;
      const clampPlayer = () => {
        player.x = Math.max(halfWidth, Math.min(app.screen.width - halfWidth, player.x));
        player.y = Math.max(halfHeight, Math.min(groundY - halfHeight, player.y));
        root.dataset.shipX = String(player.x); root.dataset.shipY = String(player.y);
        root.dataset.shipBottom = String(player.y + halfHeight); root.dataset.groundY = String(groundY);
      };
      const resize = () => { background.width = app.screen.width; background.height = app.screen.height; uniforms.uniforms.uResolution[0] = app.screen.width; uniforms.uniforms.uResolution[1] = app.screen.height;
        groundY = app.screen.height * 0.85;
        const scale = Math.min(1, 320 / ship.width, 220 / ship.height, app.screen.width * 0.4 / ship.width, groundY * 0.65 / ship.height);
        player.scale.set(scale); halfWidth = ship.width * scale / 2; halfHeight = ship.height * scale / 2;
        ground.clear().moveTo(0,groundY).lineTo(app.screen.width,groundY).stroke({width: 2, color: 0xeeeeee, alpha: 0.65});
        clampPlayer();
      };
      player.position.set(app.screen.width / 2, app.screen.height / 2);
      resize(); app.renderer.on('resize', resize);
      app.ticker.add(ticker => {
        const dt = Math.min(ticker.deltaMS,50)/1000;
        elapsed += dt; uniforms.uniforms.uTime = elapsed;
        const x = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
        const y = Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
        const length = Math.hypot(x,y);
        if (length) { player.x += x / length * 300 * dt; player.y += y / length * 300 * dt; clampPlayer(); }
      });
      app.render(); // シェーダーのコンパイル失敗も起動時に検出する。
      root.dataset.generation = String(token);
      setPhase(phase);
      status.textContent = 'WASD: 移動 / R: リロード / 1・2・3: 時間帯切替';
    } catch (error) {
      console.error(error);
      if (app === next) disposeRenderer(); else next.destroy(true, { children: true });
      if (!dead) status.textContent = '背景を起動できませんでした。WebGLを確認し、Rで再試行してください。';
    } finally { loading = false; }
  }
  function keydown(event) {
    if (dead || event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
    if (movementKeys.has(event.code)) { event.preventDefault(); keys.add(event.code); }
    else if (event.code === 'KeyR') { event.preventDefault(); reload(); }
    else if (event.code === 'Escape') { event.preventDefault(); onBack(); }
    else if (['Digit1', 'Digit2', 'Digit3'].includes(event.code)) { event.preventDefault(); setPhase(Number(event.code.slice(-1))-1); }
  }
  root.querySelectorAll('[data-phase]').forEach(button => { button.onclick = () => setPhase(Number(button.dataset.phase)); });
  root.querySelector('.battle-return').onclick = onBack;
  const keyup = event => keys.delete(event.code);
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', clearKeys);
  document.addEventListener('visibilitychange', visibility);
  await reload();
  return { destroy() { dead = true; generation++; window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', clearKeys); document.removeEventListener('visibilitychange', visibility); disposeRenderer(); root.remove(); } };
}
