const STORAGE_KEY = 'guardians-of-balance-save-v2';
const GRID_W = 10;
const GRID_H = 6;
const GOAL_TILES = [
  [8, 1],
  [7, 3],
  [9, 4],
];

const BASE_STATE = {
  started: false,
  energy: 3,
  credits: 50,
  reputation: 0,
  mission: 1,
  progress: 0,
  completed: false,
  selectedHeroId: 'ari',
  heroes: [
    { id: 'ari', name: 'Ari', role: 'Medic', x: 1, y: 1, color: '#64e5ff' },
    { id: 'jun', name: 'Jun', role: 'Scout', x: 1, y: 3, color: '#ffd166' },
    { id: 'nia', name: 'Nia', role: 'Engineer', x: 2, y: 2, color: '#a78bfa' },
  ],
  upgrades: { drone: false, diplomacy: false, reactor: false },
  log: ['Welcome, Commander. Move heroes on the tactical field and secure objectives.'],
  board: [
    { name: 'Ari - Medic', points: 40 },
    { name: 'Jun - Scout', points: 35 },
    { name: 'Nia - Engineer', points: 30 },
  ],
};

const MISSIONS = [
  { name: 'Secure Water Plant', desc: 'Restore clean water lines.', cost: 1, reward: { credits: 25, reputation: 12, progress: 10 } },
  { name: 'Evacuation Escort', desc: 'Protect civilian transport.', cost: 1, reward: { credits: 20, reputation: 14, progress: 10 } },
  { name: 'Bridge Reconstruction', desc: 'Reconnect key routes.', cost: 1, reward: { credits: 28, reputation: 10, progress: 10 } },
  { name: 'Supply Caravan Guard', desc: 'Defend medicine shipments.', cost: 1, reward: { credits: 24, reputation: 13, progress: 10 } },
  { name: 'Storm Relay Calibration', desc: 'Stabilize weather towers.', cost: 1, reward: { credits: 22, reputation: 15, progress: 10 } },
  { name: 'Sanctuary Defense', desc: 'Coordinate perimeter defenses.', cost: 2, reward: { credits: 40, reputation: 18, progress: 10 } },
  { name: 'Diplomatic Summit', desc: 'Negotiate alliance terms.', cost: 1, reward: { credits: 30, reputation: 20, progress: 10 } },
  { name: 'Signal Array Rescue', desc: 'Recover lost comm arrays.', cost: 2, reward: { credits: 42, reputation: 18, progress: 10 } },
  { name: 'Reactor Stabilization', desc: 'Prevent district blackout.', cost: 2, reward: { credits: 45, reputation: 20, progress: 10 } },
  { name: 'Final Unity Convoy', desc: 'Lead permanent peace convoy.', cost: 2, reward: { credits: 60, reputation: 30, progress: 10 } },
];

const SHOP = [
  { id: 'drone', name: 'Support Drone', cost: 80, desc: '+1 max energy, +5 reputation/mission.' },
  { id: 'diplomacy', name: 'Diplomacy Toolkit', cost: 100, desc: '+10 credits bonus per mission.' },
  { id: 'reactor', name: 'Reactor Tuner', cost: 120, desc: 'Reduce mission energy costs by 1 (min 1).' },
];

let state = loadState();

const nodes = {
  startBtn: document.getElementById('startBtn'),
  resetBtn: document.getElementById('resetBtn'),
  energy: document.getElementById('energy'),
  credits: document.getElementById('credits'),
  reputation: document.getElementById('reputation'),
  mission: document.getElementById('mission'),
  progress: document.getElementById('campaignProgress'),
  progressLabel: document.getElementById('progressLabel'),
  actions: document.getElementById('actions'),
  shopItems: document.getElementById('shopItems'),
  logList: document.getElementById('logList'),
  boardList: document.getElementById('boardList'),
  grid: document.getElementById('grid'),
  roster: document.getElementById('characterRoster'),
  endingDialog: document.getElementById('endingDialog'),
  closeDialogBtn: document.getElementById('closeDialogBtn'),
  energyCard: document.getElementById('energyCard'),
  creditsCard: document.getElementById('creditsCard'),
  reputationCard: document.getElementById('reputationCard'),
  missionCard: document.getElementById('missionCard'),
};

nodes.startBtn.addEventListener('click', startGame);
nodes.resetBtn.addEventListener('click', resetGame);
nodes.closeDialogBtn.addEventListener('click', () => nodes.endingDialog.close());

render();

