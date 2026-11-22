// STORM SURGE — main.js: Coral Bay in a hurricane.
// A complete open-world crime game: drive, steal, shoot, outrun the CBPD
// through a Category 4 hurricane. Boot straight into the peak — mission 6
// stage 3 of 4, five wanted stars, heli overhead, roadblock ahead.
// ?shot=hero|neon|pier|downtown stages four different dense moments for
// screenshots; ?px=&pz=&pa= repositions the player. No network requests.

import { buildWorld, updateWorld, triggerExplosion, makeCarMesh, CITY } from './world.js';
import {
  CARS, WEAPONS, MISSIONS, CREW, SIDE_JOBS, createState, respectTitle,
  wantedLabel, policeForWanted, updateWanted, currentMission, advanceStage,
  startNextMission, saveGame, loadGame, hasSave, districtAt,
} from './logic.js';
import { createAudio } from './audio.js';
import { SHOTS } from './shots.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot') || '';
const SEED = parseInt(params.get('seed') || '1', 10);

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 1200);
const world = buildWorld(scene);
const audio = createAudio();
let state = createState();

const $ = (id) => document.getElementById(id);
const statusEl = $('status');
function announce(msg) { statusEl.textContent = msg; }

// --- dialogue lines ---------------------------------------------------------
const DIALOGUE = [
  { who: 'DARA VOSS', role: 'Crew fixer · Harbor Road', icon: 'D', color: '#ff2e88', text: 'The surge is coming over the barrier in nine minutes, Rook. You smash that roadblock, you get the manifests — and we all get out of Coral Bay rich.' },
  { who: 'JUNE PARK', role: 'Hacker · runs the grid', icon: 'J', color: '#2eff8a', text: 'I own the traffic grid, Rook. Lights go green for you and red for every cruiser behind you. Do not waste it.' },
  { who: 'MILO "SPARKS" REYES', role: 'Driver · getaway specialist', icon: 'M', color: '#22d3ee', text: 'Wind is gusting one-fifty. Your tires will float on that floodwater — keep the nitro for the straight, not the turns.' },
  { who: 'DARA VOSS', role: 'Crew fixer · Harbor Road', icon: 'D', color: '#ff2e88', text: 'Heli has your heat signature. Stay under the bridge arches when the spotlight swings — it loses you for six seconds.' },
  { who: 'BIG TOLU', role: 'Muscle · carries the gold', icon: 'T', color: '#ffb020', text: 'Barrier gate is old iron, Rook. Hit it at speed and it folds. Hit it slow and it folds you.' },
];
let dialogueIndex = 0;

const DISPATCH_LINES = [
  'Unit 7: suspect vehicle pink coupe, Harbor Road, heading north.',
  'Air One: spotlight on the suspect. Five stars, repeat, five stars.',
  'All units: roadblock Harbor Road is set. Spike strip is hot.',
  'Dispatch: surge warning — flood barrier closes in nine minutes.',
  'Unit 12: suspect just blew through the Neon Row checkpoint!',
  'Air One: losing visual in the rain band. Requesting thermal.',
  'Dispatch: all Downtown units converge on the barrier.',
];

// --- player -----------------------------------------------------------------
const player = {
  x: 0, z: 190, angle: Math.PI, speed: 0, nitro: 100,
  onFoot: false, mesh: null, heading: Math.PI,
};
const playerCar = makeCarMesh(CARS[0].color, 'player');
playerCar.position.set(player.x, 0, player.z);
scene.add(playerCar);
player.mesh = playerCar;

// Repaint the player car when the ride changes (garage, theft, shot staging).
function paintPlayerCar() {
  playerCar.children[0].material.color.setHex(CARS[state.carIndex].color);
}

const onFootMesh = new THREE.Group();
{
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.7, 8), new THREE.MeshStandardMaterial({ color: 0xff2e88, roughness: 0.8 }));
  body.position.y = 1.05;
  onFootMesh.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd9a066, roughness: 0.7 }));
  head.position.y = 2.15;
  onFootMesh.add(head);
}
onFootMesh.visible = false;
scene.add(onFootMesh);

// --- traffic ----------------------------------------------------------------
const traffic = [];
const TRAFFIC_COLORS = [0x94a3b8, 0x64748b, 0xe2e8f0, 0x7c3aed, 0x0ea5e9, 0xf59e0b, 0xef4444, 0x10b981];
function spawnTraffic(n) {
  for (let i = 0; i < n; i++) {
    const color = TRAFFIC_COLORS[i % TRAFFIC_COLORS.length];
    const mesh = makeCarMesh(color, i % 5 === 0 ? 'taxi' : 'civilian');
    const horizontal = i % 2 === 0;
    const lane = (Math.floor(i / 2) % 9 - 4) * 85;
    const along = (Math.random() - 0.5) * 600;
    mesh.position.set(horizontal ? along : lane, 0, horizontal ? lane : along);
    mesh.rotation.y = horizontal ? (i % 4 < 2 ? 0 : Math.PI) : (i % 4 < 2 ? Math.PI / 2 : -Math.PI / 2);
    scene.add(mesh);
    traffic.push({ mesh, horizontal, speed: 7 + Math.random() * 6, dir: i % 4 < 2 ? 1 : -1, lane });
  }
}
spawnTraffic(12);

