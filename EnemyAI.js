import {GRAVITY,stepFlight} from './FlightPhysics.js';
export const MAX_ENEMY_APPROACH_SPEED=250;
export function limitEnemyApproach(enemy,player,maximum=MAX_ENEMY_APPROACH_SPEED){
  const dx=player.x-enemy.x,dy=player.y-enemy.y,distance=Math.hypot(dx,dy);if(distance<.001)return;
  const nx=dx/distance,ny=dy/distance,closing=(enemy.vx-player.vx)*nx+(enemy.vy-player.vy)*ny;
  if(closing>maximum){enemy.vx-=nx*(closing-maximum);enemy.vy-=ny*(closing-maximum);}
}
export function createEnemyOrbit(enemy,player,radius) {
  return {phase:Math.atan2(enemy.y-player.y,enemy.x-player.x),radius,direction:1,turnCooldown:0};
}
export function stepEnemyOrbit(enemy,player,orbit,dt,groundAt,active=true) {
  if(!active||enemy.ballistic||enemy.autonomousThrust){stepFlight(enemy,{x:0,y:0,turn:0},dt,groundAt);return;}
  orbit.turnCooldown=Math.max(0,orbit.turnCooldown-dt);
  const unsafe=phase=>{
    const x=player.x+Math.cos(phase)*orbit.radius+Math.sin(phase*3)*35;
    const y=player.y+Math.sin(phase)*orbit.radius+Math.sin(phase*4)*45;
    return y+enemy.height/2+180>=groundAt(x);
  };
  if(orbit.turnCooldown===0&&[.3,.6,.9].some(t=>unsafe(orbit.phase+orbit.direction*.25*t))){orbit.direction*=-1;orbit.turnCooldown=1.2;}
  orbit.phase+=dt*.25*orbit.direction;
  const a=orbit.phase,r=orbit.radius;
  const tx=player.x+Math.cos(a)*r+Math.sin(a*3)*35;
  const ty=Math.min(player.y+Math.sin(a)*r+Math.sin(a*4)*45,groundAt(tx)-enemy.height/2-120);
  const vx=player.vx-Math.sin(a)*r*.25*orbit.direction,vy=player.vy+Math.cos(a)*r*.25*orbit.direction;
  const ax=(tx-enemy.x)*1.8+(vx-enemy.vx)*2.4;
  const ay=(ty-enemy.y)*1.8+(vy-enemy.vy)*2.4-GRAVITY;
  const c=Math.cos(enemy.angle),s=Math.sin(enemy.angle),thrust=Math.max(1,enemy.thrustAcceleration);
  limitEnemyApproach(enemy,player);
  stepFlight(enemy,{x:(c*ax+s*ay)/thrust,y:(-s*ax+c*ay)/thrust,turn:0},dt,groundAt,()=>limitEnemyApproach(enemy,player));
  limitEnemyApproach(enemy,player);
}
// 重力と発射艦の速度を含む、一定速度の目標に対する初期照準。
export function interceptAngle(origin,target,velocity,speed,acceleration=0) {
  const dx=target.x-origin.x,dy=target.y-origin.y;
  const vector=t=>({x:dx/t+target.vx-velocity.x,y:dy/t+target.vy-velocity.y-GRAVITY*t/2});
  let lo=.001,hi=null;
  for(let t=.05;t<6;t+=.05){const v=vector(t);if(Math.hypot(v.x,v.y)<=speed+acceleration*t/2){hi=t;break;}lo=t;}
  if(hi===null)return Math.atan2(dy,dx);
  for(let i=0;i<20;i++){const t=(lo+hi)/2,v=vector(t);if(Math.hypot(v.x,v.y)>speed+acceleration*t/2)lo=t;else hi=t;}
  const v=vector((lo+hi)/2);return Math.atan2(v.y,v.x);
}
