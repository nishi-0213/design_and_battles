import { Container, Sprite, Texture, Filter, GlProgram, UniformGroup } from 'pixi.js';
import {GlowFilter,AdvancedBloomFilter} from 'pixi-filters';
import vertex from './shaders/desert.vert?raw';
import fragment from './shaders/projectile-light.frag?raw';

export const phaseTint = [0xffffff,0xf4c8ae,0xadbdd2];
export function illuminatedTint(base,x,y,shots,phase,explosions=[]) {
  const radius=[100,135,180][phase],strength=[.2,.5,1.0][phase];
  let light=0;
  for(const shot of shots) {
    const d2=(shot.x-x)**2+(shot.y-y)**2;
    if(d2<radius*radius*4)light+=Math.exp(-d2/(radius*radius))*strength;
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
  const glow=new GlowFilter({distance:8,outerStrength:4,innerStrength:1,color:0xffdb65,quality:.2});
  const bloom=new AdvancedBloomFilter({threshold:.4,bloomScale:4,brightness:1,blur:3,quality:2});
  layer.filters=[glow,bloom];
  const lights=new Map();
  const glProgram=GlProgram.from({vertex,fragment,preferredFragmentPrecision:'highp',name:'projectile-lens-flare'});
  const remove=shot=>{const light=lights.get(shot);light.filter.destroy();light.sprite.destroy();lights.delete(shot);};
  return {
    draw(shots,camera,width,height,phase) {
      const visible=shots.filter(shot=>shot.x-camera.x>-100&&shot.x-camera.x<width+100&&shot.y-camera.y>-100&&shot.y-camera.y<height+100).slice(0,96);
      const current=new Set(visible);
      for(const shot of lights.keys())if(!current.has(shot))remove(shot);
      for(const shot of visible) {
        if(!lights.has(shot)) {
          const sprite=new Sprite(Texture.WHITE);sprite.anchor.set(.5);sprite.blendMode='add';
          const uniforms=new UniformGroup({uStrength:{value:1,type:'f32'}});
          const filter=new Filter({glProgram,resources:{lightUniforms:uniforms},padding:0,resolution:1});sprite.filters=[filter];
          lights.set(shot,{sprite,uniforms,filter});layer.addChild(sprite);
        }
        const light=lights.get(shot);light.sprite.position.set(shot.x-camera.x,shot.y-camera.y);
        const size=(shot.group==='small'?80:110)*[.8,1,1.25][phase];light.sprite.width=light.sprite.height=size;
        light.uniforms.uniforms.uStrength=[.45,.75,1.3][phase]*4;
      }
    },
    destroy(){for(const shot of lights.keys())remove(shot);layer.destroy({children:true});glow.destroy();bloom.destroy();},
  };
}
