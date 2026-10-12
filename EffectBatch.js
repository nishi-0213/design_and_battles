import {Mesh,MeshGeometry,Shader,GlProgram} from 'pixi.js';
import vertex from './shaders/effect-batch.vert?raw';
import fragment from './shaders/effect-batch.frag?raw';
export function createEffectBatch(stage,maximum=320){
  const positions=new Float32Array(maximum*8),uvs=new Float32Array(maximum*8),indices=new Uint32Array(maximum*6),data=new Float32Array(maximum*12);
  for(let i=0;i<maximum;i++){uvs.set([0,0,1,0,1,1,0,1],i*8);indices.set([i*4,i*4+1,i*4+2,i*4,i*4+2,i*4+3],i*6);}
  const geometry=new MeshGeometry({positions,uvs,indices});geometry.addAttribute('aEffect',{buffer:data,format:'float32x3',stride:12});
  const shader=new Shader({glProgram:GlProgram.from({vertex,fragment,preferredFragmentPrecision:'highp',name:'batched-explosion-smoke'})});
  const mesh=new Mesh({geometry,shader});mesh.visible=false;stage.addChild(mesh);let count=0;
  return {
    draw(particles,camera,width=Infinity,height=Infinity){
      count=0;
      for(const p of particles){if(p.kind==='debris')continue;const half=p.size/2*(p.kind==='flame'?1.8:1),x=p.x-camera.x,y=p.y-camera.y;
        if(x+half<0||y+half<0||x-half>width||y-half>height)continue;
        positions.set([x-half,y-half,x+half,y-half,x+half,y+half,x-half,y+half],count*8);
        for(let v=0;v<4;v++)data.set([1-p.life/p.maxLife,p.seed,p.kind==='flame'?0:1],count*12+v*3);
        if(++count===maximum)break;
      }
      mesh.visible=count>0;geometry.indexCount=count*6;
      if(count){geometry.attributes.aPosition.buffer.update(count*8*4);geometry.attributes.aEffect.buffer.update(count*12*4);}
    },
    get drawCalls(){return count?1:0;},
    get count(){return count;},
    destroy(){mesh.destroy();shader.destroy();geometry.destroy();},
  };
}
