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
 var alpha=(edge+glow)*(1.0-age);
 if(fx.uKind>0.5) {
   let smokeRadius=0.25+age*0.48+0.04*sin(atan2(p.y,p.x)*5.0+fx.uSeed);
   alpha=(1.0-smoothstep(smokeRadius-0.12,smokeRadius+0.05,d))*(1.0-age)*0.85;
   color=vec3f(0.012);
 }
 alpha=clamp(alpha,0.0,1.0);
 return vec4f(color*alpha,alpha);
}
