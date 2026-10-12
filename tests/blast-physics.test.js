import test from 'node:test';import assert from 'node:assert/strict';import {applyExplosionPush} from '../BlastPhysics.js';
test('explosions push away from source, with distance and mass attenuation',()=>{
 const near={x:100,y:0,mass:12,vx:0,vy:0},far={...near,x:200},heavy={...near,mass:24};
 applyExplosionPush(near,0,0);applyExplosionPush(far,0,0);applyExplosionPush(heavy,0,0);
 assert.ok(near.vx>0);assert.equal(far.vx,near.vx/2);assert.equal(heavy.vx,near.vx/2);
 const center={x:0,y:0,mass:1,vx:0,vy:0};applyExplosionPush(center,0,0);assert.equal(center.vx,0);assert.equal(center.vy,0);
});
