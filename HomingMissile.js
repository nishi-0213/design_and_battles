export function nearestShip(point,targets,owner) {
  return targets.filter(t=>t.id!==owner&&t.entries.some(e=>!e.destroyed&&e.part.category==='BRIDGE')).sort((a,b)=>Math.hypot(a.pose.x-point.x,a.pose.y-point.y)-Math.hypot(b.pose.x-point.x,b.pose.y-point.y))[0]??null;
}
export function steerMissile(shot,dt) {
  const target=shot.lock;
  const decoy=shot.decoy?.life>0?shot.decoy:null;
  if(!decoy&&!target?.entries.some(e=>!e.destroyed&&e.part.category==='BRIDGE'))return;
  const point=decoy??target.pose;
  const desired=Math.atan2(point.y-shot.y,point.x-shot.x),delta=Math.atan2(Math.sin(desired-shot.direction),Math.cos(desired-shot.direction));
  shot.direction+=Math.max(-2.5*dt,Math.min(2.5*dt,delta));
  const speed=Math.hypot(shot.vx,shot.vy);shot.vx=Math.cos(shot.direction)*speed;shot.vy=Math.sin(shot.direction)*speed;
}
export const missileProfile={rocket:true,acceleration:400,blastRadius:200,impactScale:4,damage:700,group:'large',speed:400,spread:0,count:1};
