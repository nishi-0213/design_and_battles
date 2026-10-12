import {findPart} from './ArmorParts.js';
import {polygon,overlaps,contains} from './HullGeometry.js';
import {intersectsExhaust,EXHAUST_RADIUS,EXHAUST_ANGLE} from './RocketExhaust.js';
export function flareMounts(blocks) {
  const cells=[];
  for(const hull of blocks){const part=findPart(hull.partId);if(part?.category!=='HULL')continue;
    const sideways=hull.angle%180===90,width=sideways?part.height:part.width,height=sideways?part.width:part.height;
    for(let x=0;x<width;x++)for(let y=0;y<height;y++){
      const cell={x:hull.x+(x+.5-width/2)*64,y:hull.y+(y+.5-height/2)*64};
      if(overlaps(polygon(findPart('misc-FLARE'),cell.x,cell.y,0),polygon(part,hull.x,hull.y,hull.angle)))cells.push(cell);
    }
  }
  return cells;
}
export function flareSupported(flare,blocks){return flareMounts(blocks).some(cell=>Math.abs(cell.x-flare.x)<.0001&&Math.abs(cell.y-flare.y)<.0001);}
export function flareMountAt(pointer,blocks){return flareMounts(blocks).find(cell=>contains(polygon(findPart('misc-FLARE'),cell.x,cell.y,0),pointer))??null;}
export function flareSector(flare){
  const angle=(flare.angle||0)*Math.PI/180-Math.PI/2,dx=Math.cos(angle),dy=Math.sin(angle),offset=32/Math.max(Math.abs(dx),Math.abs(dy));
  return {x:flare.x+dx*offset,y:flare.y+dy*offset,direction:angle,radius:EXHAUST_RADIUS,halfAngle:EXHAUST_ANGLE/2};
}
export function blockedFlares(blocks){return blocks.filter(flare=>flare.partId==='misc-FLARE'&&blocks.some(block=>block!==flare&&intersectsExhaust(flareSector(flare),polygon(findPart(block.partId),block.x,block.y,block.angle))));}
