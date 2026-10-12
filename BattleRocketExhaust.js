import {Container,Mesh,MeshGeometry,Shader,GlProgram,UniformGroup} from 'pixi.js';
import {GlowFilter,AdvancedBloomFilter} from 'pixi-filters';
import vertex from './shaders/rocket.vert?raw';
import fragment from './shaders/rocket.frag?raw';

export function createRocketExhaust(stage) {
  const layer=new Container();layer.label='rocket-exhaust';stage.addChild(layer);
  const glow=new GlowFilter({distance:8,outerStrength:2,innerStrength:.7,color:0xffa033,quality:.2});
  const bloom=new AdvancedBloomFilter({threshold:.35,bloomScale:1.4,brightness:1.15,blur:3,quality:2});
  layer.filters=[glow,bloom];
  const geometry=new MeshGeometry({positions:new Float32Array([-.5,0,.5,0,.5,1,-.5,1]),uvs:new Float32Array([0,0,1,0,1,1,0,1])});
  const glProgram=GlProgram.from({vertex,fragment,preferredFragmentPrecision:'highp',name:'rocket-exhaust'});
  const flames=new Map();let lights=[];
  const remove=entry=>{const flame=flames.get(entry);flame.mesh.destroy();flame.shader.destroy();flames.delete(entry);};
  return {
    draw(targets,camera,time) {
      const active=new Set();lights=[];
      for(const target of targets)for(const entry of target.entries) {
        if(entry.destroyed||entry.part.category!=='ENGINE')continue;
        active.add(entry);
        if(!flames.has(entry)) {
          const uniforms=new UniformGroup({uTime:{value:0,type:'f32'},uSeed:{value:Math.random()*6.28,type:'f32'}});
          const shader=new Shader({glProgram,resources:{exhaustUniforms:uniforms}});
          const mesh=new Mesh({geometry,shader});layer.addChild(mesh);flames.set(entry,{mesh,shader,uniforms});
        }
        const flame=flames.get(entry),scale=target.container.scale.x,pose=target.pose;
        const lx=(entry.block.x-target.container.pivot.x)*scale,ly=(entry.block.y-target.container.pivot.y)*scale;
        const c=Math.cos(pose.angle),s=Math.sin(pose.angle),angle=pose.angle+entry.sprite.rotation;
        const nx=-Math.sin(angle),ny=Math.cos(angle),nozzle=entry.part.height*64*scale*.43;
        const x=pose.x+c*lx-s*ly+nx*nozzle,y=pose.y+s*lx+c*ly+ny*nozzle;
        const width=entry.part.width*64*scale*.65,length=entry.part.height*64*scale*1.7*(1+.05*Math.sin(time*23+flame.uniforms.uniforms.uSeed));
        flame.mesh.position.set(x-camera.x,y-camera.y);flame.mesh.rotation=angle;flame.mesh.scale.set(width,length);flame.uniforms.uniforms.uTime=time;
        lights.push({x:x+nx*length*.3,y:y+ny*length*.3,radius:Math.max(350,length*1.8),intensity:.65});
      }
      for(const entry of flames.keys())if(!active.has(entry))remove(entry);
    },
    get lights(){return lights;},
    get count(){return flames.size;},
    destroy(){for(const entry of flames.keys())remove(entry);geometry.destroy();layer.destroy({children:true});glow.destroy();bloom.destroy();lights=[];},
  };
}
