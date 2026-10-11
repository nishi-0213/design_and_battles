import './design.css';
import { hullParts } from './HullParts.js';

const categories = ['HULL', 'ARMOR', 'ENGINE', 'FUEL', 'GUN', 'AMMO', 'CABIN', 'PLANE', 'MISSILE'];

/** カメラから独立した固定 UI。素材が決まったら各パネルに追加する。 */
export function createDesignControls(parent, onSelect) {
  const root = document.createElement('section');
  root.className = 'design-ui';
  root.setAttribute('aria-label', '機体設計');
  const heading = document.createElement('h1');
  heading.textContent = 'HULL SIZE';
  const hint = document.createElement('p');
  hint.className = 'design-hint';
  hint.textContent = 'WASD: 移動 / ホイール: ズーム / R: 回転 / クリック: 配置 / Esc: 解除';
  const partButtons = [];
  const clearSelection = () => partButtons.forEach((button) => button.setAttribute('aria-pressed', 'false'));
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
    panel.appendChild(title);
    if (name === 'HULL') {
      panel.classList.add('hull-panel');
      const list = document.createElement('div');
      list.className = 'hull-parts';
      for (const part of hullParts) {
        const choice = document.createElement('button');
        choice.type = 'button';
        choice.className = 'hull-choice';
        choice.dataset.part = part.id;
        choice.setAttribute('aria-pressed', 'false');
        const image = document.createElement('img');
        image.src = part.url;
        image.alt = '';
        image.width = image.height = 64;
        const label = document.createElement('span');
        label.textContent = part.label;
        choice.append(image, label);
        choice.addEventListener('click', () => {
          clearSelection();
          choice.setAttribute('aria-pressed', 'true');
          onSelect(part);
          choice.blur();
        });
        partButtons.push(choice);
        list.appendChild(choice);
      }
      panel.appendChild(list);
    } else panel.appendChild(empty);
    item.append(button, panel);
    // CSS の hover/focus-within によりパネルへ移動しても表示を維持。
    const positionPanel = () => {
      const rect = button.getBoundingClientRect();
      panel.style.top = `${Math.max(8, Math.min(rect.top, window.innerHeight - Math.min(name === 'HULL' ? 424 : 140, window.innerHeight - 16) - 8))}px`;
    };
    item.addEventListener('pointerenter', positionPanel);
    button.addEventListener('focus', positionPanel);
    button.addEventListener('click', positionPanel);
    nav.appendChild(item);
  }
  root.append(heading, hint, nav);
  parent.appendChild(root);
  return { root, clearSelection, destroy() { root.remove(); } };
}
