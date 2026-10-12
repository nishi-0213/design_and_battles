import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true}});
const {disconnectedBlockIndices,disconnectedBlocks}=await server.ssrLoadModule('/ShipConnectivity.js');
await server.close();
test('hull link loss disconnects remote mounted equipment from bridge',()=>{
 const blocks=[{partId:'bridge',x:0,y:0,angle:0},{partId:'2x2',x:128,y:0,angle:0},{partId:'2x2',x:256,y:0,angle:0},{partId:'gun-AK-200',x:256,y:0,angle:0}];
 assert.equal(disconnectedBlocks(blocks),0);
 assert.deepEqual(disconnectedBlockIndices([blocks[0],blocks[2],blocks[3]]),[1,2]);
 assert.deepEqual(disconnectedBlockIndices(blocks.slice(1)),[0,1,2]);
});
test('cached graph ignores destroyed nodes and retains alternative paths',async()=>{
 const vite=await createServer({server:{middlewareMode:true}});const {createBlockConnectivity}=await vite.ssrLoadModule('/ShipConnectivity.js');await vite.close();
 const blocks=[{partId:'bridge',x:0,y:0,angle:0},{partId:'2x2',x:128,y:0,angle:0},{partId:'2x2',x:256,y:0,angle:0},{partId:'gun-AK-200',x:256,y:0,angle:0},{partId:'2x2',x:0,y:128,angle:0},{partId:'2x2',x:128,y:128,angle:0},{partId:'2x2',x:256,y:128,angle:0}];
 const graph=createBlockConnectivity(blocks),dead=new Set([1]);assert.deepEqual(graph.disconnectedIndices(i=>!dead.has(i)),[]);
 dead.add(5);assert.deepEqual(graph.disconnectedIndices(i=>!dead.has(i)),[2,3,6]);
 dead.add(0);assert.deepEqual(graph.disconnectedIndices(i=>!dead.has(i)),[2,3,4,6]);
});
test('spatial graph preserves diagonal parts and overlap connectivity',async()=>{
 const vite=await createServer({server:{middlewareMode:true}});const {createBlockConnectivity}=await vite.ssrLoadModule('/ShipConnectivity.js');await vite.close();
 const blocks=[{partId:'bridge',x:0,y:0,angle:0},{partId:'2x2Half',x:128,y:0,angle:0},{partId:'misc-FLARE',x:96,y:32,angle:45},{partId:'1x1',x:10000,y:0,angle:0}];
 assert.deepEqual(createBlockConnectivity(blocks).disconnectedIndices(),[3]);
});
