// 凸多角形に対する線分クリップ。フレーム間を飛び越した砲弾も判定する。
export function segmentPolygon(start,end,vertices,padding=0) {
  let area=0;
  for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length];area+=a.x*b.y-a.y*b.x;}
  const winding=Math.sign(area)||1;
  let enter=0,exit=1;
  for(let i=0;i<vertices.length;i++) {
    const a=vertices[i],b=vertices[(i+1)%vertices.length],ex=b.x-a.x,ey=b.y-a.y;
    const f=p=>winding*(ex*(p.y-a.y)-ey*(p.x-a.x))+padding*Math.hypot(ex,ey);
    const from=f(start),to=f(end);
    if(from<0&&to<0)return null;
    if(from<0)enter=Math.max(enter,from/(from-to));
    if(to<0)exit=Math.min(exit,from/(from-to));
    if(enter>exit)return null;
  }
  return enter;
}
const shapes=new WeakMap();
function polygon(entry,target) {
  const {part,block}=entry,w=part.width*32,h=part.height*32;
  const cached=shapes.get(entry);
  if(cached&&cached.scale===target.scale&&cached.px===target.pivot.x&&cached.py===target.pivot.y&&cached.angle===block.angle)return cached;
  const corners=part.id.toLowerCase().endsWith('half')?[[-w,-h],[-w,h],[w,h]]:[[-w,-h],[w,-h],[w,h],[-w,h]];
  const a=(block.angle||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const vertices=corners.map(([x,y])=>({x:(block.x+c*x-s*y-target.pivot.x)*target.scale,y:(block.y+s*x+c*y-target.pivot.y)*target.scale}));
  const shape={vertices,radius:Math.max(...vertices.map(p=>Math.hypot(p.x,p.y))),left:Math.min(...vertices.map(p=>p.x)),right:Math.max(...vertices.map(p=>p.x)),top:Math.min(...vertices.map(p=>p.y)),bottom:Math.max(...vertices.map(p=>p.y)),scale:target.scale,px:target.pivot.x,py:target.pivot.y,angle:block.angle};
  shapes.set(entry,shape);return shape;
}
export function mayHitShip(start,end,target) {
  if(!Number.isFinite(target.boundingRadius))return true;
  const previous=target.previous??target.pose;
  const x=start.x-previous.x,y=start.y-previous.y;
  const dx=end.x-target.pose.x-x,dy=end.y-target.pose.y-y,len=dx*dx+dy*dy;
  const t=len>0?Math.max(0,Math.min(1,-(x*dx+y*dy)/len)):0;
  const radius=target.boundingRadius+2;
  return (x+dx*t)**2+(y+dy*t)**2<=radius*radius;
}
export function sweepShip(start,end,target) {
  if(!mayHitShip(start,end,target))return null;
  const previous=target.previous??target.pose,current=target.pose;
  const angle=Math.atan2(Math.sin(current.angle-previous.angle),Math.cos(current.angle-previous.angle)),steps=Math.max(1,Math.ceil(Math.abs(angle)/.02));
  let best=null;
  const at=t=>({x:previous.x+(current.x-previous.x)*t,y:previous.y+(current.y-previous.y)*t});
  const shotAt=t=>({x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t});
  for(const entry of target.entries.filter(e=>!e.destroyed)) {
    const shape=polygon(entry,target),{vertices,radius}=shape;
    for(let i=0;i<steps;i++) {
      const t0=i/steps,t1=(i+1)/steps,a=previous.angle+angle*(t0+t1)/2,c=Math.cos(a),s=Math.sin(a);
      const local=t=>{const p=shotAt(t),o=at(t),x=p.x-o.x,y=p.y-o.y;return {x:c*x+s*y,y:-s*x+c*y};};
      // 回転中の形状の変位を覆う余白を加え、回転による抜けも防ぐ。
      const from=local(t0),to=local(t1),padding=2+radius*Math.abs(angle)/(2*steps);
      if(Math.max(from.x,to.x)<shape.left-padding||Math.min(from.x,to.x)>shape.right+padding||Math.max(from.y,to.y)<shape.top-padding||Math.min(from.y,to.y)>shape.bottom+padding)continue;
      const hit=segmentPolygon(from,to,vertices,padding);
      if(hit===null)continue;
      const t=t0+(t1-t0)*hit;
      // 同じ位置の重ね装備は描画順の上側を先に受ける。
      if(!best||t<=best.t+1e-9)best={entry,target,t,...shotAt(t)};
    }
  }
  return best;
}
export function sweepTerrain(start,end,groundAt) {
  const at=t=>({x:start.x+(end.x-start.x)*t,y:start.y+(end.y-start.y)*t});
  const below=t=>{const p=at(t);return p.y>=groundAt(p.x);};
  if(below(0))return {t:0,...start};
  const steps=Math.max(1,Math.ceil(Math.hypot(end.x-start.x,end.y-start.y)/4));
  for(let i=1;i<=steps;i++)if(below(i/steps)) {
    let lo=(i-1)/steps,hi=i/steps;
    for(let j=0;j<12;j++){const mid=(lo+hi)/2;if(below(mid))hi=mid;else lo=mid;}
    return {t:hi,...at(hi)};
  }
  return null;
}
