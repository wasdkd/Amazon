import * as THREE from 'three';

export function buildTrainModel(isOncoming = false): THREE.Group {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.18,
    metalness: 0.22,
    clearcoat: 0.92,
    clearcoatRoughness: 0.1,
  });
  // CR400AF Crimson Red vs CR400BF / Classic Sky Blue accent
  const stripeMat = new THREE.MeshStandardMaterial({
    color: isOncoming ? 0xdc2626 : 0x0284c7,
    roughness: 0.3,
    metalness: 0.45,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.25,
    metalness: 0.7,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b1322,
    roughness: 0.06,
    metalness: 0.72,
    clearcoat: 1.0,
  });
  const windowStripMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0xbae6fd,
    emissiveIntensity: 0.48,
    roughness: 0.15,
    metalness: 0.5,
  });
  const bogieMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.75,
    metalness: 0.4,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.3,
    metalness: 0.85,
  });
  const headLightMat = new THREE.MeshBasicMaterial({ color: 0xf0f9ff });
  const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  // Forward direction is +Z
  // 1. Lead Coach Fuselage (sleek rounded-profile upper + lower)
  const hullGeo = new THREE.BoxGeometry(0.44, 0.34, 1.92);
  const hull = new THREE.Mesh(hullGeo, bodyMat);
  hull.position.set(0, 0.25, -0.32);
  group.add(hull);

  // Curved roof crown on Lead Coach
  const roofCrownGeo = new THREE.CylinderGeometry(0.21, 0.21, 1.9, 12, 1, false, 0, Math.PI);
  roofCrownGeo.rotateZ(Math.PI / 2);
  roofCrownGeo.rotateY(Math.PI / 2);
  roofCrownGeo.scale(1.0, 0.36, 1.0);
  const roofCrown = new THREE.Mesh(roofCrownGeo, bodyMat);
  roofCrown.position.set(0, 0.41, -0.32);
  group.add(roofCrown);

  // 2. Sculpted Bullet Nose Cone (+Z)
  const noseGeo = new THREE.ConeGeometry(0.25, 0.96, 20);
  noseGeo.rotateX(Math.PI / 2);
  noseGeo.scale(0.88, 0.68, 1.0);
  const nose = new THREE.Mesh(noseGeo, bodyMat);
  nose.position.set(0, 0.21, 1.04);
  group.add(nose);

  // Lower Aerodynamic Splitter / Coupler Cowling
  const cowlingGeo = new THREE.BoxGeometry(0.36, 0.08, 0.62);
  const cowling = new THREE.Mesh(cowlingGeo, bogieMat);
  cowling.position.set(0, 0.1, 0.96);
  group.add(cowling);

  // 3. Recessed Cockpit Windshield Mask ("Flying Dragon" black mask)
  const visorGeo = new THREE.BoxGeometry(0.33, 0.14, 0.42);
  const visor = new THREE.Mesh(visorGeo, glassMat);
  visor.position.set(0, 0.32, 0.74);
  visor.rotation.x = 0.38;
  group.add(visor);

  // 4. Livery Accent Stripe + Gold Pinstripe + Continuous Passenger Window Band
  const stripeGeo = new THREE.BoxGeometry(0.455, 0.055, 2.02);
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.set(0, 0.2, -0.28);
  group.add(stripe);

  const winBandGeo = new THREE.BoxGeometry(0.452, 0.095, 1.72);
  const winBand = new THREE.Mesh(winBandGeo, windowStripMat);
  winBand.position.set(0, 0.31, -0.38);
  group.add(winBand);

  const goldBand = new THREE.Mesh(new THREE.BoxGeometry(0.456, 0.016, 1.98), goldTrimMat);
  goldBand.position.set(0, 0.24, -0.28);
  group.add(goldBand);

  // 5. Roof Pantograph Assembly (Z-arm + contact shoe)
  const pantoBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.55), bogieMat);
  pantoBase.position.set(0, 0.47, -0.58);
  group.add(pantoBase);

  const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.38), metalMat);
  lowerArm.position.set(0, 0.56, -0.62);
  lowerArm.rotation.x = -0.52;
  group.add(lowerArm);

  const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, 0.38), metalMat);
  upperArm.position.set(0, 0.69, -0.56);
  upperArm.rotation.x = 0.48;
  group.add(upperArm);

  const collectorBow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.045), metalMat);
  collectorBow.position.set(0, 0.77, -0.44);
  group.add(collectorBow);

  // 6. Bogie Frames & Steel Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.38, 12);
  wheelGeo.rotateZ(Math.PI / 2);

  [-0.85, 0.25, -2.05, -2.95, -4.15, -5.05].forEach((wz) => {
    const axle = new THREE.Mesh(wheelGeo, metalMat);
    axle.position.set(0, 0.06, wz);
    group.add(axle);
  });

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.39, 0.1, 2.15), bogieMat);
  skirt.position.set(0, 0.08, -0.28);
  group.add(skirt);

  // 7. Twin High-Intensity LED Headlights
  [-0.12, 0.12].forEach((xOff) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 10), headLightMat);
    lamp.position.set(xOff, 0.17, 1.18);
    group.add(lamp);
  });

  // 8. Second & Third Articulated Passenger Coaches with Accordion Gangways
  [-2.42, -4.52].forEach((cz, idx) => {
    const gangway = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.24), bogieMat);
    gangway.position.set(0, 0.24, cz + 1.05);
    group.add(gangway);

    const coach = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.34, 1.92), bodyMat);
    coach.position.set(0, 0.25, cz);
    group.add(coach);

    const cRoof = new THREE.Mesh(roofCrownGeo, bodyMat);
    cRoof.position.set(0, 0.41, cz);
    group.add(cRoof);

    const cStripe = new THREE.Mesh(new THREE.BoxGeometry(0.445, 0.055, 1.92), stripeMat);
    cStripe.position.set(0, 0.2, cz);
    group.add(cStripe);

    const cWin = new THREE.Mesh(new THREE.BoxGeometry(0.442, 0.095, 1.76), windowStripMat);
    cWin.position.set(0, 0.31, cz);
    group.add(cWin);

    const cSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 1.92), bogieMat);
    cSkirt.position.set(0, 0.08, cz);
    group.add(cSkirt);

    // Tail markers on final coach
    if (idx === 1) {
      [-0.12, 0.12].forEach((tx) => {
        const tLamp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), tailLightMat);
        tLamp.position.set(tx, 0.19, cz - 0.97);
        group.add(tLamp);
      });
    }
  });

  return group;
}

