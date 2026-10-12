import test from 'node:test';import assert from 'node:assert/strict';import {nearestShip,steerMissile} from '../HomingMissile.js';import {weaponProfile} from '../CombatWeapons.js';
const target=(id,x,y)=>({id,pose:{x,y},entries:[{part:{category:'BRIDGE'},destroyed:false}]});
test('locks closest living non-owner ship at launch and keeps that lock',()=>{
 const self=target('self',0,0),a=target('a',100,0),b=target('b',200,0);assert.equal(nearestShip({x:190,y:0},[self,a,b],'self'),b);b.entries[0].destroyed=true;assert.equal(nearestShip({x:190,y:0},[self,a,b],'self'),a);
});
test('missile steering is rate limited and stops steering after target loss',()=>{
 const lock=target('enemy',0,100),shot={x:0,y:0,direction:0,vx:400,vy:0,lock};steerMissile(shot,.1);assert.equal(shot.direction,.25);assert.ok(shot.vy>0);assert.ok(Math.abs(Math.hypot(shot.vx,shot.vy)-400)<1e-8);lock.entries[0].destroyed=true;steerMissile(shot,.1);assert.equal(shot.direction,.25);
});
test('all gun shell initial speeds are doubled',()=>{
 assert.equal(weaponProfile('gun-AK-200').speed,2000);assert.equal(weaponProfile('gun-AK-130').speed,1600);assert.equal(weaponProfile('gun-RBU-4200').speed,560);
});
