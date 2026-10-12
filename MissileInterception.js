import {segmentPolygon} from './ProjectileCollision.js';
export const MISSILE_HP=6;
export function interceptionDamage(id){return id==='gun-AK-200'?2:id==='gun-24-K'?3:6;}
export function sweepMissile(start,end,missile){
  const a=missile.direction+Math.PI/2,c=Math.cos(a),s=Math.sin(a);
  const local=(p,q)=>{const x=p.x-q.x,y=p.y-q.y;return {x:c*x+s*y,y:-s*x+c*y};};
  const w=(missile.width??64)/2,h=(missile.height??128)/2;
  const t=segmentPolygon(local(start,missile.previous),local(end,missile),[{x:-w,y:-h},{x:w,y:-h},{x:w,y:h},{x:-w,y:h}],2);
  return t===null?null:{t,x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t,missile};
}
