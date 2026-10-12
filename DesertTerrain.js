// CPUの当たり判定とGLSL描画に同じ砂丘の高さ式を使う。
export function terrainHeight(x, z) {
  return 24 + 55 * Math.sin(x * 0.003 + Math.sin(z * 0.0028) * 1.8)
    + 30 * Math.sin(x * 0.0074 + z * 0.0024) + 30 * Math.sin(z * 0.004);
}
export const terrainGLSL = `float heightAt(vec2 p) {
  return 24.0 + 55.0 * sin(p.x * 0.003 + sin(p.y * 0.0028) * 1.8)
    + 30.0 * sin(p.x * 0.0074 + p.y * 0.0024) + 30.0 * sin(p.y * 0.004);
}`;

export function terrainProjection(width, height, zoom = 1) {
  const depth = (105 - 24) / ((0.85 - 0.49) * 1.15) / zoom;
  const originY = 24 + (105 - 24) / zoom;
  const worldPerPixel = 1.25 * depth / height;
  const z=depth-80,phase=Math.sin(z*.0028)*1.8,offset=30*Math.sin(z*.004);
  const groundAt = x => {
    const tx=(x-width/2)*worldPerPixel;
    const h=24+55*Math.sin(tx*.003+phase)+30*Math.sin(tx*.0074+z*.0024)+offset;
    const y=height*(.49+(originY-h)/(depth*1.15));
    return y;
  };
  groundAt.minimumY=height*(.49+(originY-(24+55+30+30))/(depth*1.15));
  return {
    depth, worldPerPixel,
    groundAt,
    projectLight(light) {
      // 空中の光源を直下の砂丘へ落とし、地形の3D座標で照明する。
      const altitude = Math.max(0, groundAt(light.x) - light.y);
      return [(light.x - width / 2) * worldPerPixel, depth - 80,
        light.radius * worldPerPixel * 10, light.intensity / (1 + altitude / 600)];
    },
  };
}
