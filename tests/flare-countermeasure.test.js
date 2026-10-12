import test from 'node:test';import assert from 'node:assert/strict';import {createFlare,distractMissiles,stepFlare} from '../FlareCountermeasure.js';import {steerMissile} from '../HomingMissile.js';import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true}});const {polygon}=await server.ssrLoadModule('/HullGeometry.js');const {disconnectedBlocks}=await server.ssrLoadModule('/ShipConnectivity.js');await server.close();
test('enemy missiles chase flare for three seconds then resume original lock',()=>{
 const original={pose:{x:1000,y:0},entries:[{part:{category:'BRIDGE'}}]},shot={missile:true,owner:'enemy',lock:original,x:0,y:0,direction:0,vx:400,vy:0},friendly={...shot,owner:'player'},flare={owner:'player',x:0,y:-100,life:3,expires:3};
 distractMissiles([shot,friendly],[flare],0);assert.equal(shot.decoy,flare);assert.equal(friendly.decoy,undefined);steerMissile(shot,.1);assert.equal(shot.direction,-.25);distractMissiles([shot],[flare],3);assert.equal(shot.decoy,null);steerMissile(shot,.1);assert.equal(shot.direction,0);assert.equal(shot.lock,original);
});
test('flare launch follows 45 degree mount and footprint stays one grid cell',()=>{
 const target={id:'player',pose:{x:0,y:0,angle:0,vx:0,vy:0},container:{scale:{x:1},pivot:{x:0,y:0}}},entry={block:{x:0,y:0,angle:45}};const flare=createFlare(target,entry,5);assert.ok(flare.vx>0&&flare.vy<0);assert.equal(flare.expires,8);stepFlare(flare,1);assert.equal(flare.life,2);const part={id:'misc-FLARE',width:1,height:1,rotationAffectsFootprint:false};assert.deepEqual(polygon(part,0,0,45),polygon(part,0,0,0));assert.equal(disconnectedBlocks([{partId:'bridge',x:0,y:0,angle:0},{partId:'misc-FLARE',x:96,y:32,angle:45}]),0);
});
