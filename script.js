const STORAGE_KEY = 'guardians-of-balance-save-v1';

const BASE_STATE = {
  started: false,
  energy: 3,
  credits: 50,
  reputation: 0,
  mission: 1,
  progress: 0,
  completed: false,
  upgrades: {
    drone: false,
    diplomacy: false,
    reactor: false,
  },
  log: [
    'Welcome, Commander. Your campaign rewards are transparent and finite.',
  ],
  board: [
    { name: 'Ari - Medic', points: 40 },
    { name: 'Jun - Scout', points: 35 },
    { name: 'Nia - Engineer', points: 30 },
  ],
};

const MISSIONS = [
  {
    name: 'Secure Water Plant',
    desc: 'Restore clean water lines for nearby settlements.',
    cost: 1,
    reward: { credits: 25, reputation: 12, progress: 10 },
  },
  {
    name: 'Evacuation Escort',
    desc: 'Protect civilians moving out of unstable territory.',
    cost: 1,
    reward: { credits: 20, reputation: 14, progress: 10 },
  },
  {
    name: 'Bridge Reconstruction',
    desc: 'Deploy engineering drones to reconnect key routes.',
    cost: 1,
    reward: { credits: 28, reputation: 10, progress: 10 },
  },
  {
    name: 'Supply Caravan Guard',
    desc: 'Defend food and medicine shipments.',
    cost: 1,
    reward: { credits: 24, reputation: 13, progress: 10 },
  },
  {
    name: 'Storm Relay Calibration',
    desc: 'Stabilize weather towers before an incoming storm.',
    cost: 1,
    reward: { credits: 22, reputation: 15, progress: 10 },
  },
  {
    name: 'Sanctuary Defense',
    desc: 'Coordinate non-lethal perimeter defenses.',
    cost: 2,
    reward: { credits: 40, reputation: 18, progress: 10 },
  },
  {
    name: 'Diplomatic Summit',
    desc: 'Negotiate alliance terms with frontier clans.',
    cost: 1,
    reward: { credits: 30, reputation: 20, progress: 10 },
  },
  {
    name: 'Signal Array Rescue',
    desc: 'Recover communication arrays from mountain outposts.',
    cost: 2,
    reward: { credits: 42, reputation: 18, progress: 10 },
  },
  {
    name: 'Reactor Stabilization',
    desc: 'Prevent blackout in the central district.',
    cost: 2,
    reward: { credits: 45, reputation: 20, progress: 10 },
  },
  {
    name: 'Final Unity Convoy',
    desc: 'Lead allied convoy to establish permanent peace corridor.',
    cost: 2,
    reward: { credits: 60, reputation: 30, progress: 10 },
  },
];

const SHOP = [
  {
    id: 'drone',
    name: 'Support Drone',
    cost: 80,
    desc: '+1 permanent energy capacity and +5 reputation on missions.',
  },
  {
    id: 'diplomacy',
    name: 'Diplomacy Toolkit',
    cost: 100,
    desc: '+10 credits bonus on every mission.',
  },
  {
    id: 'reactor',
    name: 'Reactor Tuner',
    cost: 120,
    desc: 'Reduce high-tier mission energy cost by 1 (minimum 1).',
  },
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
  endingDialog: document.getElementById('endingDialog'),
  closeDialogBtn: document.getElementById('closeDialogBtn'),
};

nodes.startBtn.addEventListener('click', startGame);
nodes.resetBtn.addEventListener('click', resetGame);
nodes.closeDialogBtn.addEventListener('click', () => nodes.endingDialog.close());

render();

function startGame() {
  if (state.started) {
    appendLog('Campaign already in progress. Pick your next mission.');
    render();
    return;
  }
  state.started = true;
  appendLog('Campaign started. Mission rewards are fixed and visible.');
  saveState();
  render();
}

