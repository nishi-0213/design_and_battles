struct EffectUniforms { uAge:f32,uKind:f32,uSeed:f32 };
@group(1) @binding(0) var<uniform> fx:EffectUniforms;
@fragment fn mainFragment(@location(0) uv:vec2f)->@location(0) vec4f {
 let p=uv*gfu.uInputSize.xy/gfu.uOutputFrame.zw*2.0-vec2f(1.0);
 let age=clamp(fx.uAge,0.0,1.0);
 let radius=mix(0.08,0.73,1.0-exp(-age*22.0));
 let d=length(p);
 let edge=1.0-smoothstep(radius-0.035,radius+0.035,d);
 let glow=exp(-max(0.0,d-radius)*19.0)*(1.0-age)*0.35;
 var color=mix(vec3f(1.0,0.33,0.035),vec3f(0.38),smoothstep(0.2,0.8,age));
 color=mix(color,vec3f(1.0),exp(-d*d/max(0.001,radius*radius*0.16))*(1.0-smoothstep(0.35,0.8,age)));
 var alpha=(edge+glow)*(1.0-age);
 if(fx.uKind>0.5) {
   var field=0.0;
   for(var i:i32=0;i<6;i+=1) {
     let a=f32(i)*1.0472+fx.uSeed+age*0.7;
     let center=vec2f(cos(a),sin(a))*(0.18+age*0.12);
     let r=0.24+age*0.25+0.035*sin(age*9.0+f32(i)+fx.uSeed);
     field=max(field,1.0-smoothstep(r-0.14,r+0.10,length(p-center)));
   }
   let swirl=0.9+0.1*sin(p.x*12.0+sin(p.y*9.0+age*5.0)+fx.uSeed);
   alpha=field*swirl*(1.0-age)*0.9;
   color=vec3f(0.012);
 }
 alpha=clamp(alpha,0.0,1.0);
 return vec4f(color*alpha,alpha);
}
