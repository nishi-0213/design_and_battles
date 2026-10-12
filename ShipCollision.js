function shape(entry,target) {
  const w=entry.part.width*32,h=entry.part.height*32;
  const corners=entry.part.id.toLowerCase().endsWith('half')?[[-w,-h],[-w,h],[w,h]]:[[-w,-h],[w,-h],[w,h],[-w,h]];
  const a=(entry.block.angle||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),bc=Math.cos(target.pose.angle),bs=Math.sin(target.pose.angle);
  const vertices=corners.map(([x,y])=>{
    const lx=(entry.block.x+c*x-s*y-target.pivot.x)*target.scale,ly=(entry.block.y+s*x+c*y-target.pivot.y)*target.scale;
    return {x:target.pose.x+bc*lx-bs*ly,y:target.pose.y+bs*lx+bc*ly};
  });
  return {vertices,left:Math.min(...vertices.map(p=>p.x)),right:Math.max(...vertices.map(p=>p.x)),top:Math.min(...vertices.map(p=>p.y)),bottom:Math.max(...vertices.map(p=>p.y))};
}
function contact(a,b) {
  if(a.left>b.right+.35||b.left>a.right+.35||a.top>b.bottom+.35||b.top>a.bottom+.35)return null;
  let best=null;
  for(const polygon of [a.vertices,b.vertices])for(let i=0;i<polygon.length;i++) {
    const p=polygon[i],q=polygon[(i+1)%polygon.length],len=Math.hypot(q.x-p.x,q.y-p.y);
    const nx=-(q.y-p.y)/len,ny=(q.x-p.x)/len;
    const aa=a.vertices.map(v=>v.x*nx+v.y*ny),bb=b.vertices.map(v=>v.x*nx+v.y*ny);
    const positive=Math.max(...bb)-Math.min(...aa),negative=Math.max(...aa)-Math.min(...bb);
    if(positive<-.35||negative<-.35)return null;
    const depth=Math.min(positive,negative),sign=positive<=negative?1:-1;
    if(!best||depth<best.depth)best={depth,nx:nx*sign,ny:ny*sign};
  }
  const support=(vertices,min)=>{
    const dots=vertices.map(v=>v.x*best.nx+v.y*best.ny),extreme=min?Math.min(...dots):Math.max(...dots);
    const edge=vertices.filter((_,i)=>Math.abs(dots[i]-extreme)<.001);
    return {x:edge.reduce((sum,p)=>sum+p.x,0)/edge.length,y:edge.reduce((sum,p)=>sum+p.y,0)/edge.length};
  };
  const pa=support(a.vertices,true),pb=support(b.vertices,false);
  return {...best,x:(pa.x+pb.x)/2,y:(pa.y+pb.y)/2};
}
export function shipContacts(a,b) {
  const shapes=t=>t.entries.flatMap((entry,index)=>entry.destroyed?[]:[{entry,index,...shape(entry,t)}]);
  const as=shapes(a),bs=shapes(b),hits=[];
  if(!as.length||!bs.length)return hits;
  const bounds=ss=>({left:Math.min(...ss.map(s=>s.left)),right:Math.max(...ss.map(s=>s.right)),top:Math.min(...ss.map(s=>s.top)),bottom:Math.max(...ss.map(s=>s.bottom))});
  const ab=bounds(as),bb=bounds(bs);
  if(ab.left>bb.right+.35||bb.left>ab.right+.35||ab.top>bb.bottom+.35||bb.top>ab.bottom+.35)return hits;
  for(const sa of as)for(const sb of bs) {
    const hit=contact(sa,sb);
    if(hit)hits.push({...hit,a:sa.entry,b:sb.entry,key:`${sa.index}:${sb.index}`});
  }
  return hits;
}
export function shipContactSpeed(hit,a,b) {
  const velocity=body=>({x:body.vx-body.omega*(hit.y-body.y),y:body.vy+body.omega*(hit.x-body.x)});
  const av=velocity(a),bv=velocity(b),x=av.x-bv.x,y=av.y-bv.y;
  const closing=Math.max(0,-(x*hit.nx+y*hit.ny)),tangent=Math.abs(-x*hit.ny+y*hit.nx);
  return {closing,speed:Math.hypot(closing,tangent*.25)};
}
// 敵の保持位置は固定。自艦へ質量・慣性に応じた反力と摩擦を返す。
export function resolveShipContact(body,hit) {
  const rx=hit.x-body.x,ry=hit.y-body.y,inertia=Math.max(1,body.inertia??body.mass*(body.width**2+body.height**2)/12);
  body.x+=hit.nx*Math.max(0,hit.depth);body.y+=hit.ny*Math.max(0,hit.depth);
  const speed=(nx,ny)=>(body.vx-body.omega*ry)*nx+(body.vy+body.omega*rx)*ny;
  const normal=speed(hit.nx,hit.ny);
  if(normal>=0)return;
  const impulse=(nx,ny,j)=>{body.vx+=nx*j/body.mass;body.vy+=ny*j/body.mass;body.omega+=(rx*ny-ry*nx)*j/inertia;};
  const arm=rx*hit.ny-ry*hit.nx,j=-normal*1.1/(1/body.mass+arm*arm/inertia);
  impulse(hit.nx,hit.ny,j);
  const tx=-hit.ny,ty=hit.nx,tangentArm=rx*ty-ry*tx;
  const friction=-speed(tx,ty)/(1/body.mass+tangentArm*tangentArm/inertia);
  impulse(tx,ty,Math.max(-j*.3,Math.min(j*.3,friction)));
}
export function shipCollisionDamage(entry,dt,speed,impact) {
  entry.hp=Math.max(0,entry.hp-100*Math.max(.1,Math.min(10,speed/100))*dt-.0025*impact*impact);
  return entry.hp===0;
}
