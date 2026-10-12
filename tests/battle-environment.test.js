import test from 'node:test';import assert from 'node:assert/strict';import {randomBattleEnvironment} from '../BattleEnvironment.js';
test('all map and time combinations can be selected independently',()=>{
 for(let map=0;map<2;map++)for(let phase=0;phase<3;phase++){const values=[(map+.5)/2,(phase+.5)/3,.25];assert.deepEqual(randomBattleEnvironment(()=>values.shift()),{map,phase,seed:250});}
 assert.deepEqual(randomBattleEnvironment(()=>0),{map:0,phase:0,seed:0});
});
