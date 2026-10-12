import { Application, Container, Graphics, Point, Filter, GlProgram, Sprite, Texture, UniformGroup } from 'pixi.js';
import { AdvancedBloomFilter, GlitchFilter } from 'pixi-filters';
import { createBattleShip } from './BattleShip.js';
import { terrainGLSL, terrainProjection } from './DesertTerrain.js';
import { flightControlPerformance, createFlightBody, bodyBounds, stepFlight } from './FlightPhysics.js';
import { shipStats } from './ShipStats.js';
import { allocateAmmo, gimbalAngle, assignWeaponGroups, weaponProfile, fireProjectile, stepProjectile, partOutline, touchesTerrain } from './CombatWeapons.js';
import { applyGroundDamage, terrainContactSpeed, mountedOnHull } from './BlockDurability.js';
import { createDestructionEffects } from './BattleDestruction.js';
import { disconnectedBlockIndices } from './ShipConnectivity.js';
import { phaseTint, illuminatedTint, createProjectileLights } from './ProjectileLight.js';
import { applyExplosionPush } from './BlastPhysics.js';
import { BATTLE_ZOOM, battleViewport } from './BattleView.js';
import { sweepShip, sweepTerrain } from './ProjectileCollision.js';
import { shipContacts, shipContactSpeed, resolveShipContact, shipCollisionDamage } from './ShipCollision.js';
import vertex from './shaders/desert.vert?raw';
import fragment from './shaders/desert.frag?raw';
import './battle.css';

