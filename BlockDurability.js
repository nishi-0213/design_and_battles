export const GROUND_DAMAGE_PER_SECOND = 100;
export function blockMaxHp(part) {
  const area=part.width*part.height*(part.id.toLowerCase().endsWith('half')?.5:1);
  return area*100*(part.category==='ARMOR'?4:1);
}
export function applyGroundDamage(entry,seconds) {
  entry.hp=Math.max(0,entry.hp-GROUND_DAMAGE_PER_SECOND*seconds);
  return entry.hp===0;
}