// --- police cruisers ---------------------------------------------------------
const police = [];
function spawnPolice(n) {
  for (let i = 0; i < n; i++) {
    const mesh = makeCarMesh(0x1e293b, 'police');
    const a = (i / n) * Math.PI * 2;
    mesh.position.set(player.x + Math.cos(a) * 45, 0, player.z + Math.sin(a) * 45);
    scene.add(mesh);
    police.push({ mesh, speed: 0, sirenT: Math.random() * 2 });
  }
}
spawnPolice(5);

// --- pedestrians --------------------------------------------------------------
const peds = [];
const PED_COLORS = [0xf472b6, 0x38bdf8, 0xfacc15, 0x4ade80, 0xf97316, 0xe879f9];
function spawnPeds(n) {
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.42, 1.5, 7), new THREE.MeshStandardMaterial({ color: PED_COLORS[i % PED_COLORS.length], roughness: 0.9 }));
    body.position.y = 0.95;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd9a066 }));
    head.position.y = 1.95;
    g.add(head);
    const x = (Math.random() - 0.5) * 500;
    const z = (Math.random() - 0.5) * 500;
    g.position.set(x, 0, z);
    scene.add(g);
    peds.push({ mesh: g, panic: Math.random() * 0.8 + 0.2, phase: Math.random() * 6, speed: 1.6 + Math.random() * 1.4 });
  }
}
spawnPeds(16);

// --- mission objective beacon --------------------------------------------------
const beacon = new THREE.Group();
{
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4, 0.3, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffb020 }));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.4;
  beacon.add(ring);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 60, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb020, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
  pillar.position.y = 30;
  beacon.add(pillar);
}
beacon.position.set(0, 0, 150);
scene.add(beacon);

// --- input ---------------------------------------------------------------------
const keys = {};
let mouseDown = false;
addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Digit1') selectWeapon(0);
  if (e.code === 'Digit2') selectWeapon(1);
  if (e.code === 'Digit3') selectWeapon(2);
  if (e.code === 'Digit4') selectWeapon(3);
  if (e.code === 'Digit5') selectWeapon(4);
  if (e.code === 'KeyE') toggleEnterExit();
  if (e.code === 'KeyF') stealCar();
  if (e.code === 'KeyT') nextDialogue();
  if (e.code === 'KeyR') cycleRadio();
  if (e.code === 'KeyG') openGarage();
  if (e.code === 'KeyB') openShop();
  if (e.code === 'KeyM') showMissions();
  if (e.code === 'KeyH') honk();
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
  if (e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('mousedown', () => { mouseDown = true; fireWeapon(); });
addEventListener('mouseup', () => { mouseDown = false; });
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --- weapons -------------------------------------------------------------------
let lastShot = 0;
const tracers = [];
function selectWeapon(i) {
  if (!WEAPONS[i].owned) { toast(`${WEAPONS[i].name} not owned`, 'Buy it at Ammu-Nation — press B'); return; }
  state.weaponIndex = i;
  document.querySelectorAll('.wslot').forEach((el, j) => el.classList.toggle('active', j === i));
  announce(`Weapon: ${WEAPONS[i].name}`);
}
function fireWeapon() {
  const now = performance.now() / 1000;
  const w = WEAPONS[state.weaponIndex];
  if (now - lastShot < w.rate || paused || !running) return;
  lastShot = now;
  audio.ensure(); audio.shot();
  // Tracer from the player toward the camera-forward direction.
  const from = new THREE.Vector3(player.x, 1.2, player.z);
  const dir = new THREE.Vector3(-Math.sin(player.angle), 0, -Math.cos(player.angle));
  const geo = new THREE.BufferGeometry().setFromPoints([from, from.clone().addScaledVector(dir, w.range)]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 }));
  scene.add(line);
  tracers.push({ line, t: 0 });
  // Hit the nearest police cruiser roughly ahead.
  let best = null, bestD = 1e9;
  for (const p of police) {
    const dx = p.mesh.position.x - player.x, dz = p.mesh.position.z - player.z;
    const d = Math.hypot(dx, dz);
    const dot = (-Math.sin(player.angle) * dx + -Math.cos(player.angle) * dz) / (d || 1);
    if (d < w.range && dot > 0.7 && d < bestD) { best = p; bestD = d; }
  }
  if (best) {
    best.mesh.position.y -= 0.2;
    best.speed = 0;
    state.kills++;
    state.wanted = Math.min(5, state.wanted + 0.4);
    addDispatch(`Unit down — suspect fired a ${w.name}. All units converge!`);
    if (state.kills % 3 === 0) toast('CRUISER DISABLED', `+${50 * state.kills} score · wanted rising`);
  }
  updateWanted(state, 0.5, 1, false);
  updateHud();
}

