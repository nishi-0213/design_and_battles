import {GRAVITY,stepFlight} from './FlightPhysics.js';
export function createEnemyOrbit(enemy,player,radius) {
  return {phase:Math.atan2(enemy.y-player.y,enemy.x-player.x),radius};
}
export function stepEnemyOrbit(enemy,player,orbit,dt,groundAt,active=true) {
  if(!active||enemy.ballistic||enemy.autonomousThrust){stepFlight(enemy,{x:0,y:0,turn:0},dt,groundAt);return;}
  orbit.phase+=dt*.25;
  const a=orbit.phase,r=orbit.radius;
  const tx=player.x+Math.cos(a)*r+Math.sin(a*3)*35;
  const ty=Math.min(player.y+Math.sin(a)*r+Math.sin(a*4)*45,groundAt(tx)-enemy.height/2-120);
  const vx=player.vx-Math.sin(a)*r*.25,vy=player.vy+Math.cos(a)*r*.25;
  const ax=(tx-enemy.x)*1.8+(vx-enemy.vx)*2.4;
  const ay=(ty-enemy.y)*1.8+(vy-enemy.vy)*2.4-GRAVITY;
  const c=Math.cos(enemy.angle),s=Math.sin(enemy.angle),thrust=Math.max(1,enemy.thrustAcceleration);
  stepFlight(enemy,{x:(c*ax+s*ay)/thrust,y:(-s*ax+c*ay)/thrust,turn:0},dt,groundAt);
}
// 重力と発射艦の速度を含む、一定速度の目標に対する初期照準。
export function interceptAngle(origin,target,velocity,speed) {
  const dx=target.x-origin.x,dy=target.y-origin.y;
  const vector=t=>({x:dx/t+target.vx-velocity.x,y:dy/t+target.vy-velocity.y-GRAVITY*t/2});
  let lo=.001,hi=null;
  for(let t=.05;t<6;t+=.05){const v=vector(t);if(Math.hypot(v.x,v.y)<=speed){hi=t;break;}lo=t;}
  if(hi===null)return Math.atan2(dy,dx);
  for(let i=0;i<20;i++){const t=(lo+hi)/2,v=vector(t);if(Math.hypot(v.x,v.y)>speed)lo=t;else hi=t;}
  const v=vector((lo+hi)/2);return Math.atan2(v.y,v.x);
}
