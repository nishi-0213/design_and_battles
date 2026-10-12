import {Container,Sprite,Texture,Rectangle,Graphics} from 'pixi.js';
import {stepDebris} from './DebrisPhysics.js';
import {createEffectBatch} from './EffectBatch.js';

const explosive = new Set(['FUEL','GUN','AMMO','ENGINE']);
export function createDestructionEffects(stage) {
  const layer=new Container();layer.label='destruction-effects';stage.addChild(layer);
  const particles=[];
  const batch=createEffectBatch(layer);
  function remove(index) {
    const p=particles.splice(index,1)[0];p.sprite?.destroy({children:true});p.ownedTexture?.destroy();
  }
  function add(p) {
    if(particles.length>=320)remove(0);
    particles.push(p);if(p.sprite)layer.addChild(p.sprite);
  }
  function shaderParticle(x,y,vx,vy,size,life,kind) {
    add({x,y,vx,vy,size,life,maxLife:life,seed:Math.random()*6.28,kind:kind===0?'flame':'smoke'});
  }
  function debris(sprite,x,y,vx,vy,width,height,angle,omega,ownedTexture=null) {
    sprite.tint=0x050505;sprite.rotation=angle;
    add({sprite,x,y,vx,vy,width,height,angle,omega,life:7+Math.random()*3,maxLife:10,kind:'debris',ownedTexture});
  }
  return {
    impact(x,y,scale=1) { shaderParticle(x,y,0,0,100*scale,.35,0); },
    spawn(entry,body,scale,pivot) {
      const lx=(entry.block.x-pivot.x)*scale,ly=(entry.block.y-pivot.y)*scale;
      const c=Math.cos(body.angle),s=Math.sin(body.angle),rx=c*lx-s*ly,ry=s*lx+c*ly;
      const x=body.x+rx,y=body.y+ry,vx=body.vx-body.omega*ry,vy=body.vy+body.omega*rx;
      const width=entry.part.width*64*scale,height=entry.part.height*64*scale;
      const angle=body.angle+entry.sprite.rotation;
      if(!explosive.has(entry.part.category)) {
        const sprite=new Sprite(entry.sprite.texture);sprite.anchor.set(.5);sprite.width=width;sprite.height=height;
        if(entry.part.id.toLowerCase().endsWith('half')) {
          const w=sprite.texture.width/2,h=sprite.texture.height/2;
          const mask=new Graphics().poly([-w,-h,-w,h,w,h]).fill(0xffffff);sprite.addChild(mask);sprite.mask=mask;
        }
        debris(sprite,x,y,vx,vy,width,height,angle,body.omega);
        return;
      }
      shaderParticle(x,y,0,0,Math.max(width,height)*3.5,.9,0);
      for(let i=0;i<3;i++) {
        const a=Math.PI*2*i/3+Math.random()*.2,speed=60+Math.random()*100;
        shaderParticle(x,y,vx+Math.cos(a)*speed,vy+Math.sin(a)*speed-35,50+Math.random()*40,2.2+Math.random()*1.3,1);
      }
      // 元のブロックを2分割した黒い残骸も爆発で四散する。
      const original=entry.sprite.texture,frame=original.frame;
      for(let col=0;col<2;col++) {
        const texture=new Texture({source:original.source,frame:new Rectangle(frame.x+frame.width*col/2,frame.y,frame.width/2,frame.height)});
        const sprite=new Sprite(texture);sprite.anchor.set(.5);sprite.width=width/2;sprite.height=height;
        const a=(col===0?Math.PI:0)+angle,speed=90+Math.random()*90;
        debris(sprite,x+Math.cos(a)*width*.2,y+Math.sin(a)*height*.2,vx+Math.cos(a)*speed,vy+Math.sin(a)*speed,width/2,height,angle,body.omega+(Math.random()-.5)*8,texture);
      }
      for(let i=0;i<4;i++) {
        const w=3+Math.random()*5,h=8+Math.random()*16;
        const sprite=new Graphics();
        if(i%2) sprite.rect(-w/2,-h/2,w,h).fill(0x050505);
        else sprite.poly([-w,-h/2,w,-h/2,0,h/2]).fill(0x050505);
        const a=Math.random()*Math.PI*2,speed=100+Math.random()*180;
        debris(sprite,x,y,vx+Math.cos(a)*speed,vy+Math.sin(a)*speed,w,h,a,(Math.random()-.5)*12);
      }
    },
    step(dt,groundAt) {
      for(let i=particles.length-1;i>=0;i--) {
        const p=particles[i];
        if(p.kind==='debris') {if(!stepDebris(p,dt,groundAt)){remove(i);continue;}}
        else {
          p.life-=dt;if(p.life<=0){remove(i);continue;}
          if(p.kind==='smoke'){p.vy-=12*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-.6*dt);}
        }
      }
    },
    draw(camera,width=Infinity,height=Infinity) {
      batch.draw(particles,camera,width,height);
      for(const p of particles) {
        if(p.kind==='debris'){p.sprite.position.set(p.x-camera.x,p.y-camera.y);p.sprite.rotation=p.angle;p.sprite.alpha=Math.min(1,p.life);const radius=Math.hypot(p.width,p.height)/2+2;p.sprite.visible=p.x-camera.x+radius>=0&&p.y-camera.y+radius>=0&&p.x-camera.x-radius<=width&&p.y-camera.y-radius<=height;}
      }
    },
    get lights(){return particles.filter(p=>p.kind==='flame').map(p=>({x:p.x,y:p.y,radius:p.size*2.6,intensity:3*Math.pow(p.life/p.maxLife,1.5)}));},
    get drawCalls(){return batch.drawCalls;},
    get counts() {return {debris:particles.filter(p=>p.kind==='debris').length,flames:particles.filter(p=>p.kind==='flame').length,smoke:particles.filter(p=>p.kind==='smoke').length};},
    destroy() {while(particles.length)remove(particles.length-1);batch.destroy();layer.destroy({children:true});},
  };
}
