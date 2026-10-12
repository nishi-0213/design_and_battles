in vec2 aPosition;
in vec2 aUV;
in float aFlare;
in vec3 aTrail;
out vec2 vUV;
out vec4 vColor;
out float vFlare;
out vec3 vTrail;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform vec4 uColor;
void main() {
  gl_Position=vec4((uProjectionMatrix*uWorldTransformMatrix*uTransformMatrix*vec3(aPosition,1.0)).xy,0.0,1.0);
  vUV=aUV;vColor=uColor*uWorldColorAlpha;vFlare=aFlare;vTrail=aTrail;
}