export function buildAirplaneModel(): THREE.Group {
  const group = new THREE.Group();

  const fuselageMat = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    roughness: 0.18,
    metalness: 0.25,
    clearcoat: 0.92,
    clearcoatRoughness: 0.08,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.32,
    metalness: 0.38,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.32,
    metalness: 0.58,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x4f46e5,
    roughness: 0.28,
    metalness: 0.38,
  });
  const liveryRedMat = new THREE.MeshStandardMaterial({
    color: 0xe11d48,
    roughness: 0.3,
    metalness: 0.3,
  });
  const engineMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.72,
  });
  const metalRimMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.18,
    metalness: 0.9,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b1322,
    roughness: 0.05,
    metalness: 0.75,
    clearcoat: 1,
  });
  const cabinWinMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0xfef3c7,
    emissiveIntensity: 0.55,
  });

  // 1. Cylindrical Fuselage (+Z forward)
  const bodyGeo = new THREE.CylinderGeometry(0.19, 0.18, 2.0, 20);
  bodyGeo.rotateX(Math.PI / 2);
  const body = new THREE.Mesh(bodyGeo, fuselageMat);
  group.add(body);

  // Belly fairing under wing root
  const belly = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.85), bellyMat);
  belly.position.set(0, -0.14, 0.08);
  group.add(belly);

  // 2. Nose Radome (+Z)
  const noseGeo = new THREE.ConeGeometry(0.19, 0.62, 20);
  noseGeo.rotateX(Math.PI / 2);
  const nose = new THREE.Mesh(noseGeo, fuselageMat);
  nose.position.z = 1.3;
  group.add(nose);

  // 3. 4-pane Flight Deck Cockpit Windows
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.095, 0.25), glassMat);
  cockpit.position.set(0, 0.085, 1.07);
  cockpit.rotation.x = 0.22;
  group.add(cockpit);

  // Cabin passenger window strip along left & right fuselage
  [-0.185, 0.185].forEach((wx) => {
    const wStrip = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.032, 1.48), cabinWinMat);
    wStrip.position.set(wx, 0.04, 0.08);
    group.add(wStrip);

    const cheatLine = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.02, 1.85), accentMat);
    cheatLine.position.set(wx, 0.0, 0.0);
    group.add(cheatLine);
  });

  // 4. Tail Cone (-Z)
  const tailConeGeo = new THREE.ConeGeometry(0.18, 0.64, 20);
  tailConeGeo.rotateX(-Math.PI / 2);
  const tailCone = new THREE.Mesh(tailConeGeo, fuselageMat);
  tailCone.position.z = -1.32;
  group.add(tailCone);

  // 5. Swept Main Wings + Upturned Blended Winglets
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0.34);
  wingShape.lineTo(1.62, -0.38);
  wingShape.lineTo(1.62, -0.62);
  wingShape.lineTo(0, -0.24);
  wingShape.lineTo(-1.62, -0.62);
  wingShape.lineTo(-1.62, -0.38);
  wingShape.closePath();

  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.01,
    bevelSize: 0.01,
    bevelSegments: 2,
  });
  wingGeo.rotateX(-Math.PI / 2);
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.set(0, -0.02, 0.15);
  group.add(wings);

  // Blended Winglets + Red/Green Navigation Beacons
  [-1, 1].forEach((dir) => {
    const winglet = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.19, 0.2), accentMat);
    winglet.position.set(dir * 1.62, 0.07, -0.35);
    winglet.rotation.z = -dir * 0.24;
    group.add(winglet);

    const navLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshBasicMaterial({ color: dir < 0 ? 0xef4444 : 0x22c55e })
    );
    navLight.position.set(dir * 1.63, 0.01, -0.33);
    group.add(navLight);
  });

  // 6. Twin Under-Wing High-Bypass Turbofan Nacelles + Silver Lip + Spinner
  [-0.62, 0.62].forEach((xPos) => {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.11, 0.34), wingMat);
    pylon.position.set(xPos, -0.06, 0.16);
    group.add(pylon);

    const podGeo = new THREE.CylinderGeometry(0.1, 0.088, 0.48, 16);
    podGeo.rotateX(Math.PI / 2);
    const pod = new THREE.Mesh(podGeo, engineMat);
    pod.position.set(xPos, -0.13, 0.2);
    group.add(pod);

    const intakeRing = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.015, 8, 16), metalRimMat);
    intakeRing.position.set(xPos, -0.13, 0.44);
    group.add(intakeRing);

    const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 10), metalRimMat);
    spinner.rotateX(Math.PI / 2);
    spinner.position.set(xPos, -0.13, 0.45);
    group.add(spinner);
  });

  // 7. Swept Vertical Tailfin + Livery Stripe
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0);
  finShape.lineTo(-0.42, 0);
  finShape.lineTo(-0.58, 0.58);
  finShape.lineTo(-0.24, 0.58);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, {
    depth: 0.038,
    bevelEnabled: false,
  });
  finGeo.rotateY(Math.PI / 2);
  const fin = new THREE.Mesh(finGeo, accentMat);
  fin.position.set(-0.019, 0.13, -0.92);
  group.add(fin);

  const finStripe = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.1, 0.32), liveryRedMat);
  finStripe.position.set(0, 0.54, -1.32);
  finStripe.rotation.x = 0.2;
  group.add(finStripe);

  // 8. Horizontal Tail Stabilizers
  const hStab = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.03, 0.25), wingMat);
  hStab.position.set(0, 0.06, -1.2);
  group.add(hStab);

  return group;
}

