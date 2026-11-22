// STORM SURGE — world.js: the city of Coral Bay and its hurricane.
// Builds the 3D city (6 districts, flooded streets, bending palms, neon),
// the storm itself (slanting rain, lightning strobes, wind gusts, flood
// water that rises with the mission clock) and the police helicopter with
// its searchlight, roadblocks, spike strips and the set-piece explosion.
// Everything is procedural Three.js geometry — no external assets.

export const CITY = {
  half: 340,            // playable half-extent in metres
  districts: [
    { name: 'Harbor Road', x: 0, z: 120, r: 110, color: 0xffb020 },
    { name: 'Neon Row', x: -170, z: -40, r: 95, color: 0xff2e88 },
    { name: 'Palmetto Strip', x: 170, z: -60, r: 95, color: 0x22d3ee },
    { name: 'Downtown', x: 0, z: -170, r: 120, color: 0x8b5cf6 },
    { name: 'Bayview', x: -200, z: 180, r: 90, color: 0x2eff8a },
    { name: 'Old Coral', x: 200, z: 190, r: 90, color: 0xf97316 },
  ],
};

// Seeded random so the city is identical every load (and every screenshot).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NEON = [0xff2e88, 0x22d3ee, 0xffb020, 0x8b5cf6, 0x2eff8a, 0xf97316];

function box(w, h, d, color, emissive) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.15, emissive: emissive ?? 0x000000, emissiveIntensity: 0.6 }),
  );
  m.castShadow = false;
  return m;
}

function makePalm(rng) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.42, 7 + rng() * 3, 6),
    new THREE.MeshStandardMaterial({ color: 0x5b4632, roughness: 1 }),
  );
  trunk.position.y = 3.5;
  g.add(trunk);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.55, 3.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x1f7a3a, roughness: 0.9, emissive: 0x062b12, emissiveIntensity: 0.5 }),
    );
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.1, 7.2, Math.sin(a) * 1.1);
    leaf.rotation.z = Math.cos(a) * 1.15;
    leaf.rotation.x = -Math.sin(a) * 1.15;
    g.add(leaf);
  }
  g.userData.isPalm = true;
  g.userData.phase = rng() * Math.PI * 2;
  return g;
}

function makeBuilding(rng, x, z, w, d) {
  const h = 14 + rng() * 46;
  const c = [0x1b2a4a, 0x24365e, 0x2e2140, 0x14333a, 0x3a2a1e][Math.floor(rng() * 5)];
  const g = new THREE.Group();
  const body = box(w, h, d, c);
  body.position.y = h / 2;
  g.add(body);
  // Lit windows: emissive planes on the facade.
  const winMat = new THREE.MeshBasicMaterial({ color: NEON[Math.floor(rng() * NEON.length)] });
  const rows = Math.floor(h / 5);
  const cols = Math.floor(w / 4);
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      if (rng() < 0.62) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2), winMat);
        win.position.set(-w / 2 + 2 + col * 4, 4 + r * 5, d / 2 + 0.06);
        g.add(win);
      }
    }
  }
  // Neon roof sign strip.
  const sign = box(w * 0.7, 0.9, 0.3, 0x111111, NEON[Math.floor(rng() * NEON.length)]);
  sign.position.set(0, h + 0.5, d / 2);
  g.add(sign);
  g.position.set(x, 0, z);
  return g;
}

function makeCarMesh(color, kind) {
  const g = new THREE.Group();
  const body = box(2.1, 0.62, 4.6, color);
  body.position.y = 0.55;
  g.add(body);
  const cabin = box(1.8, 0.55, 2.2, 0x0a1420);
  cabin.position.set(0, 1.05, -0.2);
  g.add(cabin);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  for (const sx of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), lightMat);
    hl.position.set(sx, 0.55, 2.32);
    g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.08), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    tl.position.set(sx, 0.55, -2.32);
    g.add(tl);
  }
  if (kind === 'police') {
    const bar = box(1.2, 0.16, 0.5, 0x111111, 0x2244ff);
    bar.position.set(0, 1.45, -0.2);
    g.add(bar);
    g.userData.lightbar = bar;
  }
  if (kind === 'taxi') {
    const sign = box(0.8, 0.22, 0.5, 0x111111, 0xffb020);
    sign.position.set(0, 1.45, -0.2);
    g.add(sign);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 });
  for (const [wx, wz] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.5], [1.0, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    g.add(w);
  }
  return g;
}

