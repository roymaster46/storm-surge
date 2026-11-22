// STORM SURGE — logic.js: missions, police, cars, traffic, crew & save.
// Pure game-state logic: no rendering here except through the car meshes
// and pedestrian meshes the world owns. All names, characters and the city
// are original creations for this game.

export const CARS = [
  { id: 'harbor-one', name: 'Harbor One GT', top: 61, accel: 26, grip: 1.0, price: 0, owned: true, color: 0xff2e88, desc: 'Your signature coupe. Nitro-tuned, storm-proof.' },
  { id: 'surge-runner', name: 'Surge Runner', top: 55, accel: 22, grip: 0.95, price: 4200, owned: false, color: 0x22d3ee, desc: 'Flood-ready sedan with raised intake.' },
  { id: 'palmetto', name: 'Palmetto Cruiser', top: 48, accel: 18, grip: 0.9, price: 2600, owned: false, color: 0xffb020, desc: 'Low, loud, loves the Strip.' },
  { id: 'bay-truck', name: 'Bayview Hauler', top: 44, accel: 15, grip: 1.1, price: 3100, owned: false, color: 0x2eff8a, desc: 'Pickup that plows through floodwater.' },
  { id: 'coral-taxi', name: 'Coral Cab', top: 50, accel: 19, grip: 0.92, price: 1800, owned: false, color: 0xfacc15, desc: 'Ex-cab. Nobody looks twice at a cab.' },
  { id: 'night-owl', name: 'Night Owl S', top: 58, accel: 24, grip: 1.05, price: 6800, owned: false, color: 0x8b5cf6, desc: 'Midnight sports car, police-magnet paint.' },
  { id: 'storm-4x4', name: 'Mara 4x4', top: 52, accel: 20, grip: 1.15, price: 5400, owned: false, color: 0xf97316, desc: 'Hurricane-grade off-roader. Built for tonight.' },
];

export const WEAPONS = [
  { name: 'PISTOL', dmg: 12, rate: 0.28, range: 60, price: 0, owned: true },
  { name: 'SMG', dmg: 9, rate: 0.09, range: 45, price: 900, owned: false },
  { name: 'RIFLE', dmg: 26, rate: 0.16, range: 110, price: 2400, owned: false },
  { name: 'SHOTGUN', dmg: 40, rate: 0.7, range: 22, price: 1600, owned: false },
  { name: 'ROCKET', dmg: 120, rate: 1.4, range: 130, price: 5200, owned: false },
];

export const MISSIONS = [
  { id: 1, name: 'FIRST RAIN', reward: 800, respect: 40, brief: 'Steal the Harbor One GT from the Bayview docks before the storm hits.', stages: ['Reach the docks', 'Steal the Harbor One', 'Lose the 1-star heat', 'Deliver to Dara'] },
  { id: 2, name: 'NEON DEBT', reward: 1400, respect: 60, brief: 'Collect protection money down Neon Row while the clubs are still open.', stages: ['Visit the Coral Club', 'Collect from 3 shops', 'Escape the bouncers', 'Pay Dara'] },
  { id: 3, name: 'FLOOD RUNNERS', reward: 1900, respect: 70, brief: 'Smuggle medical crates through the flooded Old Coral streets.', stages: ['Load the crates', 'Cross the flood zone', 'Dodge the patrol boats', 'Drop at the clinic'] },
  { id: 4, name: 'THE INFORMANT', reward: 2300, respect: 80, brief: 'A CBPD dispatcher is selling the lockdown codes. Meet her at Pier 9.', stages: ['Reach Pier 9', 'Buy the codes', 'Survive the setup', 'Vanish into the storm'] },
  { id: 5, name: 'CRANE 4', reward: 3100, respect: 100, brief: 'Rig the dock crane to drop a container on the evidence convoy.', stages: ['Climb Crane 4', 'Rig the release', 'Wait for the convoy', 'Drop it and run'] },
  { id: 6, name: 'THE SURGE RUN', reward: 4200, respect: 120, brief: 'Smash the Harbor Road roadblock and reach the flood barrier with the manifests before the surge closes it.', stages: ['Meet Dara on Harbor Road', 'Steal a fast car', 'OUTRUN THE STORM', 'Break the barrier'] },
  { id: 7, name: 'BLACKOUT', reward: 4800, respect: 130, brief: 'Cut power to Downtown so the crew can hit the Coral Reserve vault.', stages: ['Reach the substation', 'Plant the charges', 'Detonate at 03:00', 'Cover the crew'] },
  { id: 8, name: 'VAULT OF RAIN', reward: 6500, respect: 160, brief: 'The vault heist itself — in the dark, in the flood, with 5 stars on you.', stages: ['Enter the vault', 'Crack the safe', 'Grab the gold', 'Escape the lockdown'] },
  { id: 9, name: 'HURRICANE EYE', reward: 7200, respect: 180, brief: 'The eye of Mara passes over Coral Bay. One quiet hour to move the gold.', stages: ['Load the gold', 'Cross the bridge', 'Lose the heli', 'Reach the safehouse'] },
  { id: 10, name: 'AFTER THE STORM', reward: 10000, respect: 250, brief: 'Sunrise over a drowned city. One last convoy, one last choice: run or rule.', stages: ['Meet the crew', 'Hit the convoy', 'Choose: run or rule', 'Coral Bay is yours'] },
];

