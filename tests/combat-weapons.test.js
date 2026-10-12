import test from 'node:test';import assert from 'node:assert/strict';
import {assignWeaponGroups,fireProjectile,stepProjectile,partOutline,touchesTerrain,gimbalAngle} from '../CombatWeapons.js';
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
