import './title.css';
import { createFleetEditor } from './FleetEditor.js';

/** タイトルと各モードの入口を管理する。設計内容は往復中も保持する。 */
export function createTitleScreen(parent = document.body) {
  const root = document.createElement('div');
  root.className = 'game-shell';
  root.innerHTML = `
    <main class="title-screen">
      <div class="title-content">
        <p class="title-caption">設計 ＆ 戦闘</p>
        <h1>DESIGN <span>&</span><br>BATTLES</h1>
        <nav aria-label="ゲームモード">
          <button type="button" data-mode="battle">BATTLE</button>
          <button type="button" data-mode="design">DESIGN</button>
        </nav>
        <p class="title-message" role="status"></p>
      </div>
    </main>
    <section class="battle-screen" aria-label="BATTLE" hidden>

    </section>
    <div class="design-screen" hidden></div>
    <button type="button" class="title-back" hidden>← TITLE</button>`;
  parent.appendChild(root);
  const title = root.querySelector('.title-screen');
  const battle = root.querySelector('.battle-screen');
  const design = root.querySelector('.design-screen');
  const back = root.querySelector('.title-back');
  const message = root.querySelector('.title-message');
  const buttons = [...root.querySelectorAll('[data-mode]')];
  let game;
  let destroyed = false;
  let previousMode = 'design';
  const fleet = createFleetEditor(battle, returnToTitle);
  function show(mode) {
    title.hidden = mode !== 'title';
    battle.hidden = mode !== 'battle';
    design.hidden = mode !== 'design';
    back.hidden = mode !== 'design';
    game?.setActive(mode === 'design');
    if (mode === 'title') root.querySelector(`[data-mode="${previousMode}"]`).focus();
    else if (mode === 'design') back.focus();
    else root.querySelector('.fleet-list').focus();
  }
  async function choose(event) {
    const mode = event.currentTarget.dataset.mode;
    previousMode = mode;
    if (mode === 'battle') { fleet.refresh(); show(mode); return; }
    buttons.forEach(button => { button.disabled = true; });
    message.textContent = '設計画面を読み込んでいます…';
    try {
      if (!game) {
        const { main } = await import('./Main.js');
        if (destroyed) return;
        const loaded = await main({ parent: design });
        if (destroyed) { loaded.destroy(); return; }
        game = loaded;
      }
      show(mode);
      message.textContent = '';
    } catch (error) {
      console.error(error);
      message.textContent = '設計画面を起動できませんでした。WebGLが有効なブラウザーでお試しください。';
    } finally { buttons.forEach(button => { button.disabled = false; }); }
  }
  function returnToTitle() { game?.placement.cancel(); show('title'); }
  buttons.forEach(button => button.addEventListener('click', choose));
  back.addEventListener('click', returnToTitle);
  return { destroy() { destroyed = true; fleet.destroy(); game?.destroy(); root.remove(); } };
}
