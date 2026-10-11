import './design.css';

const categories = ['HULL', 'ARMOR', 'ENGINE', 'FUEL', 'GUN', 'AMMO', 'CABIN', 'PLANE', 'MISSILE'];

/** カメラから独立した固定 UI。素材が決まったら各パネルに追加する。 */
export function createDesignControls(parent) {
  const root = document.createElement('section');
  root.className = 'design-ui';
  root.setAttribute('aria-label', '機体設計');
  const heading = document.createElement('h1');
  heading.textContent = 'HULL SIZE';
  const hint = document.createElement('p');
  hint.className = 'design-hint';
  hint.textContent = 'WASD: 移動　 /　 ホイール: 拡大・縮小';
  const nav = document.createElement('nav');
  nav.className = 'design-tabs';
  nav.setAttribute('aria-label', 'ブロックカテゴリ');
  for (const name of categories) {
    const item = document.createElement('div');
    item.className = 'design-tab';
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = name;
    button.setAttribute('aria-controls', `parts-${name.toLowerCase()}`);
    const panel = document.createElement('section');
    panel.id = `parts-${name.toLowerCase()}`;
    panel.className = 'parts-panel';
    panel.setAttribute('aria-label', `${name} パーツ`);
    const title = document.createElement('h2');
    title.textContent = name;
    const empty = document.createElement('p');
    empty.textContent = 'パーツはまだ登録されていません';
    panel.append(title, empty);
    item.append(button, panel);
    // CSS の hover/focus-within によりパネルへ移動しても表示を維持。
    const positionPanel = () => {
      const rect = button.getBoundingClientRect();
      panel.style.top = `${Math.max(8, Math.min(rect.top, window.innerHeight - 148))}px`;
    };
    item.addEventListener('pointerenter', positionPanel);
    button.addEventListener('focus', positionPanel);
    button.addEventListener('click', positionPanel);
    nav.appendChild(item);
  }
  root.append(heading, hint, nav);
  parent.appendChild(root);
  return { root, destroy() { root.remove(); } };
}
