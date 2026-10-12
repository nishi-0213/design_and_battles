import test from 'node:test';import assert from 'node:assert/strict';
import {sweepShip,sweepTerrain} from '../ProjectileCollision.js';
const entry=(x=0,id='1x1',angle=0)=>({part:{id,width:1,height:1},block:{x,y:0,angle},destroyed:false});
const target=(entries=[entry()],pose={x:0,y:0,angle:0})=>({entries,pose,scale:1,pivot:{x:0,y:0}});
test('high-speed shell hits nearest block between endpoints and ignores destroyed blocks',()=>{
 const back=entry(100),front=entry();const ship=target([back,front]);
 const hit=sweepShip({x:-1000,y:0},{x:1000,y:0},ship);assert.equal(hit.entry,front);assert.ok(Math.abs(hit.x+34)<1e-6);
 front.destroyed=true;assert.equal(sweepShip({x:-1000,y:0},{x:1000,y:0},ship).entry,back);
});
test('collision includes translated, rotating and layered friendly or hostile ships',()=>{
 const hull=entry(),armor=entry();const ship=target([hull,armor],{x:100,y:100,angle:Math.PI/2});
 assert.equal(sweepShip({x:0,y:100},{x:200,y:100},ship).entry,armor);
 const moving=target([entry()],{x:100,y:0,angle:0});moving.previous={x:-100,y:0,angle:0};
 assert.ok(sweepShip({x:0,y:0},{x:0,y:0},moving));
 const rotating=target([entry(100)],{x:0,y:0,angle:Math.PI});rotating.previous={x:0,y:0,angle:0};
 assert.ok(sweepShip({x:0,y:100},{x:0,y:100},rotating));
 assert.equal(sweepShip({x:-100,y:100},{x:100,y:100},target()),null);
});
test('triangular empty half does not absorb shells',()=>{
 const ship=target([entry(0,'1x1half')]);
 assert.equal(sweepShip({x:20,y:-25},{x:25,y:-20},ship),null);
 assert.ok(sweepShip({x:-20,y:20},{x:20,y:20},ship));
});
test('ground sweep catches a ridge even if both endpoints are above ground',()=>{
 const ground=x=>Math.abs(x)<5?0:100;
 const hit=sweepTerrain({x:-40,y:20},{x:40,y:20},ground);assert.ok(hit);assert.ok(hit.x>=-5&&hit.x<0);
 assert.equal(sweepTerrain({x:-40,y:-20},{x:40,y:-20},ground),null);
});
test('far shots skip block geometry but fast crossings and moving ships still qualify',async()=>{
 const {mayHitShip}=await import('../ProjectileCollision.js');const ship=target();ship.boundingRadius=46;
 assert.equal(mayHitShip({x:-1000,y:1000},{x:1000,y:1000},ship),false);
 const skip={...ship};Object.defineProperty(skip,'entries',{get(){throw new Error('distant shot must not inspect blocks');}});assert.equal(sweepShip({x:1000,y:1000},{x:2000,y:1000},skip),null);
 assert.ok(sweepShip({x:-1000,y:0},{x:1000,y:0},ship));
 ship.previous={x:-500,y:0,angle:0};ship.pose={x:500,y:0,angle:0};assert.ok(mayHitShip({x:0,y:0},{x:0,y:0},ship));
});
