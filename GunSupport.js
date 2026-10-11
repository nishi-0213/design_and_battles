/** GUNは単一の2x2 HULLと外接範囲を完全一致させる。 */
export function gunSupported(gun, blocks) {
  return blocks.some(block => block.partId === '2x2'
    && Math.abs(block.x - gun.x) < 0.0001
    && Math.abs(block.y - gun.y) < 0.0001);
}
