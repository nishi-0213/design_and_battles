struct GlobalFilterUniforms {
 uInputSize:vec4f, uInputPixel:vec4f, uInputClamp:vec4f,
 uOutputFrame:vec4f, uGlobalFrame:vec4f, uOutputTexture:vec4f,
};
@group(0) @binding(0) var<uniform> gfu: GlobalFilterUniforms;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var uSampler: sampler;
struct VSOutput { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn mainVertex(@location(0) aPosition:vec2f)->VSOutput {
 var p=aPosition*gfu.uOutputFrame.zw+gfu.uOutputFrame.xy;
 p.x=p.x*(2.0/gfu.uOutputTexture.x)-1.0;
 p.y=p.y*(2.0*gfu.uOutputTexture.z/gfu.uOutputTexture.y)-gfu.uOutputTexture.z;
 return VSOutput(vec4f(p,0.0,1.0),aPosition*(gfu.uOutputFrame.zw*gfu.uInputSize.zw));
}
