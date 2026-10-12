in vec2 vUV;
in vec4 vColor;
out vec4 finalColor;
uniform float uTime;
uniform float uSeed;
void main() {
  float y=vUV.y;
  float wobble=(sin(uTime*17.0-y*17.0+uSeed)*0.07+sin(uTime*29.0-y*29.0+uSeed)*0.035)*y;
  float x=vUV.x-0.5-wobble;
  float width=max(0.015,0.27*(1.0-y)*(0.92+0.08*sin(y*35.0-uTime*32.0+uSeed)));
  float edge=1.0-smoothstep(width*0.65,width,abs(x));
  float halo=exp(-abs(x)/max(0.025,width)*3.0)*0.16;
  float fade=1.0-smoothstep(0.70,1.0,y);
  float white=exp(-x*x/max(0.0001,width*width*0.35))*(1.0-smoothstep(0.20,0.78,y));
  vec3 color=mix(vec3(1.0,0.52,0.07),vec3(1.0),white);
  float alpha=clamp(edge+halo,0.0,1.0)*fade;
  finalColor=vec4(color*alpha,alpha)*vColor;
}
