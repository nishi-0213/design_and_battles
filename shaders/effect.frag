in vec2 vTextureCoord;
out vec4 finalColor;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform float uAge;
uniform float uKind;
uniform float uSeed;
void main() {
  vec2 p=vTextureCoord*uInputSize.xy/uOutputFrame.zw*2.0-1.0;
  float age=clamp(uAge,0.0,1.0);
  float radius=mix(0.08,0.73,1.0-exp(-age*22.0));
  float d=length(p);
  float edge=1.0-smoothstep(radius-0.035,radius+0.035,d);
  float glow=exp(-max(0.0,d-radius)*19.0)*(1.0-age)*0.35;
  vec3 color=mix(vec3(1.0,0.33,0.035),vec3(0.38),smoothstep(0.2,0.8,age));
  color=mix(color,vec3(1.0),exp(-d*d/max(0.001,radius*radius*0.16))*(1.0-smoothstep(0.35,0.8,age)));
  float alpha=(edge+glow)*(1.0-age);
  if(uKind>0.5) {
    float field=0.0;
    for(int i=0;i<6;i++) {
      float a=float(i)*1.0472+uSeed+age*0.7;
      vec2 center=vec2(cos(a),sin(a))*(0.18+age*0.12);
      float r=0.24+age*0.25+0.035*sin(age*9.0+float(i)+uSeed);
      field=max(field,1.0-smoothstep(r-0.14,r+0.10,length(p-center)));
    }
    float swirl=0.9+0.1*sin(p.x*12.0+sin(p.y*9.0+age*5.0)+uSeed);
    alpha=field*swirl*(1.0-age)*0.9;
    color=vec3(0.012);
  }
  alpha=clamp(alpha,0.0,1.0);
  finalColor=vec4(color*alpha,alpha);
}
