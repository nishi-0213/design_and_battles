import { Application, Graphics, Point, Filter, GlProgram, Sprite, Texture, UniformGroup } from 'pixi.js';
import { AdvancedBloomFilter, GlitchFilter } from 'pixi-filters';
import { createBattleShip } from './BattleShip.js';
import { terrainGLSL, terrainProjection } from './DesertTerrain.js';
import { createFlightBody, bodyBounds, stepFlight } from './FlightPhysics.js';
import { shipStats } from './ShipStats.js';
import { gimbalAngle, assignWeaponGroups, weaponProfile, fireProjectile, stepProjectile, partOutline, touchesTerrain } from './CombatWeapons.js';
import { applyGroundDamage } from './BlockDurability.js';
import { createDestructionEffects } from './BattleDestruction.js';
import vertex from './shaders/desert.vert?raw';
import fragment from './shaders/desert.frag?raw';
import './battle.css';

/** 戦闘の背景描画。搭乗艦の移動と地面制限を管理する。 */
export async function createBattleScene(parent, { fleet, onBack }) {
  const root = document.createElement('section');
  root.className = 'battle-world';
  root.innerHTML = `<div class="battle-background"></div><div class="battle-hud"><div><strong>DESERT / AEROSPHERE</strong><p class="battle-boarding"></p><p class="battle-hp"></p></div><nav aria-label="背景の時間帯"><button data-phase="0">昼 [1]</button><button data-phase="1">夕方 [2]</button><button data-phase="2">夜 [3]</button><button class="battle-return">編成に戻る [Esc]</button></nav></div><p class="battle-debug" role="status">左: 大口径 / 右: 小口径 / WASD: 推力 / Q・E: 回転 / R: リロード</p>`;
  parent.appendChild(root);
  root.querySelector('.battle-boarding').textContent = `搭乗: ${fleet.boarding} / 自軍 ${fleet.player.length}艦 / 敵軍 ${fleet.opposition.length}艦`;
  const host = root.querySelector('.battle-background');
  const status = root.querySelector('.battle-debug');
  let app = null, filter = null, uniforms = null, phase = 0, generation = 0, dead = false, loading = false;
  let elapsed = 0, bloom = null, player = null, groundGlitch = null, aimGlitch = null;
  let destruction = null;
  let pointer = null;
  const mouseButtons = new Set();
  let fireAt = () => {};
  const keys = new Set();
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE']);
  const clearKeys = () => { keys.clear(); mouseButtons.clear(); };
  const visibility = () => { if (document.hidden) clearKeys(); };
  function disposeRenderer() {
    destruction?.destroy(); destruction = null;
    fireAt = () => {};
    app?.destroy(true, { children: true });
    filter?.destroy();
    aimGlitch?.destroy(); aimGlitch = null;
    groundGlitch?.destroy(); groundGlitch = null;
    bloom?.destroy(); bloom = null; player = null; clearKeys();
    app = null; filter = null; uniforms = null;
  }
  function setPhase(value) {
    phase = value;
    const tint = [0xffffff,0xf4c8ae,0xadbdd2][value];
    if(player) for(const sprite of player.children) sprite.tint=tint;
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
      const groundNoise = new Graphics();
      groundNoise.filters = [groundGlitch];
      groundNoise.visible = false;
      let glitchTime = 0, nextGlitch = .3 + Math.random()*.6, flashUntil = 0;
      const aim = new Graphics();
      aimGlitch = new GlitchFilter({ slices: 5, offset: 0.7, direction: 0, red: {x: 0.2,y: 0}, green: {x: -0.2,y: 0} });
      const aimNoise = new Graphics();
      aimNoise.filters = [aimGlitch];
      aimNoise.visible = false;
      app.stage.addChild(ground, groundNoise, player, aim, aimNoise);
      let rotationMultiplier = 1;
      const projectiles = [], sparks = [];
      destruction = createDestructionEffects(app.stage);
      const effects = new Graphics();
      app.stage.addChild(effects);
      const weaponGroups=assignWeaponGroups(ship.entries.filter(entry=>entry.part.category==='GUN').map(entry=>entry.part.id));
      const alive = () => ship.entries.filter(entry=>!entry.destroyed);
      const stats = () => shipStats(alive().map(entry=>entry.block));
      const updateAim = dt => {
        aim.clear(); aimNoise.clear();
        aimNoise.visible = elapsed < flashUntil;
        aimNoise.alpha = 0.2 + Math.random()*0.4;
        if (!pointer || !alive().some(entry=>entry.part.category==='BRIDGE')) return;
        const dx = pointer.x - player.x, dy = pointer.y - player.y;
        const distance = Math.hypot(dx,dy);
        if (distance > 0.001) {
          const length = app.screen.width * 0.2;
          for(const line of [aim,aimNoise]) line.moveTo(player.x,player.y).lineTo(player.x+dx/distance*length,player.y+dy/distance*length).stroke({width: 6,color: 0xffed65,alpha: 0.8});
          root.dataset.aimLength = String(length);
        }
        const local = player.toLocal(new Point(pointer.x,pointer.y));
        for (const gun of ship.guns.filter(gun=>!gun.destroyed)) {
          const x = local.x - gun.x, y = local.y - gun.y;
          if (Math.hypot(x,y)<0.001) continue;
          const target = Math.atan2(y,x)+Math.PI/2; // 砲身画像の正位置は上向き。
          const delta = Math.atan2(Math.sin(target-gun.rotation),Math.cos(target-gun.rotation));
          const limit = Math.PI * 5 * Math.max(0.2, rotationMultiplier) * dt;
          gun.rotation += Math.max(-limit,Math.min(limit,delta));
        }
        root.dataset.gunAngles = JSON.stringify(ship.guns.filter(gun=>!gun.destroyed).map(gun=>gun.rotation));
      };
      let halfWidth = 0, halfHeight = 0;
      const body = createFlightBody(app.screen.width/2,app.screen.height/2,ship.width,ship.height,shipStats(fleet.player.find(ship=>ship.name===fleet.boarding).blocks).mass);
      const camera = { x: 0, y: 0 };
      let projection = terrainProjection(app.screen.width, app.screen.height);
      const rebuildParts = () => {
        const live=alive(),scale=player.scale.x;
        for(const entry of live) entry.points=partOutline(entry.part,(entry.block.angle||0)*Math.PI/180,entry.block.x,entry.block.y,scale,player.pivot);
        body.collisionPoints=live.flatMap(entry=>entry.points);
        const xs=body.collisionPoints.map(p=>Math.abs(p.x)),ys=body.collisionPoints.map(p=>Math.abs(p.y));
        body.width=Math.max(2,...xs)*2;body.height=Math.max(2,...ys)*2;
        const current=stats();body.mass=Math.max(1,current.mass);rotationMultiplier=current.rotationMultiplier;
        root.dataset.blocksRemaining=String(live.length);
      };
      fireAt = group => {
        if(!pointer || !alive().some(entry=>entry.part.category==='BRIDGE')) return;
        for(const entry of alive().filter(entry=>entry.part.category==='GUN')) {
          const profile={...weaponProfile(entry.part.id),group:weaponGroups.get(entry.part.id)};
          if(profile.group!==group || elapsed<entry.nextShot) continue;
          entry.nextShot=elapsed+profile.cooldown;
          const gun=entry.sprite,scale=player.scale.x;
          const localX=(gun.x-player.pivot.x)*scale,localY=(gun.y-player.pivot.y)*scale;
          const c=Math.cos(body.angle),s=Math.sin(body.angle);
          const angle=body.angle+gun.rotation-Math.PI/2;
          const barrel=entry.part.height*64*scale*.45;
          const x=body.x+c*localX-s*localY+Math.cos(angle)*barrel;
          const y=body.y+s*localX+c*localY+Math.sin(angle)*barrel;
          for(let i=0;i<profile.count && projectiles.length<256;i++) projectiles.push(fireProjectile(x,y,angle,{x:body.vx-body.omega*(y-body.y),y:body.vy+body.omega*(x-body.x)},profile));
          sparks.push({x,y,life:.08,color:0xffe595});
        }
        root.dataset.projectileCount=String(projectiles.length);
        root.dataset.lastFireGroup=group;
      };
      const damageGround = dt => {
        const hits=alive().filter(entry=>touchesTerrain(entry.points,body,projection.groundAt));
        let changed=false;
        for(const entry of hits) {
          if(!applyGroundDamage(entry,dt))continue;
          destruction.spawn(entry,body,player.scale.x,player.pivot);
          entry.destroyed=true;changed=true;
          entry.sprite.destroy({children:true});
        }
        if(changed) { rebuildParts(); if(!alive().some(entry=>entry.part.category==='BRIDGE')) { mouseButtons.clear();status.textContent='BRIDGE破壊 / Rで機体を復元'; } }
      };
      const updateHp = () => {
        const hpEntries=alive();
        root.querySelector('.battle-hp').textContent=`HP ${Math.ceil(hpEntries.reduce((sum,e)=>sum+e.hp,0))} / ${ship.entries.reduce((sum,e)=>sum+e.maxHp,0)}`;
        root.dataset.blockHp=JSON.stringify(alive().map(entry=>({id:entry.part.id,hp:entry.hp,maxHp:entry.maxHp})));
      };
      const drawEffects = () => {
        effects.clear();
        for(const shot of projectiles) effects.moveTo(shot.x-camera.x-shot.vx*.012,shot.y-camera.y-shot.vy*.012).lineTo(shot.x-camera.x,shot.y-camera.y).stroke({width:shot.group==='small'?6:9,color:0xffda63});
        for(const spark of sparks) effects.circle(spark.x-camera.x,spark.y-camera.y,Math.max(2,spark.life*35)).fill({color:spark.color,alpha:Math.min(1,spark.life*8)});
        root.dataset.projectileCount=String(projectiles.length);
      };
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
        for(const line of [ground,groundNoise]) {
          line.clear();
          for(let x=0;x<=app.screen.width+4;x+=4) {
            const y=projection.groundAt(x+camera.x)-camera.y;
            if(x===0)line.moveTo(x,y);else line.lineTo(x,y);
          }
          line.stroke({width:6,color:0xdced70,alpha:0.8});
        }
        Object.assign(root.dataset, { shipX: String(player.x), shipY: String(player.y), shipBottom: String(player.y + halfHeight), groundY: String(groundLimit() - camera.y), worldX: String(body.x), worldY: String(body.y), cameraX: String(camera.x), cameraY: String(camera.y), velocityY: String(body.vy), velocityX: String(body.vx), angle: String(body.angle), angularVelocity: String(body.omega) });
      };
      const resize = () => {
        background.width = app.screen.width; background.height = app.screen.height;
        uniforms.uniforms.uResolution[0] = app.screen.width; uniforms.uniforms.uResolution[1] = app.screen.height;
        projection = terrainProjection(app.screen.width, app.screen.height);
        uniforms.uniforms.uWorldPerPixel = projection.worldPerPixel;
        const scale = Math.min(1, 320 / ship.width, 220 / ship.height, app.screen.width * 0.3 / ship.width, app.screen.height * 0.4 / ship.height);
        player.scale.set(scale); halfWidth = ship.width * scale / 2; halfHeight = ship.height * scale / 2;
        rebuildParts();
        drawWorld();
      };
      resize(); app.renderer.on('resize', resize);
      app.ticker.add(ticker => {
        const dt = Math.min(ticker.deltaMS,100)/1000;
        elapsed += dt; uniforms.uniforms.uTime = elapsed;
        glitchTime += dt;
        if (glitchTime >= nextGlitch) {
          groundGlitch.refresh(); groundGlitch.seed=elapsed; aimGlitch.refresh(); aimGlitch.seed=elapsed;
          flashUntil=elapsed+.04+Math.random()*.1; glitchTime=0; nextGlitch=.25+Math.random()*.9;
        }
        groundNoise.visible=elapsed<flashUntil;
        groundNoise.alpha=.2+Math.random()*.4;
        const x = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
        const y = Number(keys.has('KeyS')) - Number(keys.has('KeyW'));
        const turn = Number(keys.has('KeyE')) - Number(keys.has('KeyQ'));
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
        for (let i = 0; i < steps; i++) {
          if(alive().length) { const active=alive().some(entry=>entry.part.category==='BRIDGE'); stepFlight(body,active?{x,y,turn}:{x:0,y:0,turn:0},dt/steps,projection.groundAt); damageGround(dt/steps); }
          destruction.step(dt/steps,projection.groundAt);
          for(let j=projectiles.length-1;j>=0;j--) if(!stepProjectile(projectiles[j],dt/steps,projection.groundAt)) { const shot=projectiles.splice(j,1)[0]; if(shot.life>0)sparks.push({x:shot.x,y:projection.groundAt(shot.x),life:.15,color:0xffad43}); }
        }
        for(let i=sparks.length-1;i>=0;i--) {sparks[i].life-=dt;if(sparks[i].life<=0)sparks.splice(i,1);}
        drawWorld();
        updateAim(dt);
        for(const entry of alive().filter(entry=>entry.part.engineType==='gimballed')) {
          const target=gimbalAngle(body.vx,body.vy,body.angle);
          const delta=Math.atan2(Math.sin(target-entry.sprite.rotation),Math.cos(target-entry.sprite.rotation));
          const limit=Math.PI*2*dt;
          entry.sprite.rotation+=Math.max(-limit,Math.min(limit,delta));
        }
        root.dataset.engineAngles=JSON.stringify(alive().filter(entry=>entry.part.engineType==='gimballed').map(entry=>entry.sprite.rotation));
        if(mouseButtons.has(0)) fireAt('large');
        if(mouseButtons.has(2)) fireAt('small');
        drawEffects();
        updateHp();
        destruction.draw(camera);
        Object.assign(root.dataset,{debrisCount:String(destruction.counts.debris),flameCount:String(destruction.counts.flames),smokeCount:String(destruction.counts.smoke)});
      });
      app.render(); // シェーダーのコンパイル失敗も起動時に検出する。
      root.dataset.generation = String(token);
      setPhase(phase);
      status.textContent = '左: 大口径 / 右: 小口径 / WASD: 推力 / Q・E: 回転 / R: リロード';
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
  const pointermove = event => {
    const rect = root.getBoundingClientRect();
    pointer = {x:event.clientX-rect.left,y:event.clientY-rect.top};
  };
  const pointerleave = () => { pointer = null; mouseButtons.clear(); };
  const pointerdown = event => {
    if(!event.target.closest('.battle-background') || ![0,2].includes(event.button)) return;
    event.preventDefault(); pointermove(event); mouseButtons.add(event.button); fireAt(event.button===0?'large':'small');
  };
  const pointerup = event => mouseButtons.delete(event.button);
  const contextmenu = event => { if (event.target.closest('.battle-background')) event.preventDefault(); };
  root.addEventListener('pointerdown',pointerdown);
  window.addEventListener('pointerup',pointerup);
  root.addEventListener('pointermove', pointermove);
  root.addEventListener('pointerleave', pointerleave);
  root.addEventListener('contextmenu', contextmenu);
  const keyup = event => keys.delete(event.code);
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', clearKeys);
  document.addEventListener('visibilitychange', visibility);
  await reload();
  return { destroy() { dead = true; generation++; root.removeEventListener('pointerdown',pointerdown); window.removeEventListener('pointerup',pointerup); root.removeEventListener('pointermove', pointermove); root.removeEventListener('pointerleave', pointerleave); root.removeEventListener('contextmenu', contextmenu); window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', clearKeys); document.removeEventListener('visibilitychange', visibility); disposeRenderer(); root.remove(); } };
}
