// CPUの当たり判定とGLSL描画に同じ砂丘の高さ式を使う。
export function terrainHeight(x, z) {
  return 24 + 55 * Math.sin(x * 0.015 + Math.sin(z * 0.014) * 1.8)
    + 30 * Math.sin(x * 0.037 + z * 0.012) + 30 * Math.sin(z * 0.02);
}
export const terrainGLSL = `float heightAt(vec2 p) {
  return 24.0 + 55.0 * sin(p.x * 0.015 + sin(p.y * 0.014) * 1.8)
    + 30.0 * sin(p.x * 0.037 + p.y * 0.012) + 30.0 * sin(p.y * 0.02);
}`;

export function terrainProjection(width, height, zoom = 1) {
  const depth = (105 - 24) / ((0.85 - 0.49) * 1.15) / zoom;
  const originY = 24 + (105 - 24) / zoom;
  const worldPerPixel = 1.25 * depth / height;
  const groundAt = x => height * (0.49 + (originY - terrainHeight((x - width / 2) * worldPerPixel, depth - 80)) / (depth * 1.15));
  return {
    depth, worldPerPixel,
    groundAt,
    projectLight(light) {
      // 空中の光源を直下の砂丘へ落とし、地形の3D座標で照明する。
      const altitude = Math.max(0, groundAt(light.x) - light.y);
      return [(light.x - width / 2) * worldPerPixel, depth - 80,
        light.radius * worldPerPixel, light.intensity / (1 + altitude / 600)];
    },
  };
}
