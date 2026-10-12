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
  float alpha=(edge+glow)*(1.0-age);
  if(uKind>0.5) {
    float smokeRadius=0.25+age*0.48+0.04*sin(atan(p.y,p.x)*5.0+uSeed);
    alpha=(1.0-smoothstep(smokeRadius-0.12,smokeRadius+0.05,d))*(1.0-age)*0.85;
    color=vec3(0.012);
  }
  alpha=clamp(alpha,0.0,1.0);
  finalColor=vec4(color*alpha,alpha);
}