export function buildCarModel(paintHex = 0x10b981): THREE.Group {
  const group = new THREE.Group();

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: paintHex,
    roughness: 0.16,
    metalness: 0.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });
  const cabinMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b1322,
    roughness: 0.05,
    metalness: 0.78,
    clearcoat: 1.0,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.8,
    metalness: 0.2,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.88,
    metalness: 0.12,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.22,
    metalness: 0.88,
  });
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
  const drlMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
  const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  // 1. Lower sculpted chassis (+Z forward)
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.15, 1.02), paintMat);
  chassis.position.set(0, 0.15, 0);
  group.add(chassis);

  // Side rocker sills & lower bumper apron
  const sill = new THREE.Mesh(new THREE.BoxGeometry(0.495, 0.05, 1.04), trimMat);
  sill.position.set(0, 0.085, 0);
  group.add(sill);

  // 2. Aerodynamic sculpted hood (+Z)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.11, 0.36), paintMat);
  hood.position.set(0, 0.17, 0.33);
  hood.rotation.x = 0.14;
  group.add(hood);

  // Front air intake grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.065, 0.025), trimMat);
  grille.position.set(0, 0.13, 0.51);
  group.add(grille);

  // 3. Tapered Cabin Greenhouse + Painted Roof Panel + Sunroof
  const cabinGlass = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.5), cabinMat);
  cabinGlass.position.set(0, 0.27, -0.05);
  group.add(cabinGlass);

  const roofCap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.02, 0.42), paintMat);
  roofCap.position.set(0, 0.35, -0.07);
  group.add(roofCap);

  // Shark-fin roof antenna
  const antenna = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.045, 0.07), trimMat);
  antenna.position.set(0, 0.375, -0.22);
  group.add(antenna);

  // Wing Mirrors
  [-0.25, 0.25].forEach((mx) => {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.035, 0.05), paintMat);
    mirror.position.set(mx, 0.23, 0.14);
    group.add(mirror);
  });

  // 4. Four Wheels + Alloy Rims + Center Hubs
  const wheelGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.075, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.08, 12);
  rimGeo.rotateZ(Math.PI / 2);

  [
    [-0.235, 0.092, 0.3],
    [0.235, 0.092, 0.3],
    [-0.235, 0.092, -0.3],
    [0.235, 0.092, -0.3],
  ].forEach(([wx, wy, wz]) => {
    const tire = new THREE.Mesh(wheelGeo, wheelMat);
    tire.position.set(wx, wy, wz);
    group.add(tire);

    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(wx, wy, wz);
    group.add(rim);
  });

  // 5. Matrix LED Headlights + Daytime Running Light Bar (+Z)
  [-0.17, 0.17].forEach((lx) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.036, 0.03), headlightMat);
    hl.position.set(lx, 0.16, 0.51);
    group.add(hl);

    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.014, 0.032), drlMat);
    drl.position.set(lx, 0.185, 0.51);
    group.add(drl);
  });

  // 6. Full-Width Rear LED Taillight Bar (-Z)
  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.032, 0.025), taillightMat);
  tailBar.position.set(0, 0.19, -0.51);
  group.add(tailBar);

  return group;
}
