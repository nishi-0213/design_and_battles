import { Application, Graphics, Filter, GlProgram, Sprite, Texture, UniformGroup } from 'pixi.js';
import { AdvancedBloomFilter, GlitchFilter } from 'pixi-filters';
import { createBattleShip } from './BattleShip.js';
import { terrainGLSL, terrainProjection } from './DesertTerrain.js';
import { createFlightBody, bodyBounds, stepFlight } from './FlightPhysics.js';
import { shipStats } from './ShipStats.js';
import vertex from './shaders/desert.vert?raw';
import fragment from './shaders/desert.frag?raw';
import './battle.css';

/** 戦闘の背景描画。搭乗艦の移動と地面制限を管理する。 */
export async function createBattleScene(parent, { fleet, onBack }) {
  const root = document.createElement('section');
  root.className = 'battle-world';
  root.innerHTML = `<div class="battle-background"></div><div class="battle-hud"><div><strong>DESERT / AEROSPHERE</strong><p class="battle-boarding"></p></div><nav aria-label="背景の時間帯"><button data-phase="0">昼 [1]</button><button data-phase="1">夕方 [2]</button><button data-phase="2">夜 [3]</button><button class="battle-return">編成に戻る [Esc]</button></nav></div><p class="battle-debug" role="status">WASD: 推力 / Q・E: 回転 / R: リロード / 1・2・3: 時間帯切替</p>`;
  parent.appendChild(root);
  root.querySelector('.battle-boarding').textContent = `搭乗: ${fleet.boarding} / 自軍 ${fleet.player.length}艦 / 敵軍 ${fleet.opposition.length}艦`;
  const host = root.querySelector('.battle-background');
  const status = root.querySelector('.battle-debug');
  let app = null, filter = null, uniforms = null, phase = 0, generation = 0, dead = false, loading = false;
  let elapsed = 0, bloom = null, player = null, groundGlitch = null;
  const keys = new Set();
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE']);
  const clearKeys = () => keys.clear();
  const visibility = () => { if (document.hidden) clearKeys(); };
  function disposeRenderer() {
    app?.destroy(true, { children: true });
    filter?.destroy();
    groundGlitch?.destroy(); groundGlitch = null;
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
      uniforms = new UniformGroup({ uResolution: { value: new Float32Array([app.screen.width, app.screen.height]), type: 'vec2<f32>' }, uTime: { value: 0, type: 'f32' }, uPhase: { value: phase, type: 'f32' }, uCamera: { value: new Float32Array([0,0]), type: 'vec2<f32>' }, uWorldPerPixel: { value: 1, type: 'f32' } });
      filter = new Filter({ glProgram: GlProgram.from({ vertex, fragment: fragment.replace('/* TERRAIN_HEIGHT */', terrainGLSL), name: 'desert-background', preferredFragmentPrecision: 'highp' }), resources: { desertUniforms: uniforms }, padding: 0, resolution: 1 });
      const background = new Sprite(Texture.WHITE);
      bloom = new AdvancedBloomFilter({ threshold: 0.65, bloomScale: 0.18, brightness: 1, blur: 4, quality: 3 });
      background.filters = [filter, bloom];
      app.stage.addChild(background);
      const ship = await createBattleShip(fleet.player.find(ship => ship.name === fleet.boarding));
      if (dead || token !== generation) { ship.container.destroy({ children: true }); return; }
      player = ship.container;
      player.label = 'boarding-ship';
      const ground = new Graphics();
      groundGlitch = new GlitchFilter({ slices: 5, offset: 0.7, direction: 0, red: { x: 0.3, y: 0 }, green: { x: -0.2, y: 0 } });
      ground.filters = [groundGlitch];
      let glitchTime = 0;
      app.stage.addChild(ground, player);
      let halfWidth = 0, halfHeight = 0;
      const body = createFlightBody(app.screen.width/2,app.screen.height/2,ship.width,ship.height,shipStats(fleet.player.find(ship=>ship.name===fleet.boarding).blocks).mass);
      const camera = { x: 0, y: 0 };
      let projection = terrainProjection(app.screen.width, app.screen.height);
      const groundLimit = () => {
        let limit = Infinity;
        for (let x = body.x - halfWidth; x <= body.x + halfWidth; x += 4) limit = Math.min(limit, projection.groundAt(x));
        return Math.min(limit, projection.groundAt(body.x + halfWidth));
      };
      const drawWorld = () => {
        ({ halfWidth, halfHeight } = bodyBounds(body));
        player.rotation = body.angle;
        const screenX = body.x - camera.x, screenY = body.y - camera.y;
        camera.x += screenX - Math.max(app.screen.width * 0.25 + halfWidth, Math.min(app.screen.width * 0.75 - halfWidth, screenX));
        camera.y += screenY - Math.max(app.screen.height * 0.2 + halfHeight, Math.min(app.screen.height * 0.75 - halfHeight, screenY));
        player.position.set(body.x - camera.x, body.y - camera.y);
        uniforms.uniforms.uCamera[0] = camera.x; uniforms.uniforms.uCamera[1] = camera.y;
        ground.clear();
        for (let x = 0; x <= app.screen.width + 4; x += 4) {
          const y = projection.groundAt(x + camera.x) - camera.y;
          if (x === 0) ground.moveTo(x,y); else ground.lineTo(x,y);
        }
        ground.stroke({width: 2, color: 0xdced70, alpha: 0.8});
        Object.assign(root.dataset, { shipX: String(player.x), shipY: String(player.y), shipBottom: String(player.y + halfHeight), groundY: String(groundLimit() - camera.y), worldX: String(body.x), worldY: String(body.y), cameraX: String(camera.x), cameraY: String(camera.y), velocityY: String(body.vy), velocityX: String(body.vx), angle: String(body.angle), angularVelocity: String(body.omega) });
      };
      const resize = () => {
        background.width = app.screen.width; background.height = app.screen.height;
        uniforms.uniforms.uResolution[0] = app.screen.width; uniforms.uniforms.uResolution[1] = app.screen.height;
        projection = terrainProjection(app.screen.width, app.screen.height);
        uniforms.uniforms.uWorldPerPixel = projection.worldPerPixel;
        const scale = Math.min(1, 320 / ship.width, 220 / ship.height, app.screen.width * 0.3 / ship.width, app.screen.height * 0.4 / ship.height);
        player.scale.set(scale); halfWidth = ship.width * scale / 2; halfHeight = ship.height * scale / 2;
        body.width = ship.width*scale; body.height = ship.height*scale;
        drawWorld();
      };
      resize(); app.renderer.on('resize', resize);
      app.ticker.add(ticker => {
        const dt = Math.min(ticker.deltaMS,100)/1000;
        elapsed += dt; uniforms.uniforms.uTime = elapsed;
        glitchTime += dt;
        if (glitchTime >= 0.18) { groundGlitch.refresh(); groundGlitch.seed = elapsed; glitchTime = 0; }
        const x = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
        const y = Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
        const turn = Number(keys.has('KeyE')) - Number(keys.has('KeyQ'));
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        for (let i = 0; i < steps; i++) stepFlight(body,{x,y,turn},dt/steps,projection.groundAt);
        drawWorld();
      });
      app.render(); // シェーダーのコンパイル失敗も起動時に検出する。
      root.dataset.generation = String(token);
      setPhase(phase);
      status.textContent = 'WASD: 推力 / Q・E: 回転 / R: リロード / 1・2・3: 時間帯切替';
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