function honk() { audio.ensure(); audio.siren(); addDispatch('You lean on the horn. The storm swallows it.'); }

// --- enter / exit / steal -------------------------------------------------------
function toggleEnterExit() {
  if (!running || paused) return;
  player.onFoot = !player.onFoot;
  playerCar.visible = !player.onFoot;
  onFootMesh.visible = player.onFoot;
  if (player.onFoot) {
    onFootMesh.position.set(player.x, 0, player.z);
    $('car-name').textContent = 'ON FOOT';
  } else {
    $('car-name').textContent = CARS[state.carIndex].name.toUpperCase();
  }
  announce(player.onFoot ? 'On foot' : 'In car');
}
function stealCar() {
  if (!running || paused) return;
  let best = null, bestD = 14;
  for (const t of traffic) {
    const d = Math.hypot(t.mesh.position.x - player.x, t.mesh.position.z - player.z);
    if (d < bestD) { best = t; bestD = d; }
  }
  if (!best) { toast('NO CAR NEARBY', 'Walk up to traffic and press F'); return; }
  const idx = Math.floor(Math.random() * CARS.length);
  state.carIndex = idx;
  state.carsStolen++;
  state.wanted = Math.min(5, state.wanted + 1);
  paintPlayerCar();
  playerCar.position.copy(best.mesh.position);
  player.x = best.mesh.position.x; player.z = best.mesh.position.z;
  player.angle = best.mesh.rotation.y + Math.PI;
  playerCar.visible = true; onFootMesh.visible = false; player.onFoot = false;
  scene.remove(best.mesh);
  traffic.splice(traffic.indexOf(best), 1);
  toast(`STOLE THE ${CARS[idx].name.toUpperCase()}`, 'Wanted +1 star · the owner is calling the cops');
  addDispatch(`Grand theft auto reported — ${CARS[idx].name}, ${districtAt(player.x, player.z)}.`);
  updateHud();
}

// --- dialogue / radio / dispatch --------------------------------------------------
function nextDialogue() {
  dialogueIndex = (dialogueIndex + 1) % DIALOGUE.length;
  showDialogue(DIALOGUE[dialogueIndex]);
}
function showDialogue(d) {
  $('hud-dialogue').style.display = 'block';
  $('portrait').textContent = d.icon;
  $('portrait').style.background = `linear-gradient(135deg, ${d.color}, #7c3aed)`;
  $('dialogue-name').textContent = d.who;
  $('dialogue-role').textContent = d.role || 'Crew · Coral Bay';
  $('dialogue-text').textContent = d.text;
}
function cycleRadio() {
  audio.ensure();
  const name = audio.nextStation();
  toast('RADIO — ' + name, 'Press R to change station');
}
function addDispatch(line) {
  const log = $('dispatch-log');
  const div = document.createElement('div');
  div.innerHTML = `<b>▸</b> ${line}`;
  log.prepend(div);
  while (log.children.length > 4) log.removeChild(log.lastChild);
}
let toastTimer = null;
function toast(title, sub) {
  const el = $('toast');
  el.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 3200);
}

