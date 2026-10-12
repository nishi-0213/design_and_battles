/** PixiJSの描画FPSを表示。DOM画面ではブラウザーのフレーム数を測る。 */
export function createFpsDisplay(parent,getRendererFps) {
  const label=document.createElement('div');label.className='game-fps';label.textContent='FPS: --';parent.appendChild(label);
  let frameId=0,last=performance.now(),frames=0,sum=0,samples=0;
  const reset=()=>{last=performance.now();frames=0;sum=0;samples=0;};
  function update(now) {
    frames++;
    const fps=getRendererFps();
    if(Number.isFinite(fps)&&fps>0){sum+=fps;samples++;}
    if(now-last>=500){label.textContent=`FPS: ${Math.round(samples?sum/samples:frames*1000/(now-last))}`;reset();}
    frameId=requestAnimationFrame(update);
  }
  document.addEventListener('visibilitychange',reset);
  frameId=requestAnimationFrame(update);
  return {destroy(){cancelAnimationFrame(frameId);document.removeEventListener('visibilitychange',reset);label.remove();}};
}
