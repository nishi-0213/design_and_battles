import test from 'node:test';import assert from 'node:assert/strict';import {createFlightBody} from '../FlightPhysics.js';import {createEnemyOrbit,stepEnemyOrbit,interceptAngle} from '../EnemyAI.js';
test('enemy follows an orbit while keeping clear of ground',()=>{
 const player={x:0,y:0,vx:0,vy:0},enemy=createFlightBody(1000,0,64,64);enemy.thrustAcceleration=900;const orbit=createEnemyOrbit(enemy,player,1000);
 for(let i=0;i<1200;i++)stepEnemyOrbit(enemy,player,orbit,1/120,()=>5000);
 assert.ok(Math.hypot(enemy.x,enemy.y)>750&&Math.hypot(enemy.x,enemy.y)<1300);assert.ok(enemy.x<0&&enemy.y>0);
 for(let i=0;i<1200;i++)stepEnemyOrbit(enemy,player,orbit,1/120,()=>500);assert.ok(enemy.y<500-enemy.height/2);
});
test('lead aim accounts for shell gravity and inherited velocity',()=>{
 const target={x:1000,y:100,vx:50,vy:-20},velocity={x:100,y:40},angle=interceptAngle({x:0,y:0},target,velocity,1000);const vx=velocity.x+Math.cos(angle)*1000,vy=velocity.y+Math.sin(angle)*1000,t=1000/(vx-target.vx);assert.ok(Math.abs(vy*t+40*t*t-(target.y+target.vy*t))<.001);
});
test('no-engine enemy falls instead of receiving imaginary orbit thrust',()=>{
 const player={x:0,y:0,vx:0,vy:0},enemy=createFlightBody(1000,0,64,64);enemy.ballistic=true;enemy.thrustAcceleration=0;stepEnemyOrbit(enemy,player,createEnemyOrbit(enemy,player,1000),.1,()=>5000);assert.ok(enemy.vy>0);assert.equal(enemy.vx,0);
});