// --- garage & shop ----------------------------------------------------------------
function openGarage() {
  if (!running) return;
  paused = true;
  const list = $('garage-list');
  list.innerHTML = '';
  CARS.forEach((car, i) => {
    const owned = state.ownedCars.includes(car.id);
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `<b>${car.name}</b> — top ${car.top * 3.2 | 0} km/h<br>${car.desc}<br><span class="price">${owned ? 'OWNED' : '$' + car.price.toLocaleString()}</span><br>`;
    const btn = document.createElement('button');
    btn.textContent = owned ? 'TAKE THIS CAR' : `BUY — $${car.price.toLocaleString()}`;
    btn.disabled = !owned && state.cash < car.price;
    btn.onclick = () => {
      if (!owned) { state.cash -= car.price; state.ownedCars.push(car.id); audio.cash(); }
      state.carIndex = i;
      paintPlayerCar();
      playerCar.position.set(player.x, 0, player.z);
      toast(`${car.name.toUpperCase()} READY`, owned ? 'Your ride is waiting outside' : 'Purchased — enjoy the storm');
      closeOverlays(); paused = false; updateHud();
    };
    div.appendChild(btn);
    list.appendChild(div);
  });
  $('garage-screen').classList.remove('hidden');
}
function openShop() {
  if (!running) return;
  paused = true;
  $('shop-cash').textContent = `Cash: $${state.cash.toLocaleString()}`;
  const list = $('shop-list');
  list.innerHTML = '';
  WEAPONS.forEach((w, i) => {
    const owned = state.ownedWeapons.includes(w.name);
    const div = document.createElement('div');
    div.className = 'shop-item';
    div.innerHTML = `<b>${w.name}</b> — dmg ${w.dmg} · range ${w.range}m<br><span class="price">${owned ? 'OWNED' : '$' + w.price.toLocaleString()}</span><br>`;
    const btn = document.createElement('button');
    btn.textContent = owned ? 'EQUIP' : `BUY — $${w.price.toLocaleString()}`;
    btn.disabled = !owned && state.cash < w.price;
    btn.onclick = () => {
      if (!owned) { state.cash -= w.price; state.ownedWeapons.push(w.name); audio.cash(); }
      selectWeapon(i);
      closeOverlays(); paused = false; updateHud();
    };
    div.appendChild(btn);
    list.appendChild(div);
  });
  // Armor + health restock.
  const extra = document.createElement('div');
  extra.className = 'shop-item';
  extra.innerHTML = `<b>KEVLAR VEST</b> — full armor<br><span class="price">$400</span><br>`;
  const bBtn = document.createElement('button');
  bBtn.textContent = 'BUY — $400';
  bBtn.disabled = state.cash < 400;
  bBtn.onclick = () => { state.cash -= 400; state.armor = 100; audio.cash(); closeOverlays(); paused = false; updateHud(); };
  extra.appendChild(bBtn);
  list.appendChild(extra);
  $('shop-screen').classList.remove('hidden');
}
function showMissions() {
  const m = currentMission(state);
  const done = state.completedMissions.map((id) => MISSIONS[id - 1].name).join(', ');
  toast(`MISSION ${m.id} — ${m.name}`, `Completed: ${done || 'none yet'} · ${MISSIONS.length} missions total`);
}

// --- overlays / pause / game over ---------------------------------------------------
let running = false;
let paused = false;
function closeOverlays() {
  for (const id of ['garage-screen', 'shop-screen', 'pause-screen', 'gameover-screen']) $(id).classList.add('hidden');
}
function togglePause() {
  if (!running) return;
  paused = !paused;
  $('pause-screen').classList.toggle('hidden', !paused);
  if (paused) {
    $('pause-summary').textContent = `Mission ${currentMission(state).id} · Stage ${state.missionStage + 1}/${currentMission(state).stages.length} · Wanted ${Math.round(state.wanted)}★ · $${state.cash.toLocaleString()} · Respect ${state.respect}`;
  }
}
function gameOver(kind) {
  running = false;
  if (kind === 'busted') { $('gameover-title').textContent = 'BUSTED'; $('gameover-text').textContent = 'The Coral Bay PD hauled you in as the surge took the streets. The manifests are gone — but Dara already has a plan B.'; }
  else { $('gameover-title').textContent = 'WASTED'; $('gameover-text').textContent = 'The storm took you, Rook. Coral Bay keeps its secrets — this time.'; }
  $('gameover-screen').classList.remove('hidden');
  state.deaths++;
}
function startGame(freeroam) {
  audio.ensure();
  $('start-screen').classList.add('hidden');
  closeOverlays();
  running = true; paused = false;
  if (freeroam) { state.wanted = 2; state.missionStage = 0; toast('FREE ROAM — CORAL BAY', 'No mission clock. The storm is yours.'); }
  else showDialogue(DIALOGUE[0]);
  announce('STORM SURGE started — mission 6 stage 3, wanted 5 stars');
}
$('btn-start').onclick = () => startGame(false);
$('btn-freeroam').onclick = () => startGame(true);
$('btn-continue').onclick = () => {
  const s = loadGame();
  if (s) { state = s; toast('SAVE LOADED', `Mission ${currentMission(state).id} · $${state.cash.toLocaleString()}`); }
  else toast('NO SAVE FOUND', 'Starting fresh — mission 6, stage 3');
  startGame(false);
};
$('btn-resume').onclick = () => { paused = false; $('pause-screen').classList.add('hidden'); };
$('btn-save').onclick = () => { saveGame(state); toast('GAME SAVED', 'Autosave is on — progress is safe'); };
$('btn-restart').onclick = () => { state.missionStage = 0; state.missionProgress = 0; state.missionTime = 0; paused = false; closeOverlays(); toast('MISSION RESTARTED', currentMission(state).name); };
$('btn-quit').onclick = () => { running = false; closeOverlays(); $('start-screen').classList.remove('hidden'); };
$('btn-garage-close').onclick = () => { closeOverlays(); paused = false; };
$('btn-shop-close').onclick = () => { closeOverlays(); paused = false; };
$('btn-retry').onclick = () => { state.health = 100; state.wanted = 3; closeOverlays(); running = true; };
$('btn-gameover-title').onclick = () => { closeOverlays(); running = false; $('start-screen').classList.remove('hidden'); };

