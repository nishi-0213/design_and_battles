import test from 'node:test';import assert from 'node:assert/strict';
import {shipContacts,shipContactSpeed,resolveShipContact,shipCollisionDamage} from '../ShipCollision.js';
const entry=(x=0,id='1x1')=>({part:{id,width:1,height:1},block:{x,y:0,angle:0},hp:100,destroyed:false});
const target=(x,entries=[entry()],angle=0)=>({entries,pose:{x,y:0,angle,vx:0,vy:0,omega:0,mass:10,width:64,height:64},scale:1,pivot:{x:0,y:0}});
test('ship contact identifies actual blocks, including rotation and empty triangle halves',()=>{
 const a=target(0,[entry(),entry(-128)]),b=target(60);const hits=shipContacts(a,b);assert.equal(hits.length,1);assert.equal(hits[0].a,a.entries[0]);assert.equal(hits[0].b,b.entries[0]);assert.equal(hits[0].depth,4);assert.equal(hits[0].nx,-1);
 assert.equal(shipContacts(a,target(100)).length,0);a.entries[0].destroyed=true;assert.equal(shipContacts(a,b).length,0);
 const triangle=target(0,[entry(0,'1x1half')]);const small=target(25);small.pose.y=-25;small.scale=.1;assert.equal(shipContacts(triangle,small).length,0);
 assert.ok(shipContacts(target(0,undefined,Math.PI/4),target(60)).length>0);
});
test('response separates blocks and opposes closing velocity with angular impulse',()=>{
 const a=target(0),b=target(60);a.pose.vx=100;
 const hit=shipContacts(a,b)[0],speed=shipContactSpeed(hit,a.pose,b.pose);assert.equal(speed.closing,100);
 resolveShipContact(a.pose,hit);assert.equal(a.pose.x,-4);assert.ok(a.pose.vx<=0);assert.equal(b.pose.x,60);
 const angled=target(0);angled.pose.vx=100;const off={...hit,y:20};resolveShipContact(angled.pose,off);assert.notEqual(angled.pose.omega,0);
});
test('both struck blocks lose HP, faster impacts hurt more, tangential spin counts',()=>{
 const low=entry(),high=entry(),enemy=entry();shipCollisionDamage(low,.1,100,0);shipCollisionDamage(high,.1,200,200);shipCollisionDamage(enemy,.1,200,200);assert.ok(high.hp<low.hp);assert.equal(enemy.hp,high.hp);assert.equal(shipCollisionDamage(high,1,1000,0),true);
 const a=target(0),b=target(60);a.pose.omega=2;assert.ok(shipContactSpeed({...shipContacts(a,b)[0],y:20},a.pose,b.pose).speed>0);
});
