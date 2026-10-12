export function createFlare(target,entry,time) {
  const pose=target.pose,scale=target.container.scale.x,c=Math.cos(pose.angle),s=Math.sin(pose.angle),lx=(entry.block.x-target.container.pivot.x)*scale,ly=(entry.block.y-target.container.pivot.y)*scale;
  const angle=pose.angle+(entry.block.angle||0)*Math.PI/180-Math.PI/2;
  return {owner:target.id,x:pose.x+c*lx-s*ly,y:pose.y+s*lx+c*ly,vx:pose.vx+Math.cos(angle)*450,vy:pose.vy+Math.sin(angle)*450,life:3,expires:time+3,group:'large',flare:true};
}
export function distractMissiles(missiles,flares,time) {
  for(const shot of missiles)if(shot.missile) {
    const candidates=flares.filter(f=>f.owner!==shot.owner&&f.life>0&&f.expires>time);
    const flare=candidates.sort((a,b)=>Math.hypot(a.x-shot.x,a.y-shot.y)-Math.hypot(b.x-shot.x,b.y-shot.y))[0];
    if(flare)shot.decoy=flare;
    if(shot.decoy&&shot.decoy.expires<=time)shot.decoy=null;
  }
}
export function stepFlare(flare,dt) {
  flare.vy+=80*dt;flare.x+=flare.vx*dt;flare.y+=flare.vy*dt;flare.life-=dt;
}
