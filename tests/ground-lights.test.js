import test from 'node:test';import assert from 'node:assert/strict';import {selectGroundLights} from '../GroundLights.js';
const light=(type,x,intensity)=>({type,x,y:0,radius:400,intensity});
test('nearby lights of same type share the stronger ground source',()=>{
 const strong=light('rocket',0,2),weak=light('rocket',100,1),explosion=light('explosion',100,1),far=light('rocket',500,1);const selected=selectGroundLights([weak,explosion,far,strong],{x:-100},1200,()=>0);assert.ok(selected.includes(strong));assert.ok(!selected.includes(weak));assert.ok(selected.includes(explosion));assert.ok(selected.includes(far));assert.ok(selectGroundLights(Array.from({length:20},(_,i)=>light('rocket',i*400,1)),{x:0},8000,()=>0).length<=6);
});
