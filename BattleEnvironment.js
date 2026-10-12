export const battleMaps=[{id:'desert',label:'DESERT'}];
export const battlePhases=['昼','夕方','夜'];
export function randomBattleEnvironment(random=Math.random) {
  return {map:Math.min(battleMaps.length-1,Math.floor(random()*battleMaps.length)),phase:Math.min(2,Math.floor(random()*3)),seed:random()*1000};
}