/** 戦闘の背景描画。搭乗艦の移動と地面制限を管理する。 */
export async function createBattleScene(parent, { fleet, onBack }) {
  const root = document.createElement('section');
  root.className = 'battle-world';
  root.innerHTML = `<div class="battle-background"></div><div class="battle-hud"><div><strong>DESERT / AEROSPHERE</strong><p class="battle-boarding"></p><p class="battle-hp"></p><p class="battle-performance"></p></div><nav aria-label="背景の時間帯"><button data-phase="0">昼 [1]</button><button data-phase="1">夕方 [2]</button><button data-phase="2">夜 [3]</button><button class="battle-return">編成に戻る [Esc]</button></nav></div><p class="battle-debug" role="status">左: 大口径 / 右: 小口径 / WASD: 推力 / Q・E: 回転 / R: リロード</p>`;
  parent.appendChild(root);
  root.querySelector('.battle-boarding').textContent = `搭乗: ${fleet.boarding} / 自軍 1艦 / 敵軍 1艦`;
  const host = root.querySelector('.battle-background');
  const status = root.querySelector('.battle-debug');
  let app = null, filter = null, uniforms = null, phase = 0, generation = 0, dead = false, loading = false;
  let elapsed = 0, bloom = null, player = null, groundGlitch = null, aimGlitch = null;
  let destruction = null, projectileLights = null, enemy = null;
  let pointer = null;
  const mouseButtons = new Set();
  let fireAt = () => {};
  const keys = new Set();
  const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE']);
  const clearKeys = () => { keys.clear(); mouseButtons.clear(); };
  const visibility = () => { if (document.hidden) clearKeys(); };
  function disposeRenderer() {
    projectileLights?.destroy();projectileLights=null;
    destruction?.destroy(); destruction = null;
    fireAt = () => {};
    app?.destroy(true, { children: true });
    filter?.destroy();
    aimGlitch?.destroy(); aimGlitch = null;
    groundGlitch?.destroy(); groundGlitch = null;
    bloom?.destroy(); bloom = null; player = null; enemy=null; clearKeys();
    app = null; filter = null; uniforms = null;
  }
  function setPhase(value) {
    phase = value;
    const tint = phaseTint[value];
    for(const ship of [player,enemy?.container])if(ship)for(const sprite of ship.children)sprite.tint=tint;
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
      uniforms = new UniformGroup({ uResolution: { value: new Float32Array([app.screen.width, app.screen.height]), type: 'vec2<f32>' }, uTime: { value: 0, type: 'f32' }, uPhase: { value: phase, type: 'f32' }, uCamera: { value: new Float32Array([0,0]), type: 'vec2<f32>' }, uWorldPerPixel: { value: 1, type: 'f32' }, uZoom: {value:BATTLE_ZOOM,type:'f32'}, uLightCount:{value:0,type:'i32'}, uLights:{value:new Float32Array(24),type:'vec4<f32>',size:6} });
      filter = new Filter({ glProgram: GlProgram.from({ vertex, fragment: fragment.replace('/* TERRAIN_HEIGHT */', terrainGLSL), name: 'desert-background', preferredFragmentPrecision: 'highp' }), resources: { desertUniforms: uniforms }, padding: 0, resolution: 1 });
      const background = new Sprite(Texture.WHITE);
      bloom = new AdvancedBloomFilter({ threshold: 0.65, bloomScale: 0.18, brightness: 1, blur: 4, quality: 3 });
      background.filters = [filter, bloom];
      app.stage.addChild(background);
      const world=new Container();world.scale.set(BATTLE_ZOOM);app.stage.addChild(world);
      const view={get width(){return battleViewport(app.screen.width,app.screen.height).width;},get height(){return battleViewport(app.screen.width,app.screen.height).height;}};
      const ship = await createBattleShip(fleet.player.find(ship => ship.name === fleet.boarding));
      if (dead || token !== generation) { ship.container.destroy({ children: true }); return; }
      enemy=await createBattleShip(fleet.opposition[0]);
      if(dead||token!==generation){ship.container.destroy({children:true});enemy.container.destroy({children:true});return;}
      enemy.container.label='enemy-ship';
      const enemyPosition={x:view.width*.72,y:view.height*.42};
      const enemyMarker=new Graphics();
      root.dataset.enemyCount='1';root.dataset.playerCount='1';root.dataset.zoom=String(BATTLE_ZOOM);
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
      world.addChild(ground, groundNoise, enemy.container, enemyMarker, player, aim, aimNoise);
      let rotationMultiplier = 1;
      const projectiles = [], sparks = [];
      destruction = createDestructionEffects(world,BATTLE_ZOOM);
      const effects = new Graphics();
      world.addChild(effects);
      projectileLights=createProjectileLights(world);
      const weaponGroups=assignWeaponGroups(ship.entries.filter(entry=>entry.part.category==='GUN').map(entry=>entry.part.id));
      const alive = () => ship.entries.filter(entry=>!entry.destroyed);
      const stats = () => shipStats(alive().map(entry=>entry.block));
      const updateAim = dt => {
        aim.clear(); aimNoise.clear();
        aimNoise.visible = elapsed < flashUntil;
        aimNoise.alpha = 0.2 + Math.random()*0.4;
        if (!pointer || !alive().some(entry=>entry.part.category==='BRIDGE')) return;
        const dx = pointer.x/BATTLE_ZOOM - player.x, dy = pointer.y/BATTLE_ZOOM - player.y;
        const distance = Math.hypot(dx,dy);
        if (distance > 0.001) {
          const length = view.width * 0.2;
          for(const line of [aim,aimNoise]) line.moveTo(player.x,player.y).lineTo(player.x+dx/distance*length,player.y+dy/distance*length).stroke({width: 6,color: 0xffed65,alpha: 0.8});
          root.dataset.aimLength = String(length*BATTLE_ZOOM);
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
      const body = createFlightBody(view.width/2,view.height/2,ship.width,ship.height,shipStats(fleet.player.find(ship=>ship.name===fleet.boarding).blocks).mass);
      const camera = { x: 0, y: 0 };
      let projection = terrainProjection(view.width, view.height,BATTLE_ZOOM);
      const rebuildParts = () => {
        const live=alive(),scale=player.scale.x;
        const current=stats();
        if(current.mass>0) {
          const centerX=live.reduce((sum,e)=>sum+e.block.x*e.part.mass,0)/current.mass;
          const centerY=live.reduce((sum,e)=>sum+e.block.y*e.part.mass,0)/current.mass;
          const dx=(centerX-player.pivot.x)*scale,dy=(centerY-player.pivot.y)*scale,c=Math.cos(body.angle),s=Math.sin(body.angle);
          body.x+=c*dx-s*dy;body.y+=s*dx+c*dy;
          body.vx-=body.omega*(s*dx+c*dy);body.vy+=body.omega*(c*dx-s*dy);
          player.pivot.set(centerX,centerY);
        }
        for(const entry of live) entry.points=partOutline(entry.part,(entry.block.angle||0)*Math.PI/180,entry.block.x,entry.block.y,scale,player.pivot);
        body.collisionPoints=live.flatMap(entry=>entry.points);
        const xs=body.collisionPoints.map(p=>Math.abs(p.x)),ys=body.collisionPoints.map(p=>Math.abs(p.y));
        body.width=Math.max(2,...xs)*2;body.height=Math.max(2,...ys)*2;
        body.mass=Math.max(1,current.mass);rotationMultiplier=current.rotationMultiplier;
        body.inertia=Math.max(1,live.reduce((sum,e)=>{const x=(e.block.x-player.pivot.x)*scale,y=(e.block.y-player.pivot.y)*scale,w=e.part.width*64*scale,h=e.part.height*64*scale;return sum+e.part.mass*(x*x+y*y+(w*w+h*h)/12);},0));
        Object.assign(body,flightControlPerformance(current,body.inertia));
        const engines=live.filter(e=>e.part.category==='ENGINE');
        body.autonomousThrust=null;
        body.ballistic=engines.length===0;
        if(engines.length===1 && live.some(e=>e.part.category==='BRIDGE')) {
          const engine=engines[0],angle=(engine.block.angle||0)*Math.PI/180;
          const ax=Math.sin(angle)*body.thrustAcceleration,ay=-Math.cos(angle)*body.thrustAcceleration;
          const rx=(engine.block.x-player.pivot.x)*scale,ry=(engine.block.y-player.pivot.y)*scale;
          body.autonomousThrust={x:ax,y:ay,torque:(rx*ay-ry*ax)*body.mass/body.inertia};
          status.textContent='ロケット残り1基 / 操作不能 / Rで復元';
        }
        root.dataset.uncontrolled=String(engines.length===1);
        const ammoEnabled=allocateAmmo(live.filter(e=>e.part.category==='GUN'),current.ammo);
        for(const [entry,enabled] of ammoEnabled){entry.fireEnabled=enabled;entry.sprite.alpha=enabled?1:.55;}
        root.dataset.gunEnabled=JSON.stringify([...ammoEnabled].map(([e,enabled])=>({id:e.part.id,enabled})));
        root.dataset.shipStats=JSON.stringify(current);
        const power=current.powerDemand>0?Math.round(current.powerSupply/current.powerDemand*100):100;
        const population=current.populationDemand>0?Math.round(current.populationSupply/current.populationDemand*100):100;
        root.querySelector('.battle-performance').textContent=`MASS ${current.mass} / THRUST ${current.thrust} / FUEL ${current.fuel} / AMMO ${current.ammo} / POWER ${power}% / POPULATION ${population}%`;
        root.dataset.blocksRemaining=String(live.length);
      };
      fireAt = group => {
        if(!pointer || !alive().some(entry=>entry.part.category==='BRIDGE')) return;
        for(const entry of alive().filter(entry=>entry.part.category==='GUN' && entry.fireEnabled)) {
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
          for(let i=0;i<profile.count && projectiles.length<256;i++) projectiles.push({...fireProjectile(x,y,angle,{x:body.vx-body.omega*(y-body.y),y:body.vy+body.omega*(x-body.x)},profile),owner:'player'});
          sparks.push({x,y,life:.08,color:0xffe595});
        }
        root.dataset.projectileCount=String(projectiles.length);
        root.dataset.lastFireGroup=group;
      };
      const enemyBody={...enemyPosition,angle:0,vx:0,vy:0,omega:0};
      const targets=[
        {id:'player',entries:ship.entries,pose:body,container:player},
        {id:'enemy',entries:enemy.entries,pose:enemyBody,container:enemy.container},
      ];
      const destroyEntry = (entry,target=targets[0]) => {
        if(entry.destroyed)return;
        const pose=target.pose,container=target.container,live=()=>target.entries.filter(e=>!e.destroyed);
        destruction.spawn(entry,pose,container.scale.x,container.pivot);
        entry.hp=0;entry.destroyed=true;
        if(target.id==='player'&&['FUEL','GUN','AMMO','ENGINE'].includes(entry.part.category)) {
          const c=Math.cos(body.angle),s=Math.sin(body.angle),scale=player.scale.x;
          const lx=(entry.block.x-player.pivot.x)*scale,ly=(entry.block.y-player.pivot.y)*scale;
          const remaining=live(),mass=remaining.reduce((sum,e)=>sum+e.part.mass,0);
          if(mass>0) {
            const mx=(remaining.reduce((sum,e)=>sum+e.block.x*e.part.mass,0)/mass-player.pivot.x)*scale;
            const my=(remaining.reduce((sum,e)=>sum+e.block.y*e.part.mass,0)/mass-player.pivot.y)*scale;
            applyExplosionPush(body,body.x+c*lx-s*ly,body.y+s*lx+c*ly,{x:body.x+c*mx-s*my,y:body.y+s*mx+c*my,mass});
          }
        }
        entry.sprite.destroy({children:true});
        if(entry.part.category==='HULL')for(const mounted of live())if(mountedOnHull(mounted,entry))destroyEntry(mounted,target);
      };
      const removeDisconnected = target => {
        const live=target.entries.filter(e=>!e.destroyed);
        for(const index of disconnectedBlockIndices(live.map(e=>e.block)))destroyEntry(live[index],target);
        if(target.id==='player') {
          const pivotX=player.pivot.x,pivotY=player.pivot.y;
          rebuildParts();
          if(target.previous) {
            const dx=(player.pivot.x-pivotX)*player.scale.x,dy=(player.pivot.y-pivotY)*player.scale.x,c=Math.cos(target.previous.angle),s=Math.sin(target.previous.angle);
            target.previous.x+=c*dx-s*dy;target.previous.y+=s*dx+c*dy;
          }
          if(!alive().some(e=>e.part.category==='BRIDGE')){mouseButtons.clear();status.textContent='BRIDGE破壊 / Rで機体を復元';}
        } else root.dataset.enemyStats=JSON.stringify(shipStats(target.entries.filter(e=>!e.destroyed).map(e=>e.block)));
      };
      const damageGround = (dt,checkConnectivity=false) => {
        const hits=alive().filter(entry=>touchesTerrain(entry.points,body,projection.groundAt));
        for(const entry of alive())if(!hits.includes(entry))entry.touching=false;
        let changed=false;
        for(const entry of hits) {
          if(entry.destroyed)continue;
          const contact=terrainContactSpeed(entry.points,body,projection.groundAt);
          if(applyGroundDamage(entry,dt,contact.speed,contact.impact)){destroyEntry(entry);changed=true;}
        }
        if(changed||checkConnectivity)removeDisconnected(targets[0]);
      };
      let previousContacts=new Set();
      const collideShips = dt => {
        const reach=Math.hypot(body.width,body.height)/2+Math.hypot(enemy.width,enemy.height)*enemy.container.scale.x/2;
        if(Math.hypot(body.x-enemyBody.x,body.y-enemyBody.y)>reach+1){previousContacts.clear();root.dataset.shipContacts='0';return;}
        for(const target of targets){target.scale=target.container.scale.x;target.pivot=target.container.pivot;}
        const hits=shipContacts(targets[0],targets[1]),nextContacts=new Set(hits.map(hit=>hit.key)),damage=new Map();
        for(const hit of hits) {
          const {speed,closing}=shipContactSpeed(hit,body,enemyBody),impact=previousContacts.has(hit.key)?0:closing;
          for(const [entry,target] of [[hit.a,targets[0]],[hit.b,targets[1]]]) {
            const old=damage.get(entry)??{speed:0,impact:0,target};
            old.speed=Math.max(old.speed,speed);old.impact=Math.max(old.impact,impact);damage.set(entry,old);
          }
        }
        previousContacts=nextContacts;
        // 同じ位置に重なる装備で反力・損傷を重複加算しない。
        const deepest=hits.reduce((best,hit)=>!best||hit.depth>best.depth?hit:best,null);
        if(deepest)resolveShipContact(body,deepest);
        const changed=new Set();
        for(const [entry,contact] of damage)if(!entry.destroyed&&shipCollisionDamage(entry,dt,contact.speed,contact.impact)) {
          destroyEntry(entry,contact.target);changed.add(contact.target);
        }
        for(const target of changed)removeDisconnected(target);
        root.dataset.shipContacts=String(hits.length);
        if(hits.length)root.dataset.shipCollisionCount=String(Number(root.dataset.shipCollisionCount??0)+1);
      };
      const stepShots = dt => {
        for(let i=projectiles.length-1;i>=0;i--) {
          const shot=projectiles[i],start={x:shot.x,y:shot.y};
          stepProjectile(shot,dt,()=>Infinity);
          let hit=sweepTerrain(start,shot,projection.groundAt);
          for(const target of targets) {
            if(target.id===shot.owner)continue;
            target.scale=target.container.scale.x;target.pivot=target.container.pivot;
            const contact=sweepShip(start,shot,target);
            if(contact&&(!hit||contact.t<hit.t))hit=contact;
          }
          if(hit) {
            destruction.impact(hit.x,hit.y);
            if(hit.entry) {
              hit.entry.hp=Math.max(0,hit.entry.hp-shot.damage);
              root.dataset[hit.target.id+'Hits']=String(Number(root.dataset[hit.target.id+'Hits']??0)+1);
              if(hit.entry.hp<=0){destroyEntry(hit.entry,hit.target);removeDisconnected(hit.target);}
            }
            projectiles.splice(i,1);
          } else if(shot.life<=0)projectiles.splice(i,1);
        }
      };
      const updateHp = () => {
        const hpEntries=alive();
        root.querySelector('.battle-hp').textContent=`HP ${Math.ceil(hpEntries.reduce((sum,e)=>sum+e.hp,0))} / ${ship.entries.reduce((sum,e)=>sum+e.maxHp,0)}`;
        root.dataset.blockHp=JSON.stringify(alive().map(entry=>({id:entry.part.id,hp:entry.hp,maxHp:entry.maxHp})));
        const enemyLive=enemy.entries.filter(e=>!e.destroyed);
        root.dataset.enemyHp=String(enemyLive.reduce((sum,e)=>sum+e.hp,0));
        root.dataset.enemyBlocksRemaining=String(enemyLive.length);
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
        camera.x += screenX - Math.max(view.width * 0.25 + halfWidth, Math.min(view.width * 0.75 - halfWidth, screenX));
        camera.y += screenY - Math.max(view.height * 0.2 + halfHeight, Math.min(view.height * 0.75 - halfHeight, screenY));
        player.position.set(body.x - camera.x, body.y - camera.y);
        enemy.container.position.set(enemyPosition.x-camera.x,enemyPosition.y-camera.y);
        enemyMarker.visible=enemy.entries.some(entry=>!entry.destroyed);
        const ew=enemy.width*enemy.container.scale.x/2,eh=enemy.height*enemy.container.scale.y/2;
        enemyMarker.clear().moveTo(enemy.container.x-ew-15,enemy.container.y-eh).lineTo(enemy.container.x-ew-15,enemy.container.y+eh).moveTo(enemy.container.x+ew+15,enemy.container.y-eh).lineTo(enemy.container.x+ew+15,enemy.container.y+eh).stroke({width:5,color:0xe34b4b,alpha:.9});
        Object.assign(root.dataset,{enemyWorldY:String(enemyPosition.y),enemyX:String(enemy.container.x*BATTLE_ZOOM),enemyY:String(enemy.container.y*BATTLE_ZOOM)});
        uniforms.uniforms.uCamera[0] = camera.x; uniforms.uniforms.uCamera[1] = camera.y*BATTLE_ZOOM;
        for(const line of [ground,groundNoise]) {
          line.clear();
          for(let x=0;x<=view.width+20;x+=20) {
            const y=projection.groundAt(x+camera.x)-camera.y;
            if(x===0)line.moveTo(x,y);else line.lineTo(x,y);
          }
          line.stroke({width:6,color:0xdced70,alpha:0.8});
        }
        Object.assign(root.dataset, { shipX: String(player.x*BATTLE_ZOOM), shipY: String(player.y*BATTLE_ZOOM), shipBottom: String((player.y + halfHeight)*BATTLE_ZOOM), groundY: String((groundLimit() - camera.y)*BATTLE_ZOOM), worldX: String(body.x), worldY: String(body.y), cameraX: String(camera.x), cameraY: String(camera.y), velocityY: String(body.vy), velocityX: String(body.vx), angle: String(body.angle), angularVelocity: String(body.omega) });
      };
      const resize = () => {
        background.width = app.screen.width; background.height = app.screen.height;
        uniforms.uniforms.uResolution[0] = app.screen.width; uniforms.uniforms.uResolution[1] = app.screen.height;
        projection = terrainProjection(view.width, view.height,BATTLE_ZOOM);
        uniforms.uniforms.uWorldPerPixel = projection.worldPerPixel;
        const scale = Math.min(1, 320 / ship.width, 220 / ship.height, app.screen.width * 0.3 / ship.width, app.screen.height * 0.4 / ship.height);
        enemy.container.scale.set(Math.min(1,320/enemy.width,220/enemy.height));
        player.scale.set(scale); halfWidth = ship.width * scale / 2; halfHeight = ship.height * scale / 2;
        rebuildParts();
        damageGround(0,true);
        drawWorld();
      };
      resize(); removeDisconnected(targets[1]); app.renderer.on('resize', resize);
      root.dataset.playerHits='0';root.dataset.enemyHits='0';root.dataset.shipCollisionCount='0';root.dataset.shipContacts='0';
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
        const travel=(Math.hypot(body.vx,body.vy)+(body.thrustAcceleration+80)*dt+Math.abs(body.omega)*Math.hypot(body.width,body.height)/2)*dt;
        const steps = Math.max(1, Math.ceil(dt / (1 / 120)), Math.ceil(travel/4));
        for (let i = 0; i < steps; i++) {
          const previous={x:body.x,y:body.y,angle:body.angle,pivotX:player.pivot.x,pivotY:player.pivot.y};
          if(alive().length) { const active=alive().some(entry=>entry.part.category==='BRIDGE') && !body.autonomousThrust; stepFlight(body,active?{x,y,turn}:{x:0,y:0,turn:0},dt/steps,projection.groundAt); damageGround(dt/steps); }
          collideShips(dt/steps);
          destruction.step(dt/steps,projection.groundAt);
          const dx=(player.pivot.x-previous.pivotX)*player.scale.x,dy=(player.pivot.y-previous.pivotY)*player.scale.x,c=Math.cos(previous.angle),s=Math.sin(previous.angle);
          targets[0].previous={x:previous.x+c*dx-s*dy,y:previous.y+s*dx+c*dy,angle:previous.angle};
          stepShots(dt/steps);
        }
        for(let i=sparks.length-1;i>=0;i--) {sparks[i].life-=dt;if(sparks[i].life<=0)sparks.splice(i,1);}
        drawWorld();
        updateAim(dt);
        for(const entry of alive().filter(entry=>entry.part.engineType==='gimballed')) {
          if(body.autonomousThrust){entry.sprite.rotation=(entry.block.angle||0)*Math.PI/180;continue;}
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
        projectileLights.draw(projectiles,camera,view.width,view.height,phase);
        const c=Math.cos(body.angle),s=Math.sin(body.angle),explosionLights=destruction.lights;
        for(const entry of alive()) {
          const x=(entry.block.x-player.pivot.x)*player.scale.x,y=(entry.block.y-player.pivot.y)*player.scale.x;
          entry.sprite.tint=illuminatedTint(phaseTint[phase],body.x+c*x-s*y,body.y+s*x+c*y,projectiles,phase,explosionLights);
        }
        for(const entry of enemy.entries.filter(e=>!e.destroyed)) {
          const x=(entry.block.x-enemy.container.pivot.x)*enemy.container.scale.x,y=(entry.block.y-enemy.container.pivot.y)*enemy.container.scale.x;
          entry.sprite.tint=illuminatedTint(phaseTint[phase],enemyPosition.x+x,enemyPosition.y+y,projectiles,phase,explosionLights);
        }
        const lights=[...explosionLights,...projectiles.map(shot=>({x:shot.x,y:shot.y,radius:400,intensity:.5}))]
          .filter(light=>light.x+light.radius>camera.x&&light.x-light.radius<camera.x+view.width)
          .sort((a,b)=>b.intensity/(1+Math.abs(b.y-projection.groundAt(b.x))/b.radius)-a.intensity/(1+Math.abs(a.y-projection.groundAt(a.x))/a.radius)).slice(0,6);
        uniforms.uniforms.uLights.fill(0);
        lights.forEach((light,i)=>uniforms.uniforms.uLights.set(projection.projectLight(light),i*4));
        uniforms.uniforms.uLightCount=lights.length;root.dataset.groundLights=String(lights.length);
        root.dataset.litBlocks=String(alive().filter(e=>e.sprite.tint!==phaseTint[phase]).length);
        Object.assign(root.dataset,{debrisCount:String(destruction.counts.debris),flameCount:String(destruction.counts.flames),smokeCount:String(destruction.counts.smoke)});
      });
      app.render(); // シェーダーのコンパイル失敗も起動時に検出する。
      root.dataset.generation = String(token);
      setPhase(phase);
      status.textContent = body.autonomousThrust ? 'ロケット残り1基 / 操作不能 / Rで復元' : '左: 大口径 / 右: 小口径 / WASD: 推力 / Q・E: 回転 / R: リロード';
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
  return { get fps(){return app&&!loading?app.ticker.FPS:null;}, destroy() { dead = true; generation++; root.removeEventListener('pointerdown',pointerdown); window.removeEventListener('pointerup',pointerup); root.removeEventListener('pointermove', pointermove); root.removeEventListener('pointerleave', pointerleave); root.removeEventListener('contextmenu', contextmenu); window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup); window.removeEventListener('blur', clearKeys); document.removeEventListener('visibilitychange', visibility); disposeRenderer(); root.remove(); } };
}
