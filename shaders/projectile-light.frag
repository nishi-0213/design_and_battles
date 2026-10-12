in vec2 vUV;
in vec4 vColor;
out vec4 finalColor;
uniform float uStrength;
void main() {
  vec2 p=vUV*2.0-1.0;
  float radius=length(p);
  if(radius>=1.0)discard;
  float bloom=exp(-dot(p,p)*4.0);
  float glow=exp(-dot(p,p)*50.0);
  float horizontal=exp(-abs(p.y)*70.0-abs(p.x)*4.0);
  float vertical=exp(-abs(p.x)*70.0-abs(p.y)*4.0);
  float core=exp(-dot(p,p)*500.0);
  float circle=1.0-smoothstep(0.80,1.0,radius);
  float alpha=clamp((bloom*0.18+glow*0.35+(horizontal+vertical)*0.55+core)*uStrength,0.0,1.0)*circle;
  vec3 color=mix(vec3(1.0,0.73,0.22),vec3(1.0),clamp(core*2.0,0.0,1.0));
  finalColor=vec4(color*alpha,alpha)*vColor;
}
