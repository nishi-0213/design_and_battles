import test from 'node:test';import assert from 'node:assert/strict';
import {allocateAmmo,assignWeaponGroups,fireProjectile,stepProjectile,partOutline,touchesTerrain,gimbalAngle} from '../CombatWeapons.js';
const ids=['gun-AK-200','gun-24-K','gun-AK-82','gun-A-100','gun-AK-130','gun-AK-130-6'];
test('click groups split installed types with odd middle on right',()=>{
 for(let n=2;n<=6;n++) {const g=assignWeaponGroups(ids.slice(0,n).reverse());assert.equal([...g.values()].filter(v=>v==='small').length,Math.ceil(n/2));assert.equal(g.get(ids[n-1]),'large');}
 assert.equal(assignWeaponGroups([ids[0]]).get(ids[0]),'large');assert.equal(assignWeaponGroups([ids[0],ids[0],ids[1]]).size,2);
});
test('shell inherits velocity, curves under gravity and hits ground',()=>{
 const shot=fireProjectile(0,0,0,{x:20,y:0},{speed:800,spread:.02,group:'large'},()=>.5);assert.equal(shot.vx,820);
 assert.equal(stepProjectile(shot,.1,()=>1000),true);assert.equal(shot.vy,8);assert.ok(shot.y>0);
 assert.equal(stepProjectile(shot,1,()=>10),false);
});
test('part contact uses rotated outlines and triangle transparency',()=>{
 const part={id:'1x1',width:1,height:1};const p=partOutline(part,0,0,0,1,{x:0,y:0});assert.equal(touchesTerrain(p,{x:0,y:0,angle:0},()=>100),false);assert.equal(touchesTerrain(p,{x:0,y:70,angle:0},()=>100),true);
 assert.ok(partOutline({...part,id:'1x1half'},0,0,0,1,{x:0,y:0}).length<p.length);
});

test('gimballed nozzle points opposite velocity in ship coordinates',()=>{
 const right=gimbalAngle(100,0,0);assert.ok(Math.abs(Math.sin(right)-1)<1e-6);
 const left=gimbalAngle(-100,0,0);assert.ok(Math.abs(Math.sin(left)+1)<1e-6);
 assert.equal(gimbalAngle(0,0,1),0);
 const rotated=gimbalAngle(0,100,Math.PI/2);assert.ok(Math.abs(Math.sin(rotated)-1)<1e-6);
});

test('ammo capacity disables larger guns before smaller ones',()=>{
 const entries=[{part:{id:'gun-AK-130',ammoConsumption:4}},{part:{id:'gun-AK-200',ammoConsumption:1}},{part:{id:'gun-AK-82',ammoConsumption:2}}];
 const full=allocateAmmo(entries,7);assert.ok([...full.values()].every(Boolean));
 const low=allocateAmmo(entries,3);assert.equal(low.get(entries[0]),false);assert.equal(low.get(entries[1]),true);assert.equal(low.get(entries[2]),true);
 assert.ok([...allocateAmmo(entries,0).values()].every(v=>!v));
});
test('RBU rocket accelerates with white-trail history, fivefold damage and fourfold blast',async()=>{
 const {weaponProfile,predictProjectile}=await import('../CombatWeapons.js');const profile=weaponProfile('gun-RBU-4200');assert.equal(profile.damage,weaponProfile('gun-AK-130').damage*5);assert.equal(profile.impactScale,4);assert.equal(profile.blastRadius,200);
 const rocket=fireProjectile(0,0,0,{x:0,y:0},profile,()=>.5),initial=rocket.vx;for(let i=0;i<120;i++)stepProjectile(rocket,1/120,()=>10000);assert.ok(Math.abs(rocket.vx-initial-500)<1e-6);assert.ok(rocket.trail.length>1&&rocket.trail.length<=24);
 const points=predictProjectile(0,0,0,{x:0,y:0},profile,()=>10000,1000);const actual=fireProjectile(0,0,0,{x:0,y:0},profile,()=>.5);for(let i=1;i<points.length;i++)stepProjectile(actual,1/60,()=>10000);assert.equal(points.at(-1).x,actual.x);assert.equal(points.at(-1).y,actual.y);
});