function runMission(index) {
  if (!state.started || state.completed) return;
  const mission = MISSIONS[index];
  if (!mission) return;

  const energyCost = adjustedEnergyCost(mission.cost);
  if (state.energy < energyCost) {
    appendLog('Not enough energy. Use Rest to recover.');
    render();
    return;
  }

  state.energy -= energyCost;
  const repBonus = state.upgrades.drone ? 5 : 0;
  const creditsBonus = state.upgrades.diplomacy ? 10 : 0;

  state.credits += mission.reward.credits + creditsBonus;
  state.reputation += mission.reward.reputation + repBonus;
  state.progress += mission.reward.progress;
  state.mission = Math.min(state.mission + 1, 10);

  updateBoard(Math.floor((mission.reward.reputation + repBonus) / 2));

  appendLog(
    `${mission.name} cleared. -${energyCost} energy, +${
      mission.reward.credits + creditsBonus
    } credits, +${mission.reward.reputation + repBonus} reputation.`
  );

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
  if (!state.started) {
    appendLog('Start the campaign first.');
    render();
    return;
  }

  const maxEnergy = state.upgrades.drone ? 5 : 4;
  const recovered = state.energy >= maxEnergy ? 0 : 1;
  state.energy = Math.min(maxEnergy, state.energy + 1);
  state.credits += 5;
  appendLog(
    recovered
      ? 'You rested: +1 energy and +5 maintenance credits.'
      : 'Energy already full. You still gained +5 maintenance credits.'
  );
  saveState();
  render();
}

function buyUpgrade(id) {
  const item = SHOP.find((u) => u.id === id);
  if (!item || state.upgrades[id]) return;
  if (state.credits < item.cost) {
    appendLog(`Not enough credits for ${item.name}.`);
    render();
    return;
  }
  state.credits -= item.cost;
  state.upgrades[id] = true;
  appendLog(`Upgrade purchased: ${item.name}.`);
  saveState();
  render();
}

function adjustedEnergyCost(cost) {
  if (state.upgrades.reactor && cost > 1) return cost - 1;
  return cost;
}

function updateBoard(points) {
  state.board = state.board.map((entry, idx) =>
    idx === 0 ? { ...entry, points: entry.points + points } : entry
  );
}

function appendLog(message) {
  const ts = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  state.log.unshift(`[${ts}] ${message}`);
  state.log = state.log.slice(0, 14);
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

  renderActions();
  renderShop();
  renderLog();
  renderBoard();
}

function renderActions() {
  const cards = MISSIONS.map((mission, idx) => {
    const missionNum = idx + 1;
    const locked = missionNum > state.mission || state.completed || !state.started;
    const energyCost = adjustedEnergyCost(mission.cost);
    return `
      <article class="action">
        <h3>Mission ${missionNum}: ${mission.name}</h3>
        <p>${mission.desc}</p>
        <footer>
          <span>Cost: ${energyCost} energy • Reward: +${mission.reward.credits} credits, +${mission.reward.reputation} reputation</span>
          <button ${locked ? 'disabled' : ''} data-action="mission" data-id="${idx}">Deploy</button>
        </footer>
      </article>
    `;
  }).join('');

  nodes.actions.innerHTML = `
    ${cards}
    <article class="action">
      <h3>Recovery: Rest & Coordinate</h3>
      <p>Recover 1 energy (up to cap) and receive a predictable +5 credits support stipend.</p>
      <footer>
        <span>No randomness. No penalties.</span>
        <button ${state.completed ? 'disabled' : ''} data-action="rest">Rest</button>
      </footer>
    </article>
  `;

  nodes.actions.querySelectorAll('button[data-action="mission"]').forEach((btn) => {
    btn.addEventListener('click', () => runMission(Number(btn.dataset.id)));
  });

  const restBtn = nodes.actions.querySelector('button[data-action="rest"]');
  restBtn.addEventListener('click', rest);
}

function renderShop() {
  nodes.shopItems.innerHTML = SHOP.map((item) => {
    const owned = state.upgrades[item.id];
    return `
      <article class="shop-item">
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
  nodes.boardList.innerHTML = sorted
    .map((entry) => `<li>${entry.name}: <strong>${entry.points}</strong> team impact</li>`)
    .join('');
}
