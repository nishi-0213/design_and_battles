export function selectGroundLights(lights,camera,width,groundAt) {
  const score=light=>light.intensity/(1+Math.abs(light.y-groundAt(light.x))/light.radius);
  const candidates=lights.filter(light=>light.x+light.radius*10>camera.x&&light.x-light.radius*10<camera.x+width).sort((a,b)=>score(b)-score(a));
  const selected=[];
  for(const light of candidates) {
    if(selected.some(other=>other.type===light.type&&Math.hypot(other.x-light.x,other.y-light.y)<300))continue;
    selected.push(light);if(selected.length===6)break;
  }
  return selected;
}
