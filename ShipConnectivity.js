import { findPart } from './ArmorParts.js';
import { polygon, overlaps } from './HullGeometry.js';
import { canOverlap } from './PlacementRules.js';

function sharedEdge(a, b) {
  for (let i = 0; i < a.length; i++) {
    const p = a[i], q = a[(i + 1) % a.length];
    const dx = q.x - p.x, dy = q.y - p.y;
    const length = Math.hypot(dx, dy);
    for (let j = 0; j < b.length; j++) {
      const r = b[j], s = b[(j + 1) % b.length];
      const distance = v => Math.abs(dx * (v.y - p.y) - dy * (v.x - p.x)) / length;
      if (distance(r) > 0.0001 || distance(s) > 0.0001) continue;
      const project = v => ((v.x - p.x) * dx + (v.y - p.y) * dy) / length;
      const start = Math.min(project(r), project(s)), end = Math.max(project(r), project(s));
      if (Math.min(length, end) - Math.max(0, start) > 0.0001) return true;
    }
  }
  return false;
}

// 設計座標は戦闘中に変わらない。接続辺を一度作り、破壊後は生存ノードだけを探索する。
export function createBlockConnectivity(blocks) {
  const parts=blocks.map(block=>findPart(block.partId));
  const shapes=blocks.map((block,i)=>polygon(parts[i],block.x,block.y,block.angle));
  const edges=blocks.map(()=>[]),buckets=new Map(),cell=128;
  for(let i=0;i<blocks.length;i++) {
    const shape=shapes[i],xs=shape.map(p=>p.x),ys=shape.map(p=>p.y);
    const minX=Math.floor((Math.min(...xs)-.001)/cell),maxX=Math.floor((Math.max(...xs)+.001)/cell);
    const minY=Math.floor((Math.min(...ys)-.001)/cell),maxY=Math.floor((Math.max(...ys)+.001)/cell);
    const candidates=new Set(),keys=[];
    for(let x=minX;x<=maxX;x++)for(let y=minY;y<=maxY;y++){const key=x+','+y;keys.push(key);for(const j of buckets.get(key)??[])candidates.add(j);}
    for(const j of candidates)if(sharedEdge(shape,shapes[j])||(canOverlap(parts[i].category,parts[j].category)&&overlaps(shape,shapes[j]))){edges[i].push(j);edges[j].push(i);}
    for(const key of keys){if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(i);}
  }
  return {
    disconnectedIndices(isAlive=()=>true) {
      const active=blocks.map((_,i)=>isAlive(i)),start=blocks.findIndex((block,i)=>active[i]&&block.partId==='bridge');
      const reached=new Uint8Array(blocks.length),queue=[];
      if(start>=0){reached[start]=1;queue.push(start);}
      for(let q=0;q<queue.length;q++)for(const j of edges[queue[q]])if(active[j]&&!reached[j]){reached[j]=1;queue.push(j);}
      return blocks.map((_,i)=>i).filter(i=>active[i]&&!reached[i]);
    },
  };
}
export function disconnectedBlockIndices(blocks) {return createBlockConnectivity(blocks).disconnectedIndices();}
export function disconnectedBlocks(blocks) { return disconnectedBlockIndices(blocks).length; }
