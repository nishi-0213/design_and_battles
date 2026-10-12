import test from 'node:test';import assert from 'node:assert/strict';
import {blockMaxHp,applyGroundDamage} from '../BlockDurability.js';
import {stepDebris} from '../DebrisPhysics.js';
test('HP scales with area and armor multiplier',()=>{
 assert.equal(blockMaxHp({id:'1x1',category:'HULL',width:1,height:1}),100);
 assert.equal(blockMaxHp({id:'2x2',category:'HULL',width:2,height:2}),400);
 assert.equal(blockMaxHp({id:'armor-1x2',category:'ARMOR',width:1,height:2}),800);
 assert.equal(blockMaxHp({id:'1x1half',category:'HULL',width:1,height:1}),50);
});
test('ground exposure deals 100 damage per simulated second',()=>{
 const e={hp:100};assert.equal(applyGroundDamage(e,.5),false);assert.equal(e.hp,50);
 assert.equal(applyGroundDamage(e,.5),true);assert.equal(e.hp,0);
});
test('debris bounces, rolls and expires',()=>{
 const d={x:0,y:91,vx:100,vy:100,width:10,height:20,angle:0,omega:0,life:2};
 assert.equal(stepDebris(d,.01,()=>100),true);assert.ok(d.vy<0);assert.ok(d.omega>0);assert.ok(d.y<=90);
 assert.equal(stepDebris(d,3,()=>100),false);
});
