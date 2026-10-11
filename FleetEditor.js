import { listShips, loadShip } from './ShipStorage.js';
import { shipStats } from './ShipStats.js';
import { findPart } from './ArmorParts.js';
import './fleet.css';

const LIMIT = 5; // 編成上限は参考画面に合わせた仮値。
const number = value => Number(value.toFixed(2));
const layer = part => part.category === 'MISSILE' || part.engineType === 'fixed' ? 0 : ['HULL', 'BRIDGE'].includes(part.category) ? 1 : part.category === 'ARMOR' ? 2 : 3;
function preview(ship) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-label', `${ship.name}の機体プレビュー`);
  svg.setAttribute('role', 'img');
  const blocks = ship.blocks.map(block => ({ ...block, part: findPart(block.partId) }));
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  for (const block of blocks) {
    const rotated = block.angle % 180 !== 0;
    const w = (rotated ? block.part.height : block.part.width) * 64;
    const h = (rotated ? block.part.width : block.part.height) * 64;
    left = Math.min(left, block.x - w / 2); right = Math.max(right, block.x + w / 2);
    top = Math.min(top, block.y - h / 2); bottom = Math.max(bottom, block.y + h / 2);
  }
  svg.setAttribute('viewBox', blocks.length ? `${left - 16} ${top - 16} ${right - left + 32} ${bottom - top + 32}` : '-64 -64 128 128');
  for (const block of blocks.sort((a, b) => layer(a.part) - layer(b.part))) {
    const image = document.createElementNS(svg.namespaceURI, 'image');
    const w = block.part.width * 64, h = block.part.height * 64;
    image.setAttribute('href', block.part.url);
    image.setAttribute('x', -w / 2); image.setAttribute('y', -h / 2);
    image.setAttribute('width', w); image.setAttribute('height', h);
    image.setAttribute('transform', `translate(${block.x} ${block.y}) rotate(${block.angle || 0})`);
    if (block.part.category === 'ARMOR' && block.part.id.includes('half')) image.style.clipPath = 'polygon(0 0, 0 100%, 100% 100%)';
    svg.appendChild(image);
  }
  return svg;
}
function performance(ship) {
  const stats = shipStats(ship.blocks);
  const armor = ship.blocks.reduce((sum, block) => { const part = findPart(block.partId); return sum + (part.category === 'ARMOR' ? part.mass : 0); }, 0);
  // 戦闘ダメージ未定義のため、火力は弾薬消費量合計を比較指標として使う。
  return { ...stats, firepower: stats.ammoRequired, armor, rating: stats.mass + stats.thrust + stats.ammoRequired + armor };
}