export function buildWorld(scene) {
  const rng = mulberry32(20261122);
  const world = {
    palms: [], buildings: [], rain: null, rainVel: null, flood: null,
    heli: null, heliLight: null, heliBeam: null, roadblocks: [],
    spikeStrips: [], explosion: null, explosionLight: null,
    lightningTimer: 2.5, windGust: 0, floodLevel: 0.55, t: 0,
    traffic: [], peds: [], cars: [],
  };

  // --- sky, fog, lights -------------------------------------------------
  scene.background = new THREE.Color(0x0a1428);
  scene.fog = new THREE.FogExp2(0x0a1226, 0.0022);
  const ambient = new THREE.AmbientLight(0x8fa8d8, 1.7);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0x8fb4ff, 0x24344e, 1.0);
  scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x8fa8d8, 1.0);
  moon.position.set(-120, 220, -80);
  scene.add(moon);
  const lightning = new THREE.DirectionalLight(0xdfeaff, 0);
  lightning.position.set(60, 180, 40);
  scene.add(lightning);
  world.lightningLight = lightning;

  // --- ground: wet asphalt grid ----------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2 + 120, CITY.half * 2 + 120),
    new THREE.MeshStandardMaterial({ color: 0x182238, roughness: 0.35, metalness: 0.5 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Roads: dark strips with neon edge lines, grid every 85 m.
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x232f4a, roughness: 0.3, metalness: 0.5 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffb020 });
  for (let i = -4; i <= 4; i++) {
    for (const horizontal of [true, false]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(720, 14), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(horizontal ? 0 : i * 85, 0.02, horizontal ? i * 85 : 0);
      if (!horizontal) road.rotation.z = Math.PI / 2;
      scene.add(road);
      for (let k = -3; k <= 3; k++) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.35), lineMat);
        dash.rotation.x = -Math.PI / 2;
        dash.position.set(horizontal ? k * 85 : i * 85, 0.04, horizontal ? i * 85 : k * 85);
        if (!horizontal) dash.rotation.z = Math.PI / 2;
        scene.add(dash);
      }
    }
  }

  // --- flood water: reflective plane that rises with the storm -----------
  const flood = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY.half * 2, CITY.half * 2, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x14486e, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.8 }),
  );
  flood.rotation.x = -Math.PI / 2;
  flood.position.y = 0.55;
  scene.add(flood);
  world.flood = flood;

  // --- buildings: blocks kept clear of roads ----------------------------
  for (let gx = -3; gx <= 3; gx++) {
    for (let gz = -3; gz <= 3; gz++) {
      const bx = gx * 85 + 34, bz = gz * 85 + 34;
      if (Math.abs(bx) > CITY.half || Math.abs(bz) > CITY.half) continue;
      const b = makeBuilding(rng, bx, bz, 22 + rng() * 14, 22 + rng() * 14);
      scene.add(b);
      world.buildings.push(b);
      if (rng() < 0.6) {
        const b2 = makeBuilding(rng, bx - 8, bz + 26, 14 + rng() * 8, 12 + rng() * 8);
        scene.add(b2);
        world.buildings.push(b2);
      }
    }
  }

  // --- palms along every road, bending in the wind -----------------------
  for (let i = -8; i <= 8; i++) {
    for (const side of [-1, 1]) {
      const p = makePalm(rng);
      p.position.set(i * 42 + (rng() - 0.5) * 6, 0, 10 * side + (rng() - 0.5) * 2);
      scene.add(p);
      world.palms.push(p);
      const p2 = makePalm(rng);
      p2.position.set(10 * side, 0, i * 42 + (rng() - 0.5) * 6);
      scene.add(p2);
      world.palms.push(p2);
    }
  }

  // --- harbor bridge (east span, off the main Harbor Road) + pier -----------
  const bridge = box(16, 1.2, 220, 0x1a2436);
  bridge.position.set(200, 3, 260);
  scene.add(bridge);
  for (const sx of [192, 208]) {
    const rail = box(0.5, 1.1, 220, 0x111111, sx < 192 ? 0xff2e88 : 0x22d3ee);
    rail.position.set(sx, 4.2, 260);
    scene.add(rail);
  }
  const pier = box(26, 1.4, 90, 0x241a12);
  pier.position.set(-150, 1, 300);
  scene.add(pier);
  const crane = box(3, 42, 3, 0xffb020);
  crane.position.set(-162, 22, 320);
  scene.add(crane);
  const craneArm = box(26, 2, 2, 0xffb020);
  craneArm.position.set(-150, 40, 320);
  scene.add(craneArm);

  // --- flood barrier (mission destination) -------------------------------
  const barrier = box(60, 9, 4, 0x3a3f4a);
  barrier.position.set(0, 4.5, -300);
  scene.add(barrier);
  const barrierLight = box(60, 0.8, 0.4, 0x111111, 0x2eff8a);
  barrierLight.position.set(0, 9.2, -298);
  scene.add(barrierLight);

  // --- rain: 2600 slanting streaks ---------------------------------------
  const rainCount = 2600;
  const pos = new Float32Array(rainCount * 3);
  const vel = new Float32Array(rainCount);
  for (let i = 0; i < rainCount; i++) {
    pos[i * 3] = (rng() - 0.5) * 300;
    pos[i * 3 + 1] = rng() * 60;
    pos[i * 3 + 2] = (rng() - 0.5) * 300;
    vel[i] = 38 + rng() * 22;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xbfdcff, size: 0.9, transparent: true, opacity: 0.8 }));
  scene.add(rain);
  world.rain = rain;
  world.rainVel = vel;

  // --- police helicopter + searchlight ------------------------------------
  const heli = new THREE.Group();
  const heliBody = box(3.2, 1.6, 6.5, 0x1e293b);
  heli.add(heliBody);
  const heliGlass = box(2.6, 1.0, 1.6, 0x0a1420);
  heliGlass.position.set(0, 0.3, 2.6);
  heli.add(heliGlass);
  const rotor = box(11, 0.12, 0.7, 0x0a0a0a);
  rotor.position.y = 1.2;
  heli.add(rotor);
  heli.userData.rotor = rotor;
  const beam = new THREE.SpotLight(0xfff6c9, 900, 160, 0.22, 0.5, 1.2);
  beam.position.set(0, -0.6, 1);
  heli.add(beam);
  heli.add(beam.target);
  beam.target.position.set(0, -40, 6);
  heli.position.set(20, 55, 60);
  scene.add(heli);
  world.heli = heli;
  world.heliLight = beam;

  // --- roadblocks + spike strips ------------------------------------------
  function roadblock(x, z, angle) {
    const g = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const car = makeCarMesh(0x1e293b, 'police');
      car.position.set(i * 4.4, 0, 0);
      car.rotation.y = Math.PI / 2;
      g.add(car);
    }
    const barrierMesh = box(13, 1.1, 0.5, 0xe2e8f0, 0xff2222);
    barrierMesh.position.set(0, 0.6, 3.4);
    g.add(barrierMesh);
    g.position.set(x, 0, z);
    g.rotation.y = angle;
    scene.add(g);
    world.roadblocks.push(g);
    return g;
  }
  roadblock(0, 150, 0);
  roadblock(-85, -40, Math.PI / 2);
  roadblock(85, 40, Math.PI / 2);

  function spikeStrip(x, z, angle) {
    const g = new THREE.Group();
    const base = box(6, 0.18, 1.4, 0x334155);
    g.add(base);
    for (let i = 0; i < 9; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.7, 4), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.3 }));
      spike.position.set(-2.8 + i * 0.7, 0.4, 0);
      g.add(spike);
    }
    g.position.set(x, 0.1, z);
    g.rotation.y = angle;
    scene.add(g);
    world.spikeStrips.push(g);
    return g;
  }
  spikeStrip(0, 138, 0);
  spikeStrip(-85, -28, Math.PI / 2);

  // --- explosion: fireball + smoke, hidden until triggered ----------------
  const boom = new THREE.Group();
  const fire = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0 }),
  );
  boom.add(fire);
  const smoke = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0 }),
  );
  boom.add(smoke);
  const boomLight = new THREE.PointLight(0xff7a00, 0, 90, 1.6);
  boom.add(boomLight);
  boom.position.set(-150, 2, 320);
  boom.visible = false;
  scene.add(boom);
  world.explosion = { group: boom, fire, smoke, light: boomLight, t: -1 };

  return world;
}

