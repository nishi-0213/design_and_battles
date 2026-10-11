in vec2 vTextureCoord;
out vec4 finalColor;
uniform vec4 uInputSize;
uniform vec2 uResolution;
uniform float uTime;
uniform float uPhase;
uniform vec2 uCamera;
uniform float uWorldPerPixel;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p) {
    float n = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { n += a * noise(p); p = p * 2.03 + 7.1; a *= 0.5; }
    return n;
}
/* TERRAIN_HEIGHT */
void main() {
    vec2 uv = vTextureCoord * uInputSize.xy / uResolution;
    uv.y += uCamera.y / uResolution.y;
    float aspect = uResolution.x / uResolution.y;
    float evening = 1.0 - abs(uPhase - 1.0);
    float night = max(uPhase - 1.0, 0.0);
    float day = 1.0 - evening - night;
    vec3 zenith = day * vec3(0.12,0.38,0.68) + evening * vec3(0.12,0.12,0.31) + night * vec3(0.008,0.018,0.055);
    vec3 haze = day * vec3(0.85,0.80,0.65) + evening * vec3(1.0,0.39,0.14) + night * vec3(0.09,0.13,0.22);
    float skyGradient = pow(clamp(uv.y / 0.52, 0.0, 1.0), 1.6);
    vec3 color = mix(zenith, haze, skyGradient);
    vec2 lightPos = vec2(0.76, mix(0.20, 0.43, evening));
    vec2 lightDelta = (uv - lightPos) * vec2(aspect, 1.0);
    float lightDist = length(lightDelta);
    float sun = 1.0 - smoothstep(0.018, 0.023, lightDist);
    float glow = exp(-lightDist * 13.0);
    color += (day + evening) * (sun * vec3(1.0,0.8,0.46) + glow * vec3(0.28,0.16,0.06));
    vec2 moonDelta = (uv - vec2(0.76,0.19)) * vec2(aspect,1);
    float moon = 1.0 - smoothstep(0.022,0.025,length(moonDelta));
    float crater = 0.85 + 0.15 * noise(moonDelta * 370.0);
    color = mix(color, vec3(0.8,0.86,0.92) * crater, moon * night);
    vec2 starUV = uv * vec2(aspect,1.0) * 320.0;
    vec2 starCell = floor(starUV);
    vec2 starOffset = fract(starUV) - vec2(hash(starCell),hash(starCell + 5.3));
    float stars = step(0.982,hash(starCell + 11.2)) * exp(-dot(starOffset,starOffset)*100.0);
    color += stars * night * (1.0-skyGradient) * (0.7+0.3*sin(uTime*0.7+hash(starCell)*6.28));
    float clouds = fbm(vec2(uv.x * aspect * 3.0, uv.y * 9.0));
    float cloudMask = smoothstep(0.53,0.72,clouds) * (1.0-smoothstep(0.35,0.55,uv.y));
    vec3 cloudColor = day * vec3(0.96,0.91,0.80) + evening * vec3(0.66,0.27,0.22) + night * vec3(0.13,0.16,0.22);
    color = mix(color,cloudColor,cloudMask * 0.6);
    // 背景カメラは固定し、自動スクロールしない。
    vec3 origin = vec3(uCamera.x * uWorldPerPixel, 105.0, -80.0);
    vec3 ray = normalize(vec3((uv.x-0.5)*aspect*1.25, (0.49-uv.y)*1.15, 1.0));
    float distance = 0.0;
    bool hit = false;
    vec3 p = origin;
    if (ray.y < 0.03) {
        for (int i=0; i<40; i++) {
            p = origin + ray * distance;
            float gap = p.y - heightAt(p.xz);
            if (gap < 0.65) { hit = true; break; }
            distance += max(2.0, gap * 0.95);
            if (distance > 4500.0) break;
        }
    }
    // 遠景で反復上限に達した場合も、地平線以下を地表で埋める。
    if (!hit && ray.y < 0.0) {
        distance = (origin.y - 16.0) / max(-ray.y, 0.001);
        p = origin + ray * distance;
        hit = true;
    }
    if (hit) {
        float h = heightAt(p.xz);
        vec3 normal = normalize(vec3(h-heightAt(p.xz+vec2(2,0)),2.0,h-heightAt(p.xz+vec2(0,2))));
        vec3 light = normalize(vec3(-0.6, mix(0.85,0.15,evening),-0.4));
        float diffuse = max(dot(normal,light),0.0);
        vec3 sand = day * vec3(0.76,0.53,0.27) + evening * vec3(0.67,0.27,0.13) + night * vec3(0.10,0.13,0.19);
        float ripples = sin(p.x * 0.7 + p.z * 0.17 + fbm(p.xz*0.025)*10.0);
        float detail = exp(-distance*0.002);
        sand *= (0.48+0.65*diffuse) * (0.94 + 0.06*ripples*detail);
        sand += vec3(0.06,0.04,0.015) * noise(p.xz*1.4) * detail * (1.0-night);
        float fog = 1.0-exp(-distance * mix(0.00065,0.0009,evening));
        color = mix(sand,haze,fog);
    }
    // 地平線の大気散乱。水平線に薄い光を加える。
    float horizonGlow = exp(-abs(uv.y-0.49)*55.0);
    color += haze * horizonGlow * 0.09 * (1.0-night);
    float grain = (hash(uv*uResolution + fract(uTime)*10.0)-0.5)/255.0;
    finalColor = vec4(clamp(color + grain,0.0,1.0),1.0);
}
