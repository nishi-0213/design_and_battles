import test from 'node:test';
import assert from 'node:assert/strict';
import {flightControlPerformance,createFlightBody,stepFlight} from '../FlightPhysics.js';
const empty={x:0,y:0,turn:0};const ground=()=>10000;
const advance=(body,input,seconds,terrain=ground)=>{for(let i=0;i<Math.round(seconds*120);i++)stepFlight(body,input,1/120,terrain);};
test('gravity and upward thrust combine, then inertia survives releasing controls',()=>{
 const b=createFlightBody(0,0,128,128);advance(b,empty,1);assert.ok(b.vy>65);
 advance(b,{...empty,y:-1},.05);assert.ok(b.vy>0);advance(b,{...empty,y:-1},1);assert.ok(b.vy<0);
 const y=b.y;advance(b,empty,.1);assert.ok(b.y<y);
 advance(b,{...empty,x:1},.5);const x=b.x;advance(b,empty,.1);assert.ok(b.x>x);
});
test('rotating the body rotates thrust and preserves angular inertia',()=>{
 const b=createFlightBody(0,0,128,64);b.angle=Math.PI/2;advance(b,{...empty,y:-1},.1);assert.ok(b.vx>60);assert.ok(b.vy>0);
 advance(b,{...empty,turn:1},.3);assert.ok(b.omega>0);const omega=b.omega;advance(b,empty,.1);assert.ok(b.omega>0&&b.omega<omega);
});
test('rotated ground contacts prevent penetration and alter angular velocity',()=>{
 const b=createFlightBody(0,80,128,64);b.angle=.3;b.vy=200;stepFlight(b,empty,1/120,()=>100);
 assert.ok(Math.abs(b.omega)>0);assert.ok(b.vy<200);
 advance(b,empty,5,()=>100);assert.ok(Number.isFinite(b.angle));
 const c=Math.cos(b.angle),s=Math.sin(b.angle);
 for(const x of [-64,64])for(const y of [-32,32])assert.ok(b.y+s*x+c*y<=100+1e-6);
});

test('remaining single rocket overrides pilot thrust and torque',()=>{
 const b=createFlightBody(0,0,128,128);b.autonomousThrust={x:0,y:-700,torque:2};
 const reference=createFlightBody(0,0,128,128);reference.autonomousThrust={...b.autonomousThrust};
 advance(b,{x:1,y:1,turn:-1},.2);advance(reference,empty,.2);assert.equal(b.vx,reference.vx);assert.equal(b.vy,reference.vy);assert.ok(b.vy<0);assert.ok(b.omega>0);
 const stopped=createFlightBody(0,0,128,128);stopped.thrustAcceleration=0;advance(stopped,{x:1,y:0,turn:0},.2);assert.equal(stopped.vx,0);
});

test('mass and inertia govern acceleration for otherwise identical thrust',()=>{
 const stats={mass:10,thrust:100,rotationMultiplier:1};
 const base=flightControlPerformance(stats,10000),heavy=flightControlPerformance({...stats,mass:20},20000);
 assert.equal(heavy.thrustAcceleration,base.thrustAcceleration/2);assert.equal(heavy.turnAcceleration,base.turnAcceleration/2);
 assert.equal(flightControlPerformance(stats,20000).turnAcceleration,base.turnAcceleration/2);
});
