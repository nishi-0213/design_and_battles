import test from 'node:test';import assert from 'node:assert/strict';import {terrainHeight,terrainProjection} from '../DesertTerrain.js';
test('terrain retains fivefold amplitude and stretches wavelengths fivefold',()=>{
 for(const [x,z] of [[0,0],[120,300],[-850,900],[3000,-80]]){const original=24+11*Math.sin(x*.003+Math.sin(z*.0028)*1.8)+6*Math.sin(x*.0074+z*.0024)+6*Math.sin(z*.004);assert.ok(Math.abs(terrainHeight(x,z)-(24+5*(original-24)))<1e-10);}
});
test('ground light is centered directly below the source in terrain space and dims with altitude',()=>{
 const projection=terrainProjection(6000,4000,.2),x=3500,ground=projection.groundAt(x),light={x,y:ground,radius:400,intensity:.5};const at=projection.projectLight(light),high=projection.projectLight({...light,y:ground-1200});assert.equal(at[0],500*projection.worldPerPixel);assert.equal(at[1],projection.depth-80);assert.equal(at[2],400*projection.worldPerPixel*10);assert.deepEqual(high.slice(0,3),at.slice(0,3));assert.equal(high[3],at[3]/3);
});