export const CREW = [
  { name: 'Dara Voss', role: 'Fixer', skill: 'Plans every job, never misses a payout.', icon: 'D', color: '#ff2e88' },
  { name: 'Milo "Sparks" Reyes', role: 'Driver', skill: 'Drives getaway in a hurricane. Literally.', icon: 'M', color: '#22d3ee' },
  { name: 'June Park', role: 'Hacker', skill: 'Owns the traffic lights and the police radio.', icon: 'J', color: '#2eff8a' },
  { name: 'Big Tolu', role: 'Muscle', skill: 'Carries the gold. Carries you, if needed.', icon: 'T', color: '#ffb020' },
];

export const SIDE_JOBS = [
  { name: 'Taxi fares', desc: 'Ferry soaked citizens across town. $40–$120 a fare.', pay: 90 },
  { name: 'Storm courier', desc: 'Deliver medicine through the flood. $150 a run.', pay: 150 },
  { name: 'Vigilante', desc: 'Stop a mugging in progress. Respect +25.', pay: 60 },
  { name: 'Street race', desc: 'Midnight sprint down Palmetto Strip. Winner takes $500.', pay: 500 },
];

export const DISTRICTS = [
  'Harbor Road', 'Neon Row', 'Palmetto Strip', 'Downtown', 'Bayview', 'Old Coral',
];

export function districtAt(x, z) {
  if (z > 60 && Math.abs(x) < 110) return 'Harbor Road';
  if (x < -110 && z < 40) return 'Neon Row';
  if (x > 110 && z < 40) return 'Palmetto Strip';
  if (z < -110) return 'Downtown';
  if (x < -110) return 'Bayview';
  if (x > 110) return 'Old Coral';
  return 'Harbor Road';
}

export function createState() {
  return {
    cash: 12480,
    respect: 1240,
    health: 100,
    armor: 60,
    wanted: 5,
    missionIndex: 5,          // mission 6 (0-based)
    missionStage: 2,          // stage 3/4: OUTRUN THE STORM
    missionProgress: 0.62,
    missionTime: 0,
    missionDone: false,
    completedMissions: [1, 2, 3, 4, 5],
    carIndex: 0,
    weaponIndex: 0,
    nitro: 100,
    speed: 0,
    onFoot: false,
    inCar: true,
    score: 0,
    kills: 0,
    carsStolen: 0,
    arrests: 0,
    deaths: 0,
    radioStation: 0,
    radioOn: true,
    stormCategory: 4,
    windKmh: 148,
    surgeM: 2.1,
    crew: CREW.map((c) => ({ ...c, unlocked: true })),
    ownedCars: ['harbor-one'],
    ownedWeapons: ['PISTOL'],
    jobsDone: 0,
    playTime: 0,
    startedAt: Date.now(),
  };
}

export function respectTitle(respect) {
  if (respect >= 2000) return 'LEGEND OF CORAL BAY';
  if (respect >= 1200) return 'STREET KING';
  if (respect >= 600) return 'MADE NAME';
  if (respect >= 250) return 'HUSTLER';
  return 'NOBODY';
}

export function wantedLabel(wanted) {
  return ['CLEAN', '1 STAR — PATROL', '2 STARS — PURSUIT', '3 STARS — ROADBLOCKS', '4 STARS — HELI UP', '5 STARS — LOCKDOWN'][wanted];
}

// --- police response -------------------------------------------------------
export function policeForWanted(wanted) {
  return {
    cruisers: [0, 1, 2, 3, 5, 7][wanted],
    heli: wanted >= 4,
    roadblocks: wanted >= 3,
    spikeStrips: wanted >= 3,
    aggression: 0.3 + wanted * 0.14,
  };
}

// Wanted rises when the player is seen committing crimes, decays when hidden.
export function updateWanted(state, dt, crimeHeat, hidden) {
  if (crimeHeat > 0) state.wanted = Math.min(5, state.wanted + crimeHeat * dt * 0.35);
  else if (hidden && state.wanted > 0) state.wanted = Math.max(0, state.wanted - dt * 0.08);
  state.wanted = Math.round(state.wanted);
}

// --- mission flow ----------------------------------------------------------
export function currentMission(state) {
  return MISSIONS[state.missionIndex];
}

export function advanceStage(state) {
  const m = currentMission(state);
  if (state.missionStage < m.stages.length - 1) {
    state.missionStage++;
    state.missionProgress = state.missionStage / m.stages.length;
    return { done: false, stage: m.stages[state.missionStage] };
  }
  // Mission complete.
  state.cash += m.reward;
  state.respect += m.respect;
  state.completedMissions.push(m.id);
  state.missionDone = true;
  return { done: true, reward: m.reward, respect: m.respect };
}

export function startNextMission(state) {
  if (state.missionIndex < MISSIONS.length - 1) {
    state.missionIndex++;
    state.missionStage = 0;
    state.missionProgress = 0;
    state.missionDone = false;
    state.missionTime = 0;
    return currentMission(state);
  }
  return null; // story complete
}

// --- save / load ------------------------------------------------------------
const SAVE_KEY = 'storm-surge-save-v1';

export function saveGame(state) {
  try {
    const data = { ...state, savedAt: new Date().toISOString(), crew: undefined };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const state = createState();
    Object.assign(state, data);
    return state;
  } catch { return null; }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}
