/** 重心へ向かう爆発の反比例インパルス。近接時も大きく飛ばしすぎない。 */
export function applyExplosionPush(body,x,y,center={x:body.x,y:body.y,mass:body.mass}) {
  const dx=center.x-x,dy=center.y-y,distance=Math.hypot(dx,dy);
  if(distance<.001 || center.mass<=0)return;
  const kick=Math.min(25,12000/(Math.max(30,distance)*Math.max(1,center.mass)));
  body.vx+=dx/distance*kick;body.vy+=dy/distance*kick;
}
