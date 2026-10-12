in vec2 vTextureCoord;
out vec4 finalColor;
uniform vec4 uInputSize;
uniform vec2 uResolution;
uniform float uTime;
uniform float uPhase;
uniform float uMap;
uniform float uSeed;
uniform vec2 uCamera;
uniform float uWorldPerPixel;
uniform float uZoom;
uniform int uLightCount;
uniform vec4 uLights[6];
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
float cityInterval(float value,float left,float right,float aa) {
    return smoothstep(left-aa,left+aa,value)*(1.0-smoothstep(right-aa,right+aa,value));
}
void main() {
    vec2 uv = vTextureCoord * uInputSize.xy / uResolution;
    uv.y += uCamera.y / uResolution.y;
    float aspect = uResolution.x / uResolution.y;
    float evening = 1.0 - abs(uPhase - 1.0);
    float night = max(uPhase - 1.0, 0.0);
    float day = 1.0 - evening - night;
    vec3 zenith = day * vec3(0.12,0.38,0.68) + evening * vec3(0.12,0.12,0.31) + night * vec3(0.008,0.018,0.055);
    vec3 haze = day * vec3(0.43,0.42,0.37) + evening * vec3(0.49,0.21,0.105) + night * vec3(0.055,0.073,0.11);
    if(uMap>0.5)haze=day*vec3(0.38,0.42,0.48)+evening*vec3(0.42,0.24,0.20)+night*vec3(0.045,0.065,0.105);
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
    vec3 origin = vec3(uCamera.x * uWorldPerPixel, 24.0+(105.0-24.0)/uZoom, -80.0);
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
        if(uMap>0.5)sand=day*vec3(0.43,0.44,0.39)+evening*vec3(0.39,0.27,0.21)+night*vec3(0.085,0.105,0.135);
        float ripples = sin(p.x * 0.7 + p.z * 0.17 + fbm(p.xz*0.025)*10.0);
        float detail = exp(-distance*0.002);
        sand *= (0.48+0.65*diffuse) * (0.94 + 0.06*ripples*detail);
        sand += vec3(0.06,0.04,0.015) * noise(p.xz*1.4) * detail * (1.0-night);
        float fog = 1.0-exp(-distance * mix(0.00065,0.0009,evening));
        color = mix(sand,haze,fog);
        // 直下の地面に置いた光源を3D空間で照らす。透視投影で遠景ほど小さくなる。
        float reflection=0.0;
        for(int i=0;i<6;i++) {
            if(i>=uLightCount)break;
            vec2 delta=(p.xz-uLights[i].xy)/max(1.0,uLights[i].z);
            reflection+=exp(-dot(delta,delta)*2.0)*uLights[i].w;
        }
        float visibleDistance=1.0-smoothstep(2200.0,3500.0,distance);
        color+=vec3(1.0,0.60,0.22)*min(0.32,reflection*(0.10+night*0.12))*(0.6+0.4*diffuse)*visibleDistance;
    }
    // 建物は遠景だけに描き、近い地形の背後へ隠す。カメラ移動で緩やかに視差を付ける。
    if(uMap>0.5&&(!hit||distance>3500.0)) {
        for(int layer=0;layer<3;layer++) {
            float depth=float(layer);
            float x=uv.x*aspect*(32.0-depth*6.0)+uCamera.x*uWorldPerPixel*(0.001+depth*0.0005);
            float cell=floor(x),local=fract(x);
            float variation=hash(vec2(cell,uSeed+depth*13.0));
            float base=0.510+depth*0.003;
            float height=0.014+variation*(0.018+depth*0.014);
            float roof=base-height;
            float aaX=max(0.001,(32.0-depth*6.0)/uResolution.y*0.65),aaY=max(0.0001,0.65/uResolution.y);
            float presence=step(0.63,hash(vec2(cell+72.0,uSeed+depth*17.0)));
            float silhouette=cityInterval(local,0.23,0.70,aaX)*cityInterval(uv.y,roof,base,aaY);
            // 段付きの屋上と細いアンテナ。
            silhouette=max(silhouette,cityInterval(local,0.42,0.49,aaX)*cityInterval(uv.y,roof-0.006,roof,aaY)*step(0.65,variation))*presence;
            vec3 building=mix(haze,vec3(0.045,0.055,0.075)*(1.0-night*0.55),0.35+depth*0.2);
            vec2 grid=vec2(local*7.0,(base-uv.y)/0.006);
            vec2 aaGrid=max(vec2(0.001),vec2(aaX*7.0,aaY/0.006));
            float window=cityInterval(fract(grid.x),0.30,0.58,aaGrid.x)*cityInterval(fract(grid.y),0.25,0.52,aaGrid.y);
            window*=step(0.55,hash(vec2(cell*9.0+floor(grid.x),floor(grid.y)+uSeed+depth)));
            building+=vec3(0.32,0.22,0.09)*window*(night+evening*0.4);
            color=mix(color,building,silhouette);
        }
    }
    // 地平線の大気散乱。水平線に薄い光を加える。
    float horizonGlow = exp(-abs(uv.y-0.49)*55.0);
    color += haze * horizonGlow * 0.018 * (1.0-night);
    float grain = (hash(uv*uResolution + fract(uTime)*10.0)-0.5)/255.0*(1.0-uMap);
    finalColor = vec4(clamp(color + grain,0.0,1.0),1.0);
}
