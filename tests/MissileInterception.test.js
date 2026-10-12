import test from 'node:test';
import assert from 'node:assert/strict';
import {MISSILE_HP,interceptionDamage,sweepMissile} from '../MissileInterception.js';
import {battleSpawns,confineToMap,battleMap} from '../BattleMap.js';
for(const [id,hits] of [['gun-AK-200',3],['gun-24-K',2],['gun-AK-82',1],['gun-A-100',1],['gun-AK-130',1],['gun-AK-130-6',1],['gun-RBU-4200',1]])test(`${id}: ${hits} hits intercept`,()=>{let hp=MISSILE_HP;for(let i=1;i<hits;i++){hp-=interceptionDamage(id);assert.ok(hp>0);}assert.ok(hp-interceptionDamage(id)<=0);});
test('crossing moving missile is hit between frames',()=>{const hit=sweepMissile({x:-500,y:0},{x:500,y:0},{previous:{x:0,y:-100},x:0,y:100,direction:-Math.PI/2,width:64,height:128});assert.ok(hit&&hit.t>0&&hit.t<1);assert.equal(sweepMissile({x:-500,y:500},{x:500,y:500},{previous:{x:0,y:-100},x:0,y:100,direction:-Math.PI/2}),null);});
test('random spawn sides are opposite',()=>{for(const r of [0,.9]){const {player,enemy}=battleSpawns(()=>r);assert.equal(player.x+enemy.x,battleMap.width);assert.equal(player.x<enemy.x,r<.5);}});
test('map confines body and removes outward velocity',()=>{const body={x:-100,y:11000,width:100,height:200,angle:0,vx:-50,vy:90};confineToMap(body);assert.equal(body.x,50);assert.equal(body.y,9900);assert.equal(body.vx,0);assert.equal(body.vy,0);});