// --- HUD ----------------------------------------------------------------------
const minimap = $('minimap').getContext('2d');
function updateHud() {
  const m = currentMission(state);
  $('mission-num').textContent = `MISSION ${m.id}`;
  $('mission-name').textContent = m.name;
  $('mission-stage-label').textContent = `STAGE ${state.missionStage + 1} / ${m.stages.length}`;
  $('mission-stage-name').textContent = m.stages[state.missionStage].toUpperCase();
  $('mission-progress').style.width = `${Math.round(state.missionProgress * 100)}%`;
  $('mission-objective').textContent = m.brief;
  $('mission-next').innerHTML = `Next: <b>${state.missionStage + 1 < m.stages.length ? m.stages[state.missionStage + 1] : 'Mission complete'}</b> · Reward <b>$${m.reward.toLocaleString()}</b> · Respect +${m.respect}`;
  const w = Math.round(state.wanted);
  $('wanted-stars').innerHTML = '★'.repeat(w) + '<span class="off">' + '★'.repeat(5 - w) + '</span>';
  $('wanted-label').textContent = wantedLabel(w);
  $('cash-label').textContent = `$${state.cash.toLocaleString()}`;
  $('respect-label').textContent = `${state.respect.toLocaleString()} · ${respectTitle(state.respect)}`;
  $('district-label').textContent = districtAt(player.x, player.z);
  $('health-num').textContent = Math.round(state.health);
  $('health-fill').style.width = `${state.health}%`;
  $('armor-num').textContent = Math.round(state.armor);
  $('armor-fill').style.width = `${state.armor}%`;
  $('car-name').textContent = player.onFoot ? 'ON FOOT' : CARS[state.carIndex].name.toUpperCase();
  $('nitro-fill').style.width = `${state.nitro}%`;
  $('storm-readout').textContent = `Wind ${Math.round(90 + world.windGust * 58)} km/h · Surge +${world.floodLevel.toFixed(1)} m · Lightning active`;
}
function drawMinimap() {
  const ctx = minimap;
  const S = 218, H = CITY.half;
  ctx.fillStyle = '#06101e';
  ctx.fillRect(0, 0, S, S);
  // Flood tint.
  ctx.fillStyle = 'rgba(13,43,69,0.9)';
  ctx.fillRect(0, 0, S, S * 0.25);
  // Roads.
  ctx.strokeStyle = '#334155'; ctx.lineWidth = 5;
  for (let i = -4; i <= 4; i++) {
    const p = ((i * 85 + H) / (2 * H)) * S;
    ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(S, p); ctx.stroke();
  }
  // Districts.
  ctx.font = '8px sans-serif'; ctx.fillStyle = '#7ee7f9';
  ctx.fillText('NEON ROW', 18, 96); ctx.fillText('PALMETTO', 150, 96);
  ctx.fillText('DOWNTOWN', 84, 30); ctx.fillText('HARBOR RD', 84, 190);
  // Objective beacon.
  const bx = ((beacon.position.x + H) / (2 * H)) * S;
  const bz = ((beacon.position.z + H) / (2 * H)) * S;
  ctx.fillStyle = '#ffb020';
  ctx.beginPath(); ctx.arc(bx, bz, 6, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ffb020'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bx, bz, 10 + Math.sin(world.t * 4) * 3, 0, 7); ctx.stroke();
  // Police.
  ctx.fillStyle = '#3b82f6';
  for (const p of police) {
    ctx.fillRect(((p.mesh.position.x + H) / (2 * H)) * S - 2, ((p.mesh.position.z + H) / (2 * H)) * S - 2, 4, 4);
  }
  // Player arrow.
  const px = ((player.x + H) / (2 * H)) * S;
  const pz = ((player.z + H) / (2 * H)) * S;
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(-player.angle);
  ctx.fillStyle = '#ff2e88';
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// --- mission objective flow ---------------------------------------------------
const STAGE_TARGETS = [
  { x: 0, z: 190 },    // meet Dara
  { x: -85, z: 120 },  // steal a fast car
  { x: 0, z: 150 },    // roadblock
  { x: 0, z: -300 },   // flood barrier
];
function checkMissionProgress() {
  const m = currentMission(state);
  const target = STAGE_TARGETS[state.missionStage] || STAGE_TARGETS[0];
  beacon.position.set(target.x, 0, target.z);
  const d = Math.hypot(player.x - target.x, player.z - target.z);
  if (d < 14) {
    if (state.missionStage === 2) {
      // Smash the roadblock: cruisers scatter, wanted spikes, then fall.
      toast('ROADBLOCK SMASHED', 'The barrier folds — the manifests are yours');
      triggerExplosion(world, -20, 150);
      audio.boom();
      state.wanted = Math.min(5, state.wanted + 0.5);
      state.score += 500;
    }
    const res = advanceStage(state);
    if (res.done) {
      audio.cash();
      toast(`MISSION COMPLETE — ${m.name}`, `+$${res.reward.toLocaleString()} · Respect +${res.respect}`);
      addDispatch(`Job done. Dara says the manifests are clean.`);
      const next = startNextMission(state);
      if (next) {
        showDialogue({ who: 'DARA VOSS', icon: 'D', color: '#ff2e88', text: `Next up: ${next.name}. ${next.brief}` });
      } else {
        toast('STORY COMPLETE — CORAL BAY IS YOURS', 'All 10 missions done. Free roam forever.');
      }
      if (state.missionStage === 3 && currentMission(state).id === 6) triggerExplosion(world, -150, 320);
    } else {
      toast(`STAGE ${state.missionStage + 1} — ${res.stage}`, m.brief);
      showDialogue(DIALOGUE[(state.missionStage + 1) % DIALOGUE.length]);
    }
    updateHud();
  }
  state.missionProgress = Math.max(state.missionProgress, (state.missionStage + Math.max(0, 1 - d / 200) * 0.9) / m.stages.length);
}

// --- per-frame update -----------------------------------------------------------
let lastTime = performance.now();
let autosaveT = 0;
let clockT = 0;
let sirenT = 0;
function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (!running || paused) { renderer.render(scene, camera); return; }
  state.playTime += dt;
  state.missionTime += dt;
  clockT += dt;
  if (clockT > 1) {
    clockT = 0;
    const mins = 167 + Math.floor(state.playTime / 60);
    $('dispatch-clock').textContent = `0${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
    if (Math.random() < 0.6) addDispatch(DISPATCH_LINES[Math.floor(Math.random() * DISPATCH_LINES.length)]);
  }

  // --- driving / walking ------------------------------------------------------
  const car = CARS[state.carIndex];
  // In a screenshot staging the player creeps forward slowly so the frame
  // stays composed (roadblock ahead, heli overhead) instead of driving off.
  const forward = shotHold ? shotCreep : (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 0.55 : 0);
  const steer = shotHold ? 0 : (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
  const nitro = keys.ShiftLeft && state.nitro > 0 && forward > 0 && !player.onFoot;
  if (nitro) { state.nitro = Math.max(0, state.nitro - dt * 34); if (Math.random() < 0.1) audio.nitro(); }
  else state.nitro = Math.min(100, state.nitro + dt * 7);
  if (player.onFoot) {
    const spd = 6;
    player.x += -Math.sin(player.angle) * forward * spd * dt;
    player.z += -Math.cos(player.angle) * forward * spd * dt;
    player.angle += steer * 2.4 * dt;
    player.speed = Math.abs(forward) * spd * 3.6;
    onFootMesh.position.set(player.x, 0, player.z);
    onFootMesh.rotation.y = player.angle;
  } else {
    const top = car.top * (nitro ? 1.45 : 1);
    const target = forward * top;
    const accel = forward !== 0 ? car.accel : 18;
    player.speed += (target - player.speed) * Math.min(1, accel * dt / top * 3 + dt * 0.6);
    if (keys.Space) player.speed *= Math.max(0, 1 - dt * 3.2); // handbrake
    player.speed = Math.max(-14, Math.min(top, player.speed));
    const spd01 = Math.abs(player.speed) / car.top;
    player.angle += steer * (0.9 + spd01 * 1.1) * dt * (player.speed >= 0 ? 1 : -1) * (forward < 0 ? -1 : 1);
    // Wind pushes the car sideways in gusts; flood drags it in deep water.
    const windPush = world.windGust * 1.6 * Math.sin(world.t * 0.7);
    player.x += (-Math.sin(player.angle) * player.speed + windPush * 0.4) * dt;
    player.z += (-Math.cos(player.angle) * player.speed + windPush * 0.25) * dt;
    if (world.floodLevel > 0.9) player.speed *= Math.max(0, 1 - dt * 0.25);
    player.x = Math.max(-CITY.half, Math.min(CITY.half, player.x));
    player.z = Math.max(-CITY.half, Math.min(CITY.half, player.z));
    playerCar.position.set(player.x, 0, player.z);
    playerCar.rotation.y = player.angle;
    playerCar.rotation.z = -steer * spd01 * 0.06;
    audio.setSpeed(spd01, nitro);
  }
  state.speed = Math.abs(player.speed);

  // --- traffic: cruise the grid, panic-flee from the player -------------------
  for (const t of traffic) {
    const panic = Math.hypot(t.mesh.position.x - player.x, t.mesh.position.z - player.z) < 22;
    const spd = t.speed * (panic ? 2.1 : 1);
    if (t.horizontal) t.mesh.position.x += t.dir * spd * dt;
    else t.mesh.position.z += t.dir * spd * dt;
    if (t.mesh.position.x > 360) t.mesh.position.x = -360;
    if (t.mesh.position.x < -360) t.mesh.position.x = 360;
    if (t.mesh.position.z > 360) t.mesh.position.z = -360;
    if (t.mesh.position.z < -360) t.mesh.position.z = 360;
  }

  // --- police: chase with wanted-scaled aggression ------------------------------
  const pol = policeForWanted(Math.round(state.wanted));
  sirenT -= dt;
  if (sirenT <= 0 && pol.cruisers > 0) { sirenT = 7 + Math.random() * 6; audio.siren(); }
  for (const p of police) {
    const dx = player.x - p.mesh.position.x, dz = player.z - p.mesh.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const want = Math.min(pol.cruisers, 7);
    if (police.indexOf(p) < want && state.wanted >= 1) {
      const chase = 16 + pol.aggression * 22;
      if (d > 7) {
        // Close in but hold a 7 m cordon — no pile-up on top of the player.
        p.mesh.position.x += (dx / d) * chase * dt;
        p.mesh.position.z += (dz / d) * chase * dt;
      } else {
        p.mesh.position.x += (-dz / d) * 3 * dt;
        p.mesh.position.z += (dx / d) * 3 * dt;
      }
      p.mesh.rotation.y = Math.atan2(dx, dz);
      p.sirenT -= dt;
      if (p.sirenT <= 0) {
        p.sirenT = 0.4 + Math.random() * 0.5;
        p.mesh.userData.lightbar.material.emissive.setHex(Math.random() < 0.5 ? 0xff2222 : 0x2244ff);
      }
      // Busted if a cruiser sits on the player while slow (never in a staged shot).
      if (d < 7.5 && Math.abs(player.speed) < 8 && !player.onFoot && !shotHold) {
        state.health -= 25 * dt;
        if (state.health <= 0) { state.health = 0; state.arrests++; gameOver('busted'); }
      }
    } else {
      // Patrol: slow loop around the block.
      p.mesh.position.x += Math.sin(world.t * 0.2 + police.indexOf(p)) * 4 * dt;
      p.mesh.position.z += Math.cos(world.t * 0.2 + police.indexOf(p)) * 4 * dt;
    }
  }

  // --- pedestrians: run from the storm and the player --------------------------
  for (const p of peds) {
    const dx = p.mesh.position.x - player.x, dz = p.mesh.position.z - player.z;
    const d = Math.hypot(dx, dz) || 1;
    const flee = d < 26 ? 2.4 : 1;
    const dir = d < 26 ? 1 : Math.sin(world.t * 0.3 + p.phase) * 0.4;
    p.mesh.position.x += ((dx / d) * dir * flee + Math.cos(p.phase) * 0.5) * p.speed * dt;
    p.mesh.position.z += ((dz / d) * dir * flee + Math.sin(p.phase) * 0.5) * p.speed * dt;
    p.mesh.position.x = Math.max(-330, Math.min(330, p.mesh.position.x));
    p.mesh.position.z = Math.max(-330, Math.min(330, p.mesh.position.z));
    p.mesh.rotation.y = Math.atan2(dx, dz);
    p.mesh.position.y = Math.abs(Math.sin(world.t * 6 + p.phase)) * 0.12;
  }

  // --- tracers fade ---------------------------------------------------------------
  for (let i = tracers.length - 1; i >= 0; i--) {
    tracers[i].t += dt;
    tracers[i].line.material.opacity = Math.max(0, 0.9 - tracers[i].t * 6);
    if (tracers[i].t > 0.18) { scene.remove(tracers[i].line); tracers.splice(i, 1); }
  }

  // --- storm, flood, lightning flash ----------------------------------------------
  updateWorld(world, dt, player, state.missionTime);
  const flash = world.lightningLight.intensity;
  $('flash').style.opacity = flash > 0.5 ? Math.min(0.55, flash * 0.09) : 0;
  if (flash > 4 && Math.random() < 0.3) audio.thunder(0.5 + Math.random() * 0.5);

  // --- wanted decay when hidden in the rain -----------------------------------------
  const hidden = Math.abs(player.speed) < 2 && police.every((p) => Math.hypot(p.mesh.position.x - player.x, p.mesh.position.z - player.z) > 60);
  updateWanted(state, dt, 0, hidden);

  // --- camera: chase cam, offset to the side for a 3/4 view of the car ---------
  const camDist = player.onFoot ? 9 : 13;
  const camHeight = player.onFoot ? 4.5 : 5.2;
  const side = 4.5;
  const cx = player.x + Math.sin(player.angle) * camDist + Math.cos(player.angle) * side;
  const cz = player.z + Math.cos(player.angle) * camDist - Math.sin(player.angle) * side;
  camera.position.lerp(new THREE.Vector3(cx, camHeight, cz), Math.min(1, dt * 5));
  camera.lookAt(player.x, 1.6, player.z);

  // --- HUD ------------------------------------------------------------------------------
  checkMissionProgress();
  updateHud();
  drawMinimap();
  $('speed-num').innerHTML = `${Math.round(Math.abs(player.speed) * 3.2)} <small>KM/H</small>`;

  // --- autosave ------------------------------------------------------------------------------
  autosaveT += dt;
  if (autosaveT > 30) { autosaveT = 0; saveGame(state); }

  renderer.render(scene, camera);
}

// --- shot staging: real game states for the screenshots ------------------------
let shotHold = false;
let shotCreep = 0.3;
function applyShot(shot) {
  // Every shot boots straight into live play with a dense, distinct frame.
  shotHold = true; // creep forward slowly; the world (rain, heli, flood) keeps moving
  $('start-screen').classList.add('hidden');
  running = true;
  showDialogue(DIALOGUE[0]);
  addDispatch(DISPATCH_LINES[0]);
  addDispatch(DISPATCH_LINES[1]);
  addDispatch(DISPATCH_LINES[2]);
  if (shot === 'hero') {
    shotCreep = 0.15; // slow creep: the roadblock stays 25 m ahead at capture
    player.x = 0; player.z = 205; player.angle = 0; // face north: roadblock ahead
    player.speed = 12; state.wanted = 5; state.missionStage = 2;
    state.missionProgress = 0.62;
    world.lightningLight.intensity = 5;
    for (let i = 0; i < police.length; i++) {
      const a = (i / police.length) * Math.PI * 2;
      police[i].mesh.position.set(player.x + Math.cos(a) * 26, 0, player.z + Math.sin(a) * 26);
    }
    camera.position.set(0, 6, 232);
  } else if (shot === 'neon') {
    shotCreep = 0.3;
    player.x = -150; player.z = -30; player.angle = Math.PI / 2;
    player.speed = 18; state.wanted = 3; state.missionStage = 1;
    state.missionProgress = 0.4;
    showDialogue(DIALOGUE[1]);
    for (let i = 0; i < 6; i++) {
      peds[i].mesh.position.set(player.x + (i - 3) * 6, 0, player.z + 12 + (i % 3) * 4);
    }
    // Stage traffic ahead of the player so the street reads as alive.
    for (let i = 0; i < 3 && i < traffic.length; i++) {
      traffic[i].mesh.position.set(player.x - 30 - i * 18, 0, player.z + (i % 2 ? 4 : -4));
      traffic[i].mesh.rotation.y = Math.PI / 2;
      traffic[i].horizontal = false;
    }
    camera.position.set(-128, 6, -6);
  } else if (shot === 'pier') {
    shotCreep = 0.3;
    // Face the pier and Crane 4 from the west so the blast is in the open.
    player.x = -185; player.z = 250; player.angle = 3.64;
    player.speed = 44; state.wanted = 5; state.missionStage = 3;
    state.missionProgress = 0.85;
    state.carIndex = 6; // Mara 4x4
    paintPlayerCar();
    // Detonate late so the capture catches the fireball mid-blast, not the smoke.
    setTimeout(() => { if (running) { triggerExplosion(world, -150, 310); audio.boom(); } }, 3000);
    showDialogue(DIALOGUE[4]);
    camera.position.set(-128, 7, 292);
  } else if (shot === 'downtown') {
    shotCreep = 0.3;
    player.x = 0; player.z = -140; player.angle = Math.PI;
    player.speed = 26; state.wanted = 5; state.missionStage = 3;
    state.missionProgress = 0.8;
    if (!state.ownedWeapons.includes('RIFLE')) state.ownedWeapons.push('RIFLE');
    selectWeapon(2); // rifle out for the lockdown frame
    camera.position.set(0, 6, -112);
  }
  // ?px=&pz=&pa= dev override.
  if (params.get('px')) player.x = parseFloat(params.get('px'));
  if (params.get('pz')) player.z = parseFloat(params.get('pz'));
  if (params.get('pa')) player.angle = parseFloat(params.get('pa'));
  playerCar.position.set(player.x, 0, player.z);
  playerCar.rotation.y = player.angle;
  updateHud();
  window.__STORM_READY__ = true;
}

// --- boot -----------------------------------------------------------------------
addDispatch('Unit 7: suspect vehicle pink coupe, Harbor Road, heading north.');
addDispatch('Air One: spotlight on the suspect. Five stars, repeat, five stars.');
addDispatch('Dispatch: surge warning — flood barrier closes in nine minutes.');
updateHud();
drawMinimap();
if (SHOT) {
  applyShot(SHOT);
} else {
  window.__STORM_READY__ = true;
}
animate();