function startGame() {
  if (state.started) return appendAndRender('Campaign already in progress.');
  state.started = true;
  appendAndRender('Campaign started. Move units and deploy missions.');
}

function selectHero(id) {
  state.selectedHeroId = id;
  pulse(nodes.grid);
  saveState();
  render();
}

function moveHeroTo(x, y) {
  const hero = state.heroes.find((h) => h.id === state.selectedHeroId);
  if (!hero) return;
  const occupied = state.heroes.some((h) => h.id !== hero.id && h.x === x && h.y === y);
  if (occupied) return appendAndRender('Tile occupied by another hero.');

  const distance = Math.abs(hero.x - x) + Math.abs(hero.y - y);
  if (distance > 3) return appendAndRender('That tile is too far. Move up to 3 steps.');

  hero.x = x;
  hero.y = y;
  pulse(nodes.grid);

  if (isGoalTile(x, y)) {
    state.credits += 8;
    state.reputation += 3;
    appendLog(`${hero.name} secured an objective zone: +8 credits, +3 reputation.`);
    animateStatBurst();
  } else {
    appendLog(`${hero.name} repositioned to (${x + 1}, ${y + 1}).`);
  }

  saveState();
  render();
}

function runMission(index) {
  if (!state.started || state.completed) return;
  const mission = MISSIONS[index];
  if (!mission) return;

  const objectivesHeld = state.heroes.filter((h) => isGoalTile(h.x, h.y)).length;
  if (objectivesHeld === 0) {
    return appendAndRender('Place at least one hero on an objective zone before deploying.');
  }

  const energyCost = adjustedEnergyCost(mission.cost);
  if (state.energy < energyCost) return appendAndRender('Not enough energy. Use Rest to recover.');

  state.energy -= energyCost;
  const repBonus = (state.upgrades.drone ? 5 : 0) + objectivesHeld;
  const creditsBonus = (state.upgrades.diplomacy ? 10 : 0) + objectivesHeld * 4;

  state.credits += mission.reward.credits + creditsBonus;
  state.reputation += mission.reward.reputation + repBonus;
  state.progress += mission.reward.progress;
  state.mission = Math.min(state.mission + 1, 10);

  updateBoard(Math.floor((mission.reward.reputation + repBonus) / 2));
  appendLog(`${mission.name} cleared. Objective control bonus applied (${objectivesHeld} zones).`);
  animateStatBurst();

  if (state.progress >= 100) {
    state.progress = 100;
    state.completed = true;
    appendLog('Campaign complete. Your progress is locked in with no decay.');
    nodes.endingDialog.showModal();
  }

  saveState();
  render();
}

function rest() {
  if (!state.started) return appendAndRender('Start the campaign first.');
  const maxEnergy = state.upgrades.drone ? 5 : 4;
  const recovered = state.energy >= maxEnergy ? 0 : 1;
  state.energy = Math.min(maxEnergy, state.energy + 1);
  state.credits += 5;
  appendLog(recovered ? 'You rested: +1 energy and +5 credits.' : 'Energy already full. +5 credits earned.');
  animateStatBurst();
  saveState();
  render();
}

function buyUpgrade(id) {
  const item = SHOP.find((u) => u.id === id);
  if (!item || state.upgrades[id]) return;
  if (state.credits < item.cost) return appendAndRender(`Not enough credits for ${item.name}.`);
  state.credits -= item.cost;
  state.upgrades[id] = true;
  appendLog(`Upgrade purchased: ${item.name}.`);
  animateStatBurst();
  saveState();
  render();
}

function adjustedEnergyCost(cost) {
  if (state.upgrades.reactor && cost > 1) return cost - 1;
  return cost;
}

function updateBoard(points) {
  state.board = state.board.map((entry, idx) => (idx === 0 ? { ...entry, points: entry.points + points } : entry));
}

function appendAndRender(message) {
  appendLog(message);
  saveState();
  render();
}

function appendLog(message) {
  const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  state.log.unshift(`[${ts}] ${message}`);
  state.log = state.log.slice(0, 14);
}

function pulse(el) {
  el.classList.remove('impact');
  void el.offsetWidth;
  el.classList.add('impact');
}

function animateStatBurst() {
  [nodes.energyCard, nodes.creditsCard, nodes.reputationCard, nodes.missionCard].forEach((node) => pulse(node));
}

function isGoalTile(x, y) {
  return GOAL_TILES.some((point) => point[0] === x && point[1] === y);
}

