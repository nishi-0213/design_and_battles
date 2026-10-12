import { Container, Mesh, MeshGeometry, Shader, GlProgram, UniformGroup } from 'pixi.js';
import vertex from './shaders/projectile-light.vert?raw';
import fragment from './shaders/projectile-light.frag?raw';

export const phaseTint = [0xffffff,0xf4c8ae,0xadbdd2];
export function illuminatedTint(base,x,y,shots,phase,explosions=[]) {
  const radius=[100,135,180][phase],strength=[.2,.5,1.0][phase];
  let light=0;
  for(const shot of shots) {
    const d2=(shot.x-x)**2+(shot.y-y)**2;
    if(d2<radius*radius*4)light+=Math.exp(-d2/(radius*radius))*strength;
    if(light>=1.3)break;
  }
  light=Math.min(1.3,light);
  let explosionLight=0;
  for(const explosion of explosions) {
    const d2=(explosion.x-x)**2+(explosion.y-y)**2;
    explosionLight+=Math.exp(-d2/(explosion.radius**2))*explosion.intensity;
  }
  light=Math.min(2,light+explosionLight*[.8,1.0,1.4][phase]);
  const warmth=Math.min(.7,explosionLight*.3);
  const r=Math.min(255,Math.round((base>>16&255)+light*96));
  const g=Math.round(Math.min(255,(base>>8&255)+light*64)*(1-warmth)+240*warmth);
  const b=Math.round(Math.min(255,(base&255)+light*18)*(1-warmth)+155*warmth);
  return r<<16|g<<8|b;
}
export function createProjectileLights(stage) {
  const layer=new Container();layer.label='projectile-lens-flares';stage.addChild(layer);
  const maximum=256,positions=new Float32Array(maximum*8),uvs=new Float32Array(maximum*8),indices=new Uint32Array(maximum*6);
  for(let i=0;i<maximum;i++){uvs.set([0,0,1,0,1,1,0,1],i*8);indices.set([i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3],i*6);}
  const geometry=new MeshGeometry({positions,uvs,indices});
  const flareFlags=new Float32Array(maximum*4);
  geometry.addAttribute('aFlare',{buffer:flareFlags,format:'float32',stride:4});
  const trails=new Float32Array(maximum*12);geometry.addAttribute('aTrail',{buffer:trails,format:'float32x3',stride:12});
  const uniforms=new UniformGroup({uStrength:{value:1,type:'f32'}});
  const glProgram=GlProgram.from({vertex,fragment,preferredFragmentPrecision:'highp',name:'batched-projectile-lens-flares'});
  const shader=new Shader({glProgram,resources:{lightUniforms:uniforms}});
  const mesh=new Mesh({geometry,shader});mesh.blendMode='add';mesh.visible=false;layer.addChild(mesh);
  let count=0;
  return {
    draw(shots,camera,width,height,phase) {
      count=0;
      for(const shot of shots) {
        const x=shot.x-camera.x,y=shot.y-camera.y;
        if(x < -140||x > width+140||y < -140||y > height+140)continue;
        const half=(shot.group==='small'?160:220)*[.8,1,1.25][phase]/2;
        positions.set([x-half,y-half,x+half,y-half,x+half,y+half,x-half,y+half],count*8);
        flareFlags.fill(shot.flare?1:0,count*4,count*4+4);
        const streak=!shot.rocket&&!shot.flare;
        for(let v=0;v<4;v++)trails.set(streak?[-(shot.vx??0)*.012/half,-(shot.vy??0)*.012/half,(shot.group==='small'?3:4.5)/half]:[0,0,0],count*12+v*3);
        if(++count===maximum)break;
      }
      mesh.visible=count>0;geometry.indexCount=count*6;
      if(count){geometry.attributes.aPosition.buffer.update(count*8*4);geometry.attributes.aFlare.buffer.update(count*4*4);geometry.attributes.aTrail.buffer.update(count*12*4);}
      uniforms.uniforms.uStrength=[.45,.75,1.3][phase]*4;
    },
    get count(){return count;},
    get drawCalls(){return count?1:0;},
    destroy(){mesh.destroy();shader.destroy();geometry.destroy();layer.destroy({children:true});count=0;},
  };
}
