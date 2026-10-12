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
