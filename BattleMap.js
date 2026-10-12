import {bodyBounds} from './FlightPhysics.js';
export const battleMap={width:20000,height:10000};
export function battleSpawns(random=Math.random){const left=random()<.5;return {player:{x:left?600:19400,y:1200},enemy:{x:left?19400:600,y:1200}};}
export function confineToMap(body){const {halfWidth,halfHeight}=bodyBounds(body);for(const [axis,half,max,velocity] of [['x',halfWidth,battleMap.width,'vx'],['y',halfHeight,battleMap.height,'vy']]){const value=Math.max(half,Math.min(max-half,body[axis]));if(value!==body[axis]){body[axis]=value;body[velocity]=0;}}}
