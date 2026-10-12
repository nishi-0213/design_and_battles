import { GRAVITY } from './FlightPhysics.js';
export function stepDebris(body,dt,groundAt) {
  body.vy+=GRAVITY*dt;body.x+=body.vx*dt;body.y+=body.vy*dt;body.angle+=body.omega*dt;body.life-=dt;
  const c=Math.abs(Math.cos(body.angle)),s=Math.abs(Math.sin(body.angle));
  const radius=(body.width*s+body.height*c)/2;
  const floor=groundAt(body.x);
  if(body.y+radius>=floor) {
    body.y=floor-radius;
    const slope=(groundAt(body.x+1)-groundAt(body.x-1))/2;
    const len=Math.hypot(slope,1),nx=slope/len,ny=-1/len;
    const normal=body.vx*nx+body.vy*ny;
    if(normal<0) {body.vx-=1.4*normal*nx;body.vy-=1.4*normal*ny;}
    const friction=Math.exp(-2.5*dt);body.vx*=friction;
    body.omega+=(body.vx/Math.max(radius,3)-body.omega)*Math.min(1,dt*5);
  }
  return body.life>0;
}