function resetGame() {
  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(BASE_STATE);
  render();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(BASE_STATE);
    return { ...structuredClone(BASE_STATE), ...JSON.parse(raw) };
  } catch {
    return structuredClone(BASE_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  nodes.energy.textContent = String(state.energy);
  nodes.credits.textContent = String(state.credits);
  nodes.reputation.textContent = String(state.reputation);
  nodes.mission.textContent = `${Math.min(state.mission, 10)}/10`;
  nodes.progress.value = state.progress;
  nodes.progressLabel.textContent = `${state.progress}% complete`;
  nodes.startBtn.disabled = state.started;

  renderRoster();
  renderGrid();
  renderActions();
  renderShop();
  renderLog();
  renderBoard();
}

function renderRoster() {
  nodes.roster.innerHTML = state.heroes
    .map((hero) => `
      <button class="roster-btn ${hero.id === state.selectedHeroId ? 'active' : ''}" data-hero="${hero.id}">
        <span class="dot" style="--dot:${hero.color}"></span>
        ${hero.name} (${hero.role})
      </button>
    `)
    .join('');

  nodes.roster.querySelectorAll('button[data-hero]').forEach((btn) => {
    btn.addEventListener('click', () => selectHero(btn.dataset.hero));
  });
}

function renderGrid() {
  let tiles = '';
  for (let y = 0; y < GRID_H; y += 1) {
    for (let x = 0; x < GRID_W; x += 1) {
      const hero = state.heroes.find((h) => h.x === x && h.y === y);
      const isGoal = isGoalTile(x, y);
      tiles += `
        <button class="tile ${isGoal ? 'goal' : ''} ${hero ? 'occupied' : ''}" data-x="${x}" data-y="${y}">
          ${hero ? `<span class="hero-token ${hero.id === state.selectedHeroId ? 'selected' : ''}" style="--hero:${hero.color}">${hero.name[0]}</span>` : ''}
        </button>
      `;
    }
  }
  nodes.grid.innerHTML = tiles;
  nodes.grid.querySelectorAll('button.tile').forEach((tile) => {
    tile.addEventListener('click', () => moveHeroTo(Number(tile.dataset.x), Number(tile.dataset.y)));
  });
}

function renderActions() {
  nodes.actions.innerHTML = `${MISSIONS.map((mission, idx) => {
    const missionNum = idx + 1;
    const locked = missionNum > state.mission || state.completed || !state.started;
    const energyCost = adjustedEnergyCost(mission.cost);
    return `
      <article class="action micro-pop">
        <h3>Mission ${missionNum}: ${mission.name}</h3>
        <p>${mission.desc}</p>
        <footer>
          <span>Cost: ${energyCost} • Reward: +${mission.reward.credits} credits, +${mission.reward.reputation} rep</span>
          <button ${locked ? 'disabled' : ''} data-action="mission" data-id="${idx}">Deploy</button>
        </footer>
      </article>
    `;
  }).join('')}
  <article class="action micro-pop">
    <h3>Recovery: Rest & Coordinate</h3>
    <p>Recover 1 energy and receive +5 predictable support credits.</p>
    <footer>
      <span>No randomness. No penalties.</span>
      <button ${state.completed ? 'disabled' : ''} data-action="rest">Rest</button>
    </footer>
  </article>`;

  nodes.actions.querySelectorAll('button[data-action="mission"]').forEach((btn) => {
    btn.addEventListener('click', () => runMission(Number(btn.dataset.id)));
  });
  nodes.actions.querySelector('button[data-action="rest"]').addEventListener('click', rest);
}

function renderShop() {
  nodes.shopItems.innerHTML = SHOP.map((item) => {
    const owned = state.upgrades[item.id];
    return `
      <article class="shop-item micro-pop">
        <h3>${item.name}</h3>
        <p>${item.desc}</p>
        <footer>
          <span>Cost: ${item.cost} credits</span>
          <button ${owned ? 'disabled' : ''} data-upgrade="${item.id}">${owned ? 'Owned' : 'Buy'}</button>
        </footer>
      </article>
    `;
  }).join('');

  nodes.shopItems.querySelectorAll('button[data-upgrade]').forEach((btn) => {
    btn.addEventListener('click', () => buyUpgrade(btn.dataset.upgrade));
  });
}

function renderLog() {
  nodes.logList.innerHTML = state.log.map((entry) => `<li>${entry}</li>`).join('');
}

function renderBoard() {
  const sorted = [...state.board].sort((a, b) => b.points - a.points);
  nodes.boardList.innerHTML = sorted.map((entry) => `<li>${entry.name}: <strong>${entry.points}</strong> impact</li>`).join('');
}
