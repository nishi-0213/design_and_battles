import { GRAVITY } from './FlightPhysics.js';
const weaponOrder = ['gun-AK-200','gun-24-K','gun-AK-82','gun-A-100','gun-AK-130','gun-AK-130-6','gun-RBU-4200'];
export function assignWeaponGroups(ids) {
  const types=[...new Set(ids)].sort((a,b)=>weaponOrder.indexOf(a)-weaponOrder.indexOf(b));
  const smallCount=types.length===1 ? 0 : Math.ceil(types.length/2);
  return new Map(types.map((id,index)=>[id,index<smallCount?'small':'large']));
}
export function weaponProfile(id) {
  const small = ['gun-AK-200','gun-24-K','gun-AK-82'].includes(id);
  const rocket=id==='gun-RBU-4200';
  const damage=[20,45,70,100,140,140,700][weaponOrder.indexOf(id)]??20;
  return { weaponId:id, damage, rocket, acceleration:rocket?500:0, blastRadius:rocket?200:0, impactScale:rocket?4:1, group: small ? 'small' : 'large', cooldown: id==='gun-AK-200' ? .12 : small ? .4 : .8, speed: rocket?560:small ? 2000 : 1600, spread: Math.PI/90, count: id==='gun-AK-130-6' ? 6 : 1 };
}
export function fireProjectile(x,y,angle,velocity,profile,random=Math.random) {
  const direction=angle+(random()-.5)*2*profile.spread;
  const speed=profile.speed*(.95+random()*.1);
  return {x,y,weaponId:profile.weaponId,vx:velocity.x+Math.cos(direction)*speed,vy:velocity.y+Math.sin(direction)*speed,life:6,group:profile.group,damage:profile.damage??20,rocket:profile.rocket,acceleration:profile.acceleration??0,direction,blastRadius:profile.blastRadius??0,impactScale:profile.impactScale??1,trail:profile.rocket?[{x,y}]:null,trailTime:0};
}
export function stepProjectile(shot,dt,groundAt) {
  if(shot.rocket){shot.vx+=Math.cos(shot.direction)*shot.acceleration*dt;shot.vy+=Math.sin(shot.direction)*shot.acceleration*dt;}
  shot.vy+=GRAVITY*dt;shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;
  if(shot.trail){shot.trailTime+=dt;if(shot.trailTime>=.04){shot.trailTime%=.04;shot.trail.push({x:shot.x,y:shot.y});if(shot.trail.length>24)shot.trail.shift();}}
  return shot.life>0 && shot.y<groundAt(shot.x);
}
export function predictProjectile(x,y,angle,velocity,profile,groundAt,maximumLength) {
  const shot=fireProjectile(x,y,angle,velocity,profile,()=>.5),points=[{x,y}];shot.trail=null;let length=0;
  for(let i=0;i<240;i++){
    const previous={x:shot.x,y:shot.y};const flying=stepProjectile(shot,1/60,groundAt);
    length+=Math.hypot(shot.x-previous.x,shot.y-previous.y);points.push({x:shot.x,y:shot.y});if(!flying||length>=maximumLength)break;
  }
  return points;
}
export function partOutline(part,angle,x,y,scale,pivot) {
  if(part.rotationAffectsFootprint===false)angle=0;
  const w=part.width*64/2,h=part.height*64/2;
  const corners=part.id.toLowerCase().endsWith('half') ? [[-w,-h],[-w,h],[w,h]] : [[-w,-h],[w,-h],[w,h],[-w,h]];
  const c=Math.cos(angle),s=Math.sin(angle),points=[];
  for(let edge=0;edge<corners.length;edge++) {
    const a=corners[edge],b=corners[(edge+1)%corners.length];
    const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*scale/4));
    for(let i=0;i<=steps;i++) {
      const px=a[0]+(b[0]-a[0])*i/steps,py=a[1]+(b[1]-a[1])*i/steps;
      points.push({x:(x+c*px-s*py-pivot.x)*scale,y:(y+s*px+c*py-pivot.y)*scale});
    }
  }
  return points;
}
export function touchesTerrain(points,body,groundAt) {
  const c=Math.cos(body.angle),s=Math.sin(body.angle);
  return points.some(p=>body.y+s*p.x+c*p.y>=groundAt(body.x+c*p.x-s*p.y)-.75);
}

export function gimbalAngle(vx,vy,bodyAngle) {
  if(Math.hypot(vx,vy)<5) return 0;
  const c=Math.cos(bodyAngle),s=Math.sin(bodyAngle);
  const x=c*vx+s*vy,y=-s*vx+c*vy;
  return Math.atan2(-y,-x)-Math.PI/2; // ノズルの正位置は下向き。
}

export function allocateAmmo(entries,ammo) {
  const enabled=new Map();
  const sorted=[...entries].sort((a,b)=>weaponOrder.indexOf(a.part.id)-weaponOrder.indexOf(b.part.id));
  for(const entry of sorted) {
    const cost=entry.part.ammoConsumption??0;
    const canFire=ammo>=cost;enabled.set(entry,canFire);if(canFire)ammo-=cost;
  }
  return enabled;
}
