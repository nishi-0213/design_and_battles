export function createFlightBody(x, y, width, height, mass = 1) {
  return { x, y, vx: 0, vy: 0, angle: 0, omega: 0, width, height, mass: Math.max(1,mass) };
}
export function bodyBounds(body) {
  const c = Math.abs(Math.cos(body.angle)), s = Math.abs(Math.sin(body.angle));
  return { halfWidth: (body.width*c+body.height*s)/2, halfHeight: (body.width*s+body.height*c)/2 };
}
const cross = (x,y,a,b) => x*b-y*a;
/** 重力、機体座標の推力、回転トルクと地形接触を同じ剛体へ適用する。 */
export function stepFlight(body, input, dt, groundAt) {
  const length = Math.max(1, Math.hypot(input.x,input.y));
  const c = Math.cos(body.angle), s = Math.sin(body.angle);
  const ax = input.x/length*700, ay = input.y/length*700;
  body.vx += (c*ax-s*ay)*dt;
  body.vy += (s*ax+c*ay+240)*dt;
  const drag = Math.exp(-0.22*dt);
  body.vx *= drag; body.vy *= drag;
  body.omega = (body.omega + input.turn*3.2*dt)*Math.exp(-0.8*dt);
  body.x += body.vx*dt; body.y += body.vy*dt;
  body.angle = Math.atan2(Math.sin(body.angle+body.omega*dt),Math.cos(body.angle+body.omega*dt));
  // 回転した矩形の全辺を検査し、接触点で並進・回転の反力を計算する。
  const cos = Math.cos(body.angle), sin = Math.sin(body.angle);
  let penetration = 0, contact = null;
  const corners = [[-body.width/2,-body.height/2],[body.width/2,-body.height/2],[body.width/2,body.height/2],[-body.width/2,body.height/2]];
  const points = body.collisionPoints ?? corners.flatMap((a,edge) => {
    const b=corners[(edge+1)%4],steps=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/4);
    return Array.from({length:steps+1},(_,i)=>({x:a[0]+(b[0]-a[0])*i/steps,y:a[1]+(b[1]-a[1])*i/steps}));
  });
  for(const point of points) {
    const rx=cos*point.x-sin*point.y,ry=sin*point.x+cos*point.y;
    const depth=body.y+ry-groundAt(body.x+rx);
    if(depth>penetration) {penetration=depth;contact={rx,ry};}
  }
  if(!contact) return;
  body.y-=penetration;
  const {rx,ry}=contact;
  const slope=(groundAt(body.x+rx+1)-groundAt(body.x+rx-1))/2;
  const norm=Math.hypot(slope,1), nx=slope/norm, ny=-1/norm;
  const inertia=body.mass*(body.width**2+body.height**2)/12;
  const impulse = (dx,dy,amount) => {body.vx+=dx*amount/body.mass;body.vy+=dy*amount/body.mass;body.omega+=cross(rx,ry,dx,dy)*amount/inertia;};
  const contactV = () => ({x:body.vx-body.omega*ry,y:body.vy+body.omega*rx});
  let velocity=contactV();const normalSpeed=velocity.x*nx+velocity.y*ny;
  if(normalSpeed<0) {
    const arm=cross(rx,ry,nx,ny);
    const j=-normalSpeed/(1/body.mass+arm*arm/inertia);
    impulse(nx,ny,j);
    const tx=-ny,ty=nx;velocity=contactV();
    const tangentArm=cross(rx,ry,tx,ty);
    const friction=-(velocity.x*tx+velocity.y*ty)/(1/body.mass+tangentArm*tangentArm/inertia);
    impulse(tx,ty,Math.max(-j*0.45,Math.min(j*0.45,friction)));
  }
}
