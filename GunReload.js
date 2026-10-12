export function rechargeGun(entry,time,profile) {
  const capacity=entry.part.id==='gun-AK-200'?10:6;
  if(!entry.reload)entry.reload={barrels:Array(profile.count).fill(capacity),capacity,updatedAt:time};
  const state=entry.reload,dt=Math.max(0,time-state.updatedAt);
  state.barrels=state.barrels.map(rounds=>Math.min(state.capacity,rounds+dt));
  state.updatedAt=time;return state;
}
export function takeLoadedRounds(entry,time,profile,limit=profile.count) {
  const state=rechargeGun(entry,time,profile);let shots=0;
  for(let i=0;i<state.barrels.length&&shots<limit;i++)if(state.barrels[i]>=1-1e-9){state.barrels[i]=Math.max(0,state.barrels[i]-1);shots++;}
  return shots;
}