// Trigger the pier set-piece explosion (mission stage 4 / free-roam chaos).
export function triggerExplosion(world, x, z) {
  const e = world.explosion;
  e.group.position.set(x, 2, z);
  e.group.visible = true;
  e.t = 0;
  e.light.intensity = 900;
}

export function updateWorld(world, dt, playerPos, missionTime) {
  world.t += dt;
  const t = world.t;
  // Wind gusts: slow sine + noise, 90–160 km/h.
  world.windGust = 0.55 + 0.45 * Math.sin(t * 0.13) * Math.sin(t * 0.041 + 1.7);
  const wind = 14 + world.windGust * 16;

  // Palms bend with the gusts.
  for (const palm of world.palms) {
    palm.rotation.z = 0.12 + world.windGust * 0.38 * Math.sin(t * 1.7 + palm.userData.phase);
    palm.rotation.x = 0.08 * Math.sin(t * 1.3 + palm.userData.phase);
  }

  // Rain falls slanting with the wind, recycling above the player.
  const pos = world.rain.geometry.attributes.position.array;
  const vel = world.rainVel;
  for (let i = 0; i < vel.length; i++) {
    pos[i * 3 + 1] -= vel[i] * dt;
    pos[i * 3] -= wind * dt * 0.6;
    if (pos[i * 3 + 1] < 0) {
      pos[i * 3 + 1] = 55 + Math.random() * 8;
      pos[i * 3] = playerPos.x + (Math.random() - 0.5) * 300;
      pos[i * 3 + 2] = playerPos.z + (Math.random() - 0.5) * 300;
    }
    if (pos[i * 3] < playerPos.x - 150) pos[i * 3] += 300;
  }
  world.rain.geometry.attributes.position.needsUpdate = true;
  world.rain.position.x = 0;

  // Lightning: random strikes, double-strobe flash.
  world.lightningTimer -= dt;
  if (world.lightningTimer <= 0) {
    world.lightningTimer = 4 + Math.random() * 9;
    world.lightningLight.intensity = 6;
    world.flashT = 0;
    world.flashCount = 2;
  }
  if (world.lightningLight.intensity > 0) {
    world.lightningLight.intensity = Math.max(0, world.lightningLight.intensity - dt * 22);
  }

  // Flood rises slowly as the mission clock runs.
  world.floodLevel = Math.min(1.15, 0.55 + missionTime * 0.006);
  world.flood.position.y = world.floodLevel;
  world.flood.material.opacity = 0.6 + 0.12 * Math.sin(t * 0.8);

  // Helicopter circles the player, searchlight sweeping.
  const heli = world.heli;
  const a = t * 0.22;
  heli.position.set(
    playerPos.x + Math.cos(a) * 34,
    52 + Math.sin(t * 0.5) * 4,
    playerPos.z + Math.sin(a) * 34,
  );
  heli.lookAt(playerPos.x, 0, playerPos.z);
  heli.userData.rotor.rotation.y += dt * 22;
  heli.userData.rotor.rotation.x = 0.06 * Math.sin(t * 3);

  // Explosion animation.
  const e = world.explosion;
  if (e.t >= 0) {
    e.t += dt;
    const k = e.t;
    const fireScale = k < 0.5 ? 2 + k * 14 : Math.max(0.1, 9 - (k - 0.5) * 8);
    e.fire.scale.setScalar(Math.max(0.1, fireScale));
    e.fire.material.opacity = Math.max(0, 0.95 - k * 0.45);
    e.fire.material.color.setHSL(0.07 - Math.min(0.05, k * 0.02), 1, 0.55);
    e.smoke.scale.setScalar(2 + k * 6);
    e.smoke.material.opacity = Math.max(0, 0.5 - k * 0.18);
    e.light.intensity = Math.max(0, 900 - k * 450);
    if (k > 2.6) { e.group.visible = false; e.t = -1; }
  }
}

export { makeCarMesh };
