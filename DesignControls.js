import './design.css';
import { hullParts } from './HullParts.js';

const categories = ['HULL', 'ARMOR', 'ENGINE', 'FUEL', 'GUN', 'AMMO', 'CABIN', 'PLANE', 'MISSILE'];

/** カメラから独立した固定 UI。素材が決まったら各パネルに追加する。 */
export function createDesignControls(parent, onSelect, onSave) {
  const root = document.createElement('section');
  root.className = 'design-ui';
  root.setAttribute('aria-label', '機体設計');
  const heading = document.createElement('h1');
  heading.textContent = 'DESIGN';
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
          if (onSelect(part) === false) { status.textContent = '持ち直したパーツを配置するか、Escで削除してください'; return; }
          clearSelection();
          choice.setAttribute('aria-pressed', 'true');
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
  const savePanel = document.createElement('form');
  savePanel.className = 'ship-save';
  const nameLabel = document.createElement('label');
  nameLabel.textContent = 'SHIP NAME';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.name = 'shipName';
  nameInput.maxLength = 100;
  nameInput.required = true;
  nameInput.autocomplete = 'off';
  nameLabel.appendChild(nameInput);
  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.textContent = 'SAVE';
  const status = document.createElement('p');
  status.className = 'save-status';
  status.setAttribute('role', 'status');
  savePanel.append(nameLabel, saveButton, status);
  savePanel.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) { status.textContent = '機体名を入力してください'; nameInput.focus(); return; }
    try { status.textContent = onSave(name); }
    catch (error) { status.textContent = error.message; }
  });
  root.append(heading, hint, nav, savePanel);
  parent.appendChild(root);
  return { root, clearSelection, setName(name) { nameInput.value = name; }, setStatus(message) { status.textContent = message; }, markSelected(id) { clearSelection(); partButtons.find(b => b.dataset.part === id)?.setAttribute('aria-pressed', 'true'); }, destroy() { root.remove(); } };
}
