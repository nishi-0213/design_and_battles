export const GROUND_DAMAGE_PER_SECOND = 100;
export function blockMaxHp(part) {
  const area=part.width*part.height*(part.id.toLowerCase().endsWith('half')?.5:1);
  return area*100*(part.category==='ARMOR'?4:1);
}
export function applyGroundDamage(entry,seconds,speed=null,impactSpeed=0) {
  const rate=speed===null ? GROUND_DAMAGE_PER_SECOND : GROUND_DAMAGE_PER_SECOND*Math.max(.1,Math.min(10,speed/100));
  const impact=entry.touching ? 0 : .0025*impactSpeed*impactSpeed;
  entry.hp=Math.max(0,entry.hp-rate*seconds-impact);
  entry.touching=true;
  return entry.hp===0;
}

export function terrainContactSpeed(points,body,groundAt) {
  const c=Math.cos(body.angle),s=Math.sin(body.angle),v=body.preContactVelocity??body;
  let speed=0,impact=0;
  for(const p of points) {
    const rx=c*p.x-s*p.y,ry=s*p.x+c*p.y,x=body.x+rx;
    if(body.y+ry<groundAt(x)-.75)continue;
    const slope=(groundAt(x+1)-groundAt(x-1))/2,len=Math.hypot(slope,1);
    const nx=slope/len,ny=-1/len,vx=v.vx-v.omega*ry,vy=v.vy+v.omega*rx;
    const closing=Math.max(0,-(vx*nx+vy*ny)),tangent=Math.abs(-vx*ny+vy*nx);
    speed=Math.max(speed,Math.hypot(closing,tangent*.25));impact=Math.max(impact,closing);
  }
  return {speed,impact};
}

export function mountedOnHull(entry,hull) {
  if(entry.part.category==='HULL' || entry.part.category==='BRIDGE')return false;
  const bounds=e=>{const turn=(e.block.angle||0)%180!==0;return {x:e.block.x,y:e.block.y,w:(turn?e.part.height:e.part.width)*64,h:(turn?e.part.width:e.part.height)*64};};
  const a=bounds(entry),b=bounds(hull);
  return Math.abs(a.x-b.x)<(a.w+b.w)/2-.01 && Math.abs(a.y-b.y)<(a.h+b.h)/2-.01;
}
