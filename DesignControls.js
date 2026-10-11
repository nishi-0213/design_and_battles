import { fuelParts } from './FuelParts.js';
import './design.css';
import { hullParts } from './HullParts.js';
import { engineParts } from './EngineParts.js';
import { armorParts } from './ArmorParts.js';

const categories = ['HULL', 'ARMOR', 'ENGINE', 'FUEL', 'GUN', 'AMMO', 'CABIN', 'PLANE', 'MISSILE'];

/** カメラから独立した固定 UI。素材が決まったら各パネルに追加する。 */
export function createDesignControls(parent, onSelect, onSave, onList, onLoad, onDelete) {
  const root = document.createElement('section');
  root.className = 'design-ui';
  root.setAttribute('aria-label', '機体設計');
  const heading = document.createElement('h1');
  heading.textContent = 'DESIGN';
  const hint = document.createElement('p');
  hint.className = 'design-hint';
  hint.textContent = 'WASD: 移動 / ホイール: ズーム / R: 回転 / クリック: 配置 / Esc: 解除';
  const partButtons = [];
  const clearSelection = () => { partButtons.forEach((button) => button.setAttribute('aria-pressed', 'false')); deleteButton.setAttribute('aria-pressed', 'false'); };
  const nav = document.createElement('nav');
  nav.className = 'design-tabs';
  nav.setAttribute('aria-label', 'ブロックカテゴリ');
  const deleteRow = document.createElement('div');
  deleteRow.className = 'design-tab';
  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'DEL';
  deleteButton.setAttribute('aria-pressed', 'false');
  deleteButton.addEventListener('click', () => {
    const active = deleteButton.getAttribute('aria-pressed') !== 'true';
    if (onDelete() === false) { status.textContent = '持ち直したパーツを配置するか、Escで削除してください'; return; }
    clearSelection();
    deleteButton.setAttribute('aria-pressed', String(active));
    status.textContent = active ? 'DEL: クリックでブロックを削除 / Escで解除' : '削除モードを解除しました';
  });
  deleteRow.appendChild(deleteButton);
  nav.appendChild(deleteRow);
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
    if (name === 'HULL' || name === 'ARMOR' || name === 'ENGINE' || name === 'FUEL') {
      panel.classList.add('hull-panel');
      const list = document.createElement('div');
      list.className = 'hull-parts';
      for (const part of name === 'HULL' ? hullParts : name === 'ARMOR' ? armorParts : name === 'ENGINE' ? engineParts : fuelParts) {
        const choice = document.createElement('button');
        choice.type = 'button';
        choice.className = 'hull-choice';
        choice.dataset.part = part.id;
        choice.setAttribute('aria-pressed', 'false');
        const image = document.createElement('img');
        image.src = part.url;
        image.alt = '';
        image.width = part.width * 64;
        image.height = part.height * 64;
        const label = document.createElement('span');
        label.textContent = `${part.label}${part.category === 'ENGINE' ? ` (${part.width}x${part.height})` : ''}`;
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
      panel.style.top = `${Math.max(8, Math.min(rect.top, window.innerHeight - Math.min(name === 'HULL' || name === 'ARMOR' || name === 'ENGINE' || name === 'FUEL' ? 424 : 140, window.innerHeight - 16) - 8))}px`;
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
  nameInput.autocomplete = 'off';
  nameLabel.appendChild(nameInput);
  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.textContent = 'SAVE';
  const status = document.createElement('p');
  status.className = 'save-status';
  status.setAttribute('role', 'status');
  const loadArea = document.createElement('div');
  loadArea.className = 'ship-load';
  const loadButton = document.createElement('button');
  loadButton.type = 'button';
  loadButton.textContent = 'LOAD';
  loadButton.setAttribute('aria-expanded', 'false');
  loadButton.setAttribute('aria-controls', 'saved-ships');
  const shipList = document.createElement('div');
  shipList.id = 'saved-ships';
  shipList.className = 'saved-ships';
  shipList.setAttribute('aria-label', '保存された機体一覧');
  shipList.hidden = true;
  const closeList = () => { shipList.hidden = true; loadButton.setAttribute('aria-expanded', 'false'); };
  const renderList = () => {
    shipList.replaceChildren();
    try {
      const ships = onList();
      if (!ships.length) {
        const empty = document.createElement('p');
        empty.textContent = '保存された機体はありません';
        shipList.appendChild(empty);
      }
      for (const ship of ships) {
        const choice = document.createElement('button');
        choice.type = 'button';
        choice.className = 'saved-ship';
        choice.textContent = ship.name;
        choice.addEventListener('click', () => {
          try {
            status.textContent = onLoad(ship.name);
            closeList();
            loadButton.focus();
          } catch (error) { status.textContent = error.message; }
        });
        shipList.appendChild(choice);
      }
    } catch (error) {
      const message = document.createElement('p');
      message.textContent = error.message;
      shipList.appendChild(message);
    }
  };
  loadButton.addEventListener('click', () => {
    if (!shipList.hidden) { closeList(); return; }
    renderList();
    shipList.hidden = false;
    loadButton.setAttribute('aria-expanded', 'true');
    const available = Math.max(60, window.innerHeight - shipList.getBoundingClientRect().top - 16);
    shipList.style.maxHeight = `${Math.min(280, available)}px`;
  });
  const outsideClick = (event) => { if (!loadArea.contains(event.target)) closeList(); };
  const escapeList = (event) => {
    if (event.key === 'Escape' && !shipList.hidden) { closeList(); loadButton.focus(); }
  };
  document.addEventListener('pointerdown', outsideClick);
  document.addEventListener('keydown', escapeList);
  loadArea.append(loadButton, shipList);
  savePanel.append(nameLabel, saveButton, loadArea);
  savePanel.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) { status.textContent = '機体名を入力してください'; nameInput.focus(); return; }
    try { status.textContent = onSave(name); }
    catch (error) { status.textContent = error.message; }
    if (!shipList.hidden) renderList();
  });
  const stats = document.createElement('div');
  stats.className = 'design-stats';
  stats.setAttribute('aria-label', '機体ステータス');
  const mass = document.createElement('span');
  mass.textContent = 'MASS 0';
  const fuel = document.createElement('span');
  const thrust = document.createElement('span');
  fuel.textContent = 'FUEL 0';
  thrust.textContent = 'THRUST 0';
  stats.append(mass, fuel, thrust);
  root.append(heading, stats, hint, nav, savePanel, status);
  parent.appendChild(root);
  return { root, clearSelection, setStats(values) { mass.textContent = `MASS ${values.mass}`; fuel.textContent = `FUEL ${values.fuel}`; thrust.textContent = `THRUST ${values.thrust}`; }, setName(name) { nameInput.value = name; }, setStatus(message) { status.textContent = message; }, markSelected(id) { clearSelection(); partButtons.find(b => b.dataset.part === id)?.setAttribute('aria-pressed', 'true'); }, destroy() { document.removeEventListener('pointerdown', outsideClick); document.removeEventListener('keydown', escapeList); root.remove(); } };
}
