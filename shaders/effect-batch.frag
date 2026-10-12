in vec2 vUV;
in vec3 vEffect;
in vec4 vColor;
out vec4 finalColor;
void main(){
  float age=clamp(vEffect.x,0.0,1.0),seed=vEffect.y,kind=vEffect.z;
  vec2 p=(vUV*2.0-1.0)*(kind<0.5?1.8:1.0);
  float d=length(p),alpha;
  vec3 color;
  if(kind<0.5){
    if(d>=1.8)discard;
    float radius=mix(0.08,0.73,1.0-exp(-age*22.0));
    float edge=1.0-smoothstep(radius-0.035,radius+0.035,d);
    float glow=exp(-max(0.0,d-radius)*12.0)*0.5;
    float bloom=exp(-d*d/max(0.03,radius*radius*2.2))*0.45;
    float fade=1.0-age;
    color=mix(vec3(1.0,0.33,0.035),vec3(0.38),smoothstep(0.2,0.8,age));
    color=mix(color,vec3(1.0),exp(-d*d/max(0.001,radius*radius*0.16))*(1.0-smoothstep(0.35,0.8,age)));
    float rim=1.0-smoothstep(1.35,1.8,d);
    alpha=clamp((edge+glow+bloom)*fade*rim,0.0,1.0);
    // 発光とBloomを同じ描画で合成し、粒子ごとの中間テクスチャを作らない。
    finalColor=vec4((color*edge+color*(glow+bloom)*1.7)*fade*rim,alpha)*vColor;
  }else{
    float field=0.0;
    for(int i=0;i<6;i++){
      float a=float(i)*1.0472+seed+age*0.7;
      vec2 center=vec2(cos(a),sin(a))*(0.18+age*0.12);
      float r=0.24+age*0.25+0.035*sin(age*9.0+float(i)+seed);
      field=max(field,1.0-smoothstep(r-0.14,r+0.10,length(p-center)));
    }
    float swirl=0.9+0.1*sin(p.x*12.0+sin(p.y*9.0+age*5.0)+seed);
    alpha=clamp(field*swirl*(1.0-age)*0.9,0.0,1.0);
    finalColor=vec4(vec3(0.012)*alpha,alpha)*vColor;
  }
}