export function createFleetEditor(parent, onBack) {
  const root = document.createElement('main');
  root.className = 'fleet-editor';
  root.innerHTML = `
    <header class="fleet-heading"><div><h1>戦闘艦隊を編成</h1><p>艦をクリックして性能を比較 / 各陣営5隻まで / 搭乗艦を指定</p></div><span>FLEET OPERATIONS / AEROSPHERE</span></header>
    <div class="fleet-summaries"><section class="fleet-summary player"><h2>自軍艦隊 / PLAYER <span></span></h2><p></p><div class="fleet-slots"></div><small></small></section><section class="fleet-summary opposition"><h2>敵軍艦隊 / OPPOSITION <span></span></h2><p></p><div class="fleet-slots"></div><small>敵艦のAI設定は今後実装</small></section></div>
    <div class="fleet-main"><section class="fleet-library"><div class="fleet-columns"><h2>艦艇ライブラリ</h2><span>搭乗</span><span>自軍</span><span>敵軍</span></div><div class="fleet-list" tabindex="0" aria-label="保存済み艦艇一覧"></div></section><aside class="fleet-inspect" aria-label="艦艇情報"></aside></div>
    <footer class="fleet-footer"><p class="fleet-status" role="status"></p><p class="fleet-note">火力・装甲・編成評価は仮の比較指標です。戦闘処理は今後実装します。</p><div class="fleet-actions"><button data-action="clear">編成をクリア</button><button data-action="copy">敵軍を自軍と同じ編成に</button><button data-action="back">戻る [Esc]</button><button data-action="start">戦闘開始 [Enter / F3]</button></div><small>↑↓: 艦選択　←→: 自軍の増減　Shift+←→: 敵軍　Space: 搭乗指定　ホイール: スクロール</small></footer>`;
  parent.appendChild(root);
  const list = root.querySelector('.fleet-list');
  const inspect = root.querySelector('.fleet-inspect');
  const status = root.querySelector('.fleet-status');
  const start = root.querySelector('[data-action="start"]');
  let ships = [], selected = null, boarding = null;
  const counts = { player: new Map(), opposition: new Map() };
  const total = side => [...counts[side].values()].reduce((a, b) => a + b, 0);
  function ready() { return total('player') > 0 && total('opposition') > 0 && boarding && counts.player.get(boarding) > 0; }
  function message(text) { status.textContent = text; }
  function change(side, name, delta) {
    if (delta > 0 && total(side) >= LIMIT) { message('各陣営の上限は5隻です'); return; }
    counts[side].set(name, Math.max(0, (counts[side].get(name) || 0) + delta));
    if (!(counts.player.get(boarding) > 0)) boarding = null;
    render();
  }
  function board(name) {
    if (!(counts.player.get(name) > 0)) { message('搭乗艦を指定するには自軍に追加してください'); return; }
    boarding = name; selected = name; render();
  }
  function render() {
    for (const side of ['player', 'opposition']) {
      const summary = root.querySelector(`.fleet-summary.${side}`);
      summary.querySelector('h2 span').textContent = `${total(side)} / ${LIMIT} 艦`;
      const totals = ships.reduce((sum, ship) => { const n = counts[side].get(ship.name) || 0; const s = performance(ship); return { firepower: sum.firepower + s.firepower * n, mass: sum.mass + s.mass * n, rating: sum.rating + s.rating * n }; }, { firepower: 0, mass: 0, rating: 0 });
      summary.querySelector('p').textContent = `総火力 ${number(totals.firepower)}　総重量 ${number(totals.mass)}　編成評価 ${number(totals.rating)}`;
      summary.querySelector('.fleet-slots').replaceChildren(...Array.from({length: LIMIT}, (_, i) => { const slot = document.createElement('i'); slot.classList.toggle('filled', i < total(side)); return slot; }));
      if (side === 'player') summary.querySelector('small').textContent = `搭乗: ${boarding || '未指定'}`;
    }
    list.replaceChildren();
    if (!ships.length) { const empty = document.createElement('p'); empty.className = 'fleet-empty'; empty.textContent = '保存済みの機体がありません。DESIGNで機体を作り、SAVEしてください。'; list.appendChild(empty); }
    for (const ship of ships) {
      const stats = performance(ship);
      const row = document.createElement('div'); row.className = 'fleet-row'; row.dataset.ship = ship.name; row.classList.toggle('selected', selected === ship.name);
      const select = document.createElement('button'); select.className = 'fleet-ship'; select.setAttribute('aria-pressed', String(selected === ship.name));
      select.appendChild(preview(ship)); const label = document.createElement('span'); const name = document.createElement('strong'); name.textContent = ship.name; const detail = document.createElement('small'); detail.textContent = `火力 ${stats.firepower}　装甲 ${number(stats.armor)}　推力 ${stats.thrust}`; label.append(name, detail); select.appendChild(label); select.onclick = () => { selected = ship.name; render(); }; row.appendChild(select);
      const pilot = document.createElement('button'); pilot.textContent = boarding === ship.name ? '搭乗' : '指定'; pilot.setAttribute('aria-label', `${ship.name}を搭乗艦に指定`); pilot.disabled = !(counts.player.get(ship.name) > 0); pilot.onclick = () => board(ship.name); row.appendChild(pilot);
      for (const side of ['player', 'opposition']) {
        const counter = document.createElement('div'); counter.className = `fleet-counter ${side}`;
        for (const delta of [-1, 1]) { const button = document.createElement('button'); button.textContent = delta < 0 ? '−' : '+'; button.setAttribute('aria-label', `${ship.name} ${side === 'player' ? '自軍' : '敵軍'}を${delta < 0 ? '減らす' : '増やす'}`); button.disabled = delta < 0 ? !(counts[side].get(ship.name) > 0) : total(side) >= LIMIT; button.onclick = () => change(side, ship.name, delta); counter.appendChild(button); if (delta < 0) { const value = document.createElement('span'); value.textContent = counts[side].get(ship.name) || 0; counter.appendChild(value); } }
        row.appendChild(counter);
      }
      list.appendChild(row);
    }
    inspect.replaceChildren(); const ship = ships.find(s => s.name === selected);
    const title = document.createElement('h2'); title.textContent = '艦艇情報 / INSPECT'; inspect.appendChild(title);
    if (ship) {
      const s = performance(ship); const name = document.createElement('h3'); name.textContent = ship.name; inspect.appendChild(name);
      const image = document.createElement('div'); image.className = 'fleet-preview'; image.appendChild(preview(ship)); inspect.appendChild(image);
      const supplies = document.createElement('p'); supplies.textContent = `燃料 ${s.fuel}　弾薬 ${s.ammo}　電力 ${s.powerSupply}　人口 ${s.populationSupply}`; inspect.appendChild(supplies);
      const maxima = { firepower: Math.max(1, ...ships.map(x => performance(x).firepower)), armor: Math.max(1, ...ships.map(x => performance(x).armor)), thrust: Math.max(1, ...ships.map(x => performance(x).thrust)) };
      for (const [key, label, value] of [['firepower', '火力', s.firepower], ['armor', '装甲', s.armor], ['thrust', '機動力 / 推力:重量', `${number(s.mass ? s.thrust / s.mass : 0)} / ${s.thrust}:${s.mass}`]]) {
        const p = document.createElement('p'); p.className = 'fleet-metric'; const text = document.createElement('span'); text.textContent = label; const n = document.createElement('span'); n.textContent = value; p.append(text, n); const bar = document.createElement('div'); bar.className = `fleet-bar ${key}`; const fill = document.createElement('i'); fill.style.width = `${s[key] / maxima[key] * 100}%`; bar.appendChild(fill); inspect.append(p, bar);
      }
      const pilot = document.createElement('button'); pilot.className = 'fleet-board'; pilot.textContent = boarding === ship.name ? '搭乗開始艦に指定済み' : '搭乗開始艦に指定'; pilot.disabled = !(counts.player.get(ship.name) > 0); pilot.onclick = () => board(ship.name); inspect.appendChild(pilot);
    } else { const p = document.createElement('p'); p.textContent = '機体を保存すると性能を確認できます'; inspect.appendChild(p); }
    start.disabled = !ready();
    message(ready() ? '出撃準備完了 / 戦闘処理は今後実装します' : '自軍・敵軍を編成し、自軍の搭乗艦を指定してください');
  }
  function launch() { if (ready()) message('編成は完了しています。実際の戦闘は次の実装で追加します。'); }
  root.querySelector('[data-action="clear"]').onclick = () => { counts.player.clear(); counts.opposition.clear(); boarding = null; render(); };
  root.querySelector('[data-action="copy"]').onclick = () => { counts.opposition = new Map(counts.player); render(); };
  root.querySelector('[data-action="back"]').onclick = onBack;
  start.onclick = launch;
  function keydown(event) {
    if (parent.hidden || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, textarea, select')) return;
    if (event.code === 'Escape') { event.preventDefault(); onBack(); return; }
    if (['ArrowUp', 'ArrowDown'].includes(event.code)) { event.preventDefault(); const index = ships.findIndex(s => s.name === selected); selected = ships[Math.max(0, Math.min(ships.length - 1, index + (event.code === 'ArrowUp' ? -1 : 1)))]?.name; render(); [...list.children].find(row => row.dataset.ship === selected)?.scrollIntoView({block: 'nearest'}); }
    else if (['ArrowLeft', 'ArrowRight'].includes(event.code) && selected) { event.preventDefault(); change(event.shiftKey ? 'opposition' : 'player', selected, event.code === 'ArrowLeft' ? -1 : 1); }
    else if (event.code === 'Space' && selected && !event.target.closest('button')) { event.preventDefault(); board(selected); }
    else if (event.code === 'F3' || (event.code === 'Enter' && !event.target.closest('button'))) { event.preventDefault(); launch(); }
  }
  window.addEventListener('keydown', keydown);
  return {
    refresh() {
      let failures = 0;
      try { ships = listShips().flatMap(({name}) => { try { const ship = loadShip(name); if (ship.blocks.some(block => !findPart(block.partId) || !Number.isFinite(block.x) || !Number.isFinite(block.y) || !Number.isFinite(block.angle))) throw new Error('invalid blocks'); performance(ship); return [ship]; } catch { failures++; return []; } }); }
      catch { ships = []; failures++; }
      for (const side of ['player', 'opposition']) for (const name of counts[side].keys()) if (!ships.some(s => s.name === name)) counts[side].delete(name);
      if (!(counts.player.get(boarding) > 0)) boarding = null;
      if (!ships.some(s => s.name === selected)) selected = ships[0]?.name ?? null;
      render(); if (failures) message('一部の保存データを読み込めませんでした。DESIGNで確認してください。');
    },
    destroy() { window.removeEventListener('keydown', keydown); root.remove(); },
  };
}
