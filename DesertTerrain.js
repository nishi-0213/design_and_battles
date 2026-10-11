// CPUの当たり判定とGLSL描画に同じ砂丘の高さ式を使う。
export function terrainHeight(x, z) {
  return 24 + 11 * Math.sin(x * 0.015 + Math.sin(z * 0.014) * 1.8)
    + 6 * Math.sin(x * 0.037 + z * 0.012) + 6 * Math.sin(z * 0.02);
}
export const terrainGLSL = `float heightAt(vec2 p) {
  return 24.0 + 11.0 * sin(p.x * 0.015 + sin(p.y * 0.014) * 1.8)
    + 6.0 * sin(p.x * 0.037 + p.y * 0.012) + 6.0 * sin(p.y * 0.02);
}`;

export function terrainProjection(width, height) {
  const depth = (105 - 24) / ((0.85 - 0.49) * 1.15);
  const worldPerPixel = 1.25 * depth / height;
  return {
    depth, worldPerPixel,
    groundAt(x) { return height * (0.49 + (105 - terrainHeight((x - width / 2) * worldPerPixel, depth - 80)) / (depth * 1.15)); },
  };
}
