import test from 'node:test';import assert from 'node:assert/strict';import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true}});const {flareMounts,flareSupported,blockedFlares,flareSector}=await server.ssrLoadModule('/FlareSupport.js');await server.close();
test('flare mounts on all rectangular and half hulls in occupied grid cells',()=>{
 for(const [partId,x,y,count] of [['1x1',32,32,1],['1x2',32,64,2],['2x2',64,64,4],['1x1half',32,32,1],['2x2Half',64,64,3]]){
  const hull={partId,x,y,angle:0},cells=flareMounts([hull]);assert.equal(cells.length,count,partId);for(const cell of cells)assert.ok(flareSupported({...cell,angle:45},[hull]));
 }
 assert.equal(flareSupported({x:96,y:32},[{partId:'2x2Half',x:64,y:64,angle:0}]),false);
});
test('outward cone clears own mount but blocks forward pieces at 0 and 45 degrees',()=>{
 const hull={partId:'1x1',x:32,y:32,angle:0},flare={partId:'misc-FLARE',x:32,y:32,angle:0};assert.equal(blockedFlares([hull,flare]).length,0);assert.equal(blockedFlares([hull,flare,{partId:'1x1',x:32,y:-32,angle:0}]).length,1);
 flare.angle=45;const sector=flareSector(flare);assert.ok(Math.abs(sector.x-64)<1e-8&&Math.abs(sector.y)<1e-8);assert.equal(blockedFlares([hull,flare]).length,0);assert.equal(blockedFlares([hull,flare,{partId:'1x1',x:96,y:-32,angle:0}]).length,1);assert.equal(blockedFlares([hull,flare,{partId:'1x1',x:-32,y:32,angle:0}]).length,0);
});
