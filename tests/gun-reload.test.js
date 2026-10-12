import test from 'node:test';import assert from 'node:assert/strict';import {rechargeGun,takeLoadedRounds} from '../GunReload.js';import {weaponProfile} from '../CombatWeapons.js';
test('single gun empties six rounds then waits one second for each replacement',()=>{
 const entry={part:{id:'gun-A-100'}},profile=weaponProfile(entry.part.id);for(let i=0;i<6;i++)assert.equal(takeLoadedRounds(entry,0,profile),1);assert.equal(takeLoadedRounds(entry,.99,profile),0);assert.equal(takeLoadedRounds(entry,1,profile),1);assert.equal(takeLoadedRounds(entry,1.5,profile),0);assert.equal(takeLoadedRounds(entry,2,profile),1);
});
test('gatling stores ten and full guns cannot bank extra reload time',()=>{
 const entry={part:{id:'gun-AK-200'}},profile=weaponProfile(entry.part.id);rechargeGun(entry,0,profile);rechargeGun(entry,100,profile);for(let i=0;i<10;i++)assert.equal(takeLoadedRounds(entry,100,profile),1);assert.equal(takeLoadedRounds(entry,100,profile),0);assert.equal(takeLoadedRounds(entry,100.5,profile),0);assert.equal(takeLoadedRounds(entry,101,profile),1);
});
test('six barrels reload individually and only actually fired rounds are spent',()=>{
 const entry={part:{id:'gun-AK-130-6'}},profile=weaponProfile(entry.part.id);assert.equal(takeLoadedRounds(entry,0,profile,2),2);assert.deepEqual(entry.reload.barrels,[5,5,6,6,6,6]);rechargeGun(entry,1,profile);assert.deepEqual(entry.reload.barrels,[6,6,6,6,6,6]);for(let i=0;i<6;i++)assert.equal(takeLoadedRounds(entry,1,profile),6);assert.equal(takeLoadedRounds(entry,1.9,profile),0);assert.equal(takeLoadedRounds(entry,2,profile),6);assert.equal(takeLoadedRounds(entry,2,profile),0);
});
