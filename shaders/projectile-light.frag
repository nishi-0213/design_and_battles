in vec2 vTextureCoord;
out vec4 finalColor;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform float uStrength;
void main() {
  vec2 p=vTextureCoord*uInputSize.xy/uOutputFrame.zw*2.0-1.0;
  float halo=exp(-dot(p,p)*12.0);
  float horizontal=exp(-abs(p.y)*70.0-abs(p.x)*4.0);
  float vertical=exp(-abs(p.x)*70.0-abs(p.y)*4.0);
  float core=exp(-dot(p,p)*500.0);
  float alpha=clamp((halo*0.35+(horizontal+vertical)*0.55+core)*uStrength,0.0,1.0);
  vec3 color=mix(vec3(1.0,0.73,0.22),vec3(1.0,0.97,0.82),clamp(core*2.0,0.0,1.0));
  finalColor=vec4(color*alpha,alpha);
}
