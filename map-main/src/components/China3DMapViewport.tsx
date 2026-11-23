import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { FeatureCollection, Geometry } from 'geojson';
import {
  ArrowLeft,
  ArrowRight,
  Car,
  CloudRain,
  Compass,
  Eye,
  Gauge,
  Globe,
  Pause,
  Plane,
  Play,
  RotateCcw,
  TrainFront,
  Volume2,
  VolumeX,
} from 'lucide-react';
import rawChinaGeoJson from '../data/chinaProvinces.json';
import {
  PROVINCE_BY_ADCODE,
  PROVINCE_NODES,
  formatDurationZh,
} from '../data/chinaGeoData';
import { playVehicleHorn } from '../utils/proceduralAudio';
import {
  buildAirplaneModel,
  buildCarModel,
  buildTrainModel,
} from '../utils/proceduralVehicles';
import { lngLatToWorld, ringToShapePoints } from '../utils/worldProjection';
import { ChinaMinimap } from './ChinaMinimap';
import type {
  JourneyData,
  LiveTelemetrySnapshot,
  LiveUserProvinceStat,
  MyLocationState,
} from '../types/geo';

export type CameraPerspective = 'first_person' | 'chase' | 'overview';

interface ChinaProvinceProperties {
  adcode: number;
  name: string;
}

const chinaFeatures = rawChinaGeoJson as unknown as FeatureCollection<
  Geometry,
  ChinaProvinceProperties
>;

// Pre-allocated math helpers (zero GC inside animation loop)
const _vPos = new THREE.Vector3();
const _vAhead = new THREE.Vector3();
const _vTan = new THREE.Vector3();
const _vSide = new THREE.Vector3();
const _vUp = new THREE.Vector3(0, 1, 0);
const _vCamTargetPos = new THREE.Vector3();
const _vCamTargetLook = new THREE.Vector3();
const _vProj = new THREE.Vector3();
const _vNpcTan = new THREE.Vector3();
const _vNpcSide = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _forwardZ = new THREE.Vector3(0, 0, 1);

interface ProjectedLabel {
  id: string;
  text: string;
  subText?: string;
  x: number;
  y: number;
  isHighlight?: boolean;
}

interface China3DMapViewportProps {
  journey: JourneyData;
  telemetry: LiveTelemetrySnapshot;
  progress: number;
  onProgressChange: (val: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  playbackSpeed: 1 | 2 | 5;
  onChangePlaybackSpeed: (spd: 1 | 2 | 5) => void;
  isBoosted: boolean;
  onToggleBoost: () => void;
  cameraMode: CameraPerspective;
  onChangeCameraMode: (mode: CameraPerspective) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  broadcastSubtitle: string;
  onSpeakNow: () => void;
  userStats: LiveUserProvinceStat[];
  locationState: MyLocationState;
  onSetOrigin: (adcode: number) => void;
  onSetDestination: (adcode: number) => void;
  isDark: boolean;
}

function buildRibbonGeometry(
  curve: THREE.CatmullRomCurve3,
  segments: number,
  halfWidth: number,
  yOffset = 0,
  uvLengthScale = 1
): THREE.BufferGeometry {
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const normals = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices: number[] = [];

  const pt = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const side = new THREE.Vector3();

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPointAt(t, pt);
    curve.getTangentAt(t, tan).normalize();
    side.crossVectors(tan, _vUp).normalize();

    const lx = pt.x - side.x * halfWidth;
    const ly = pt.y + yOffset;
    const lz = pt.z - side.z * halfWidth;

    const rx = pt.x + side.x * halfWidth;
    const ry = pt.y + yOffset;
    const rz = pt.z + side.z * halfWidth;

    const base = i * 6;
    positions[base] = lx;
    positions[base + 1] = ly;
    positions[base + 2] = lz;
    positions[base + 3] = rx;
    positions[base + 4] = ry;
    positions[base + 5] = rz;

    normals[base] = 0;
    normals[base + 1] = 1;
    normals[base + 2] = 0;
    normals[base + 3] = 0;
    normals[base + 4] = 1;
    normals[base + 5] = 0;

    const uvBase = i * 4;
    uvs[uvBase] = 0;
    uvs[uvBase + 1] = t * uvLengthScale;
    uvs[uvBase + 2] = 1;
    uvs[uvBase + 3] = t * uvLengthScale;

    if (i < segments) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function createAsphaltTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1b2434';
    ctx.fillRect(0, 0, 256, 512);

    // Subtle aggregate grain
    for (let i = 0; i < 2400; i++) {
      const gx = Math.random() * 256;
      const gy = Math.random() * 512;
      const shade = 22 + Math.floor(Math.random() * 24);
      ctx.fillStyle = `rgb(${shade}, ${shade + 7}, ${shade + 18})`;
      ctx.fillRect(gx, gy, 2, 2);
    }

    // Solid white shoulder lines
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(14, 0, 6, 512);
    ctx.fillRect(236, 0, 6, 512);

    // Dashed lane divider markings
    ctx.fillStyle = '#f8fafc';
    for (let y = 16; y < 512; y += 96) {
      ctx.fillRect(92, y, 6, 48);
      ctx.fillRect(158, y, 6, 48);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function buildStationCanopy(accentHex = 0x38bdf8): THREE.Group {
  const group = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.35,
    metalness: 0.4,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.85,
  });

  // Left & Right Platform Slabs
  [-0.95, 0.95].forEach((px) => {
    const plat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 3.8), concreteMat);
    plat.position.set(px, 0.12, 0);
    group.add(plat);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 3.8), canopyMat);
    roof.position.set(px, 0.92, 0);
    group.add(roof);

    [-1.4, 0, 1.4].forEach((pz) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), concreteMat);
      col.position.set(px, 0.52, pz);
      group.add(col);
    });

    const lightStrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 3.6), glowMat);
    lightStrip.position.set(px > 0 ? px - 0.26 : px + 0.26, 0.88, 0);
    group.add(lightStrip);
  });

  // Overhead station portal beam
  const arch = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 0.22), glowMat);
  arch.position.set(0, 1.18, 0);
  group.add(arch);

  return group;
}

function buildAirportRunway(): THREE.Group {
  const group = new THREE.Group();
  const tarmacMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88 });
  const markMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.5 });

  const strip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 5.2), tarmacMat);
  strip.position.y = 0.03;
  group.add(strip);

  // Threshold zebra markings
  [-2.2, 2.2].forEach((zPos) => {
    [-0.5, -0.25, 0, 0.25, 0.5].forEach((xPos) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.02, 0.45), markMat);
      bar.position.set(xPos, 0.06, zPos);
      group.add(bar);
    });
  });

  // Center dashed line + edge lights
  for (let z = -1.6; z <= 1.6; z += 0.65) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.02, 0.32), markMat);
    dash.position.set(0, 0.06, z);
    group.add(dash);

    [-0.76, 0.76].forEach((ex) => {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), beaconMat);
      light.position.set(ex, 0.07, z);
      group.add(light);
    });
  }

  // Control Tower beside runway
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.25, 10), towerMat);
  tower.position.set(1.25, 0.62, -0.5);
  group.add(tower);
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.25, 10), beaconMat);
  cab.position.set(1.25, 1.32, -0.5);
  group.add(cab);

  return group;
}

export function China3DMapViewport({
  journey,
  telemetry,
  progress,
  onProgressChange,
  isPlaying,
  onTogglePlay,
  onRestart,
  playbackSpeed,
  onChangePlaybackSpeed,
  isBoosted,
  onToggleBoost,
  cameraMode,
  onChangeCameraMode,
  voiceEnabled,
  onToggleVoice,
  broadcastSubtitle,
  onSpeakNow,
  userStats,
  locationState,
  onSetOrigin,
  onSetDestination,
  isDark,
}: China3DMapViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [webglError, setWebglError] = useState(false);
  const [labels, setLabels] = useState<ProjectedLabel[]>([]);
  const [selectedProvinceAdcode, setSelectedProvinceAdcode] = useState<number | null>(null);
  const [laneIndex, setLaneIndex] = useState<-1 | 0 | 1>(0);

  // Refs synced to animation loop
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const cameraModeRef = useRef(cameraMode);
  cameraModeRef.current = cameraMode;
  const journeyRef = useRef(journey);
  journeyRef.current = journey;
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;
  const userStatsRef = useRef(userStats);
  userStatsRef.current = userStats;
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;
  const laneTargetRef = useRef(0);
  laneTargetRef.current = laneIndex * 0.44;
  const boostRef = useRef(false);
  boostRef.current = isBoosted;

  const lookOffsetRef = useRef({ yaw: 0, pitch: 0, dragging: false, lastX: 0, lastY: 0 });

  const sceneObjectsRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    provinceMeshes: Map<number, THREE.Mesh>;
    towerGroup: THREE.Group;
    towerMeshes: Map<number, THREE.Mesh>;
    routeGroup: THREE.Group;
    vehicleGroup: THREE.Group;
    curve: THREE.CatmullRomCurve3 | null;
    npcCars: Array<{ mesh: THREE.Group; baseT: number; lane: number; speed: number; oncoming?: boolean }>;
    oncomingTrain: { mesh: THREE.Group; baseT: number; speed: number } | null;
    routeTextures: THREE.Texture[];
    weatherPoints: THREE.Points | null;
    myPinMesh: THREE.Group;
    skyPlaneMat: THREE.MeshStandardMaterial | null;
    groundGrid: THREE.GridHelper | null;
    fog: THREE.FogExp2;
    ambientHemi: THREE.HemisphereLight;
    maxAnisotropy: number;
  } | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'SELECT' || (e.target as HTMLElement)?.tagName === 'INPUT') {
        return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setLaneIndex((l) => (l > -1 ? ((l - 1) as -1 | 0 | 1) : l));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setLaneIndex((l) => (l < 1 ? ((l + 1) as -1 | 0 | 1) : l));
      } else if (e.key === 'h' || e.key === 'H') {
        playVehicleHorn(journeyRef.current.mode);
      } else if (e.key === ' ') {
        e.preventDefault();
        onTogglePlay();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onTogglePlay]);

  // Initialize WebGL Scene ONCE
  useEffect(() => {
    const mount = mountRef.current;
    const container = containerRef.current;
    if (!mount || !container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError(true);
      return;
    }

    const rect = container.getBoundingClientRect();
    const width = Math.max(300, rect.width);
    const height = Math.max(300, rect.height);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      setWebglError(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    const scene = new THREE.Scene();
    const bgHex = isDarkRef.current ? 0x091121 : 0xd8e8f8;
    scene.background = new THREE.Color(bgHex);
    const fog = new THREE.FogExp2(bgHex, 0.004);
    scene.fog = fog;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.15, 1600);
    camera.position.set(0, 120, 160);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.minDistance = 24;
    controls.maxDistance = 480;
    controls.enabled = cameraModeRef.current === 'overview';

    const ambientHemi = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.95);
    scene.add(ambientHemi);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.55);
    sunLight.position.set(140, 220, 110);
    if (!isSoftwareGl) {
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(1024, 1024);
      sunLight.shadow.camera.left = -180;
      sunLight.shadow.camera.right = 180;
      sunLight.shadow.camera.top = 180;
      sunLight.shadow.camera.bottom = -180;
      sunLight.shadow.bias = -0.0005;
    }
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-120, 80, -140);
    scene.add(rimLight);

    const oceanGeo = new THREE.PlaneGeometry(2400, 2400);
    oceanGeo.rotateX(-Math.PI / 2);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: isDarkRef.current ? 0x060b16 : 0xc5daf0,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.position.y = -0.05;
    ocean.receiveShadow = true;
    scene.add(ocean);

    const groundGrid = new THREE.GridHelper(900, 60, 0x1e3a5f, 0x0f1f38);
    groundGrid.position.y = 0.01;
    scene.add(groundGrid);

    // 34 Extruded Chinese Provinces
    const chinaMapGroup = new THREE.Group();
    const provinceMeshes = new Map<number, THREE.Mesh>();
    const extrudeSettings = {
      depth: 0.85,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.08,
      bevelSegments: 1,
    };

    chinaFeatures.features.forEach((feature) => {
      const adcode = feature.properties.adcode;
      const polys =
        feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.type === 'MultiPolygon'
          ? feature.geometry.coordinates
          : [];

      const shapes: THREE.Shape[] = [];
      polys.forEach((poly) => {
        if (!poly.length) return;
        const outerPts = ringToShapePoints(poly[0]);
        if (outerPts.length < 3) return;
        const shape = new THREE.Shape(outerPts);
        for (let h = 1; h < poly.length; h++) {
          const holePts = ringToShapePoints(poly[h]);
          if (holePts.length >= 3) shape.holes.push(new THREE.Path(holePts));
        }
        shapes.push(shape);
      });

      if (shapes.length === 0) return;

      const geo = new THREE.ExtrudeGeometry(shapes, extrudeSettings);
      geo.rotateX(-Math.PI / 2);

      const mat = new THREE.MeshStandardMaterial({
        color: isDarkRef.current ? 0x162544 : 0xe2e8f0,
        roughness: 0.68,
        metalness: 0.14,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData = { adcode };
      mesh.receiveShadow = true;
      mesh.layers.enable(1);
      chinaMapGroup.add(mesh);
      provinceMeshes.set(adcode, mesh);

      const edges = new THREE.EdgesGeometry(geo, 22);
      const borderMat = new THREE.LineBasicMaterial({
        color: isDarkRef.current ? 0x38bdf8 : 0x64748b,
        transparent: true,
        opacity: isDarkRef.current ? 0.35 : 0.45,
      });
      const borderLines = new THREE.LineSegments(edges, borderMat);
      borderLines.position.y = 0.02;
      chinaMapGroup.add(borderLines);
    });
    scene.add(chinaMapGroup);

    // 34 User Distribution Towers
    const towerGroup = new THREE.Group();
    const towerMeshes = new Map<number, THREE.Mesh>();
    const towerGeo = new THREE.CylinderGeometry(0.32, 0.48, 1, 6);
    towerGeo.translate(0, 0.5, 0);

    PROVINCE_NODES.forEach((node) => {
      const pos = lngLatToWorld(node.coords, 0.92);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.45,
        roughness: 0.3,
        metalness: 0.5,
      });
      const tower = new THREE.Mesh(towerGeo, mat);
      tower.position.copy(pos);
      towerGroup.add(tower);
      towerMeshes.set(node.adcode, tower);
    });
    scene.add(towerGroup);

    const routeGroup = new THREE.Group();
    scene.add(routeGroup);

    const vehicleGroup = new THREE.Group();
    scene.add(vehicleGroup);

    const myPinMesh = new THREE.Group();
    const pinCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.4, 12),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.6 })
    );
    pinCone.rotation.x = Math.PI;
    pinCone.position.y = 1.6;
    const pinRing = new THREE.Mesh(
      new THREE.RingGeometry(0.6, 0.95, 24),
      new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide })
    );
    pinRing.rotation.x = -Math.PI / 2;
    pinRing.position.y = 1.0;
    myPinMesh.add(pinCone, pinRing);
    myPinMesh.visible = false;
    scene.add(myPinMesh);

    const particleCount = 420;
    const pArr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pArr[i * 3] = (Math.random() - 0.5) * 18;
      pArr[i * 3 + 1] = Math.random() * 10;
      pArr[i * 3 + 2] = (Math.random() - 0.5) * 26;
    }
    const weatherGeo = new THREE.BufferGeometry();
    weatherGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
    const weatherMat = new THREE.PointsMaterial({
      color: 0xbae6fd,
      size: 0.14,
      transparent: true,
      opacity: 0.75,
    });
    const weatherPoints = new THREE.Points(weatherGeo, weatherMat);
    weatherPoints.visible = false;
    scene.add(weatherPoints);

    sceneObjectsRef.current = {
      scene,
      camera,
      renderer,
      controls,
      provinceMeshes,
      towerGroup,
      towerMeshes,
      routeGroup,
      vehicleGroup,
      curve: null,
      npcCars: [],
      oncomingTrain: null,
      routeTextures: [],
      weatherPoints,
      myPinMesh,
      skyPlaneMat: oceanMat,
      groundGrid,
      fog,
      ambientHemi,
      maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
    };

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointerNdc = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
      if (cameraModeRef.current === 'first_person') {
        lookOffsetRef.current.dragging = true;
        lookOffsetRef.current.lastX = e.clientX;
        lookOffsetRef.current.lastY = e.clientY;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (cameraModeRef.current === 'first_person' && lookOffsetRef.current.dragging) {
        const dx = e.clientX - lookOffsetRef.current.lastX;
        const dy = e.clientY - lookOffsetRef.current.lastY;
        lookOffsetRef.current.lastX = e.clientX;
        lookOffsetRef.current.lastY = e.clientY;
        lookOffsetRef.current.yaw = THREE.MathUtils.clamp(
          lookOffsetRef.current.yaw - dx * 0.004,
          -0.95,
          0.95
        );
        lookOffsetRef.current.pitch = THREE.MathUtils.clamp(
          lookOffsetRef.current.pitch - dy * 0.003,
          -0.45,
          0.45
        );
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      lookOffsetRef.current.dragging = false;
      if (cameraModeRef.current === 'overview') {
        const moveDist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
        if (moveDist < 5) {
          const r = renderer.domElement.getBoundingClientRect();
          pointerNdc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
          pointerNdc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
          raycaster.setFromCamera(pointerNdc, camera);
          const hits = raycaster.intersectObjects(Array.from(provinceMeshes.values()), false);
          if (hits.length > 0) {
            const adcode = hits[0].object.userData.adcode as number | undefined;
            if (adcode) setSelectedProvinceAdcode(adcode);
          } else {
            setSelectedProvinceAdcode(null);
          }
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        camera.aspect = r.width / r.height;
        camera.updateProjectionMatrix();
        renderer.setSize(r.width, r.height);
      }
    });
    ro.observe(container);

    const clock = new THREE.Clock();
    let currentLaneOffset = 0;
    let camInitialized = false;
    let labelThrottle = 0;
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(0.08, clock.getDelta());
      const elapsed = clock.getElapsedTime();
      const refs = sceneObjectsRef.current;
      if (!refs) return;

      const j = journeyRef.current;
      const liveTel = telemetryRef.current;
      const t = Math.max(0.001, Math.min(0.998, progressRef.current));
      const mode = j.mode;
      const camMode = cameraModeRef.current;

      const targetLane = mode === 'car' ? laneTargetRef.current : 0;
      currentLaneOffset = THREE.MathUtils.damp(currentLaneOffset, targetLane, 8, dt);

      if (!lookOffsetRef.current.dragging) {
        lookOffsetRef.current.yaw = THREE.MathUtils.damp(lookOffsetRef.current.yaw, 0, 5, dt);
        lookOffsetRef.current.pitch = THREE.MathUtils.damp(lookOffsetRef.current.pitch, 0, 5, dt);
      }

      const targetFov = camMode === 'first_person' ? (boostRef.current ? 72 : 62) : 52;
      if (Math.abs(camera.fov - targetFov) > 0.1) {
        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 6, dt);
        camera.updateProjectionMatrix();
      }

      if (refs.curve) {
        refs.curve.getPointAt(t, _vPos);
        refs.curve.getTangentAt(t, _vTan).normalize();
        _vSide.crossVectors(_vTan, _vUp).normalize();

        if (mode === 'car') {
          _vPos.addScaledVector(_vSide, currentLaneOffset);
        }

        refs.vehicleGroup.visible = camMode !== 'first_person';
        refs.vehicleGroup.position.copy(_vPos);
        _quat.setFromUnitVectors(_forwardZ, _vTan);
        refs.vehicleGroup.quaternion.copy(_quat);

        // Animate oncoming HSR bullet train passing on parallel track!
        if (refs.oncomingTrain) {
          const ot = 1 - ((refs.oncomingTrain.baseT + elapsed * refs.oncomingTrain.speed) % 0.96);
          const clampedOt = Math.max(0.02, Math.min(0.98, ot));
          refs.curve.getPointAt(clampedOt, _vAhead);
          refs.curve.getTangentAt(clampedOt, _vNpcTan).normalize();
          _vNpcSide.crossVectors(_vNpcTan, _vUp).normalize();
          _vAhead.addScaledVector(_vNpcSide, -0.78);
          _vNpcTan.negate();
          refs.oncomingTrain.mesh.position.copy(_vAhead);
          refs.oncomingTrain.mesh.quaternion.setFromUnitVectors(_forwardZ, _vNpcTan);
        }

        // Animate NPC cars (same-direction & oncoming lanes)
        refs.npcCars.forEach((npc) => {
          const rawT = (npc.baseT + elapsed * npc.speed) % 0.96;
          const nt = npc.oncoming ? Math.max(0.02, Math.min(0.98, 1 - rawT)) : rawT;
          if (refs.curve) {
            refs.curve.getPointAt(nt, _vAhead);
            refs.curve.getTangentAt(nt, _vNpcTan).normalize();
            _vNpcSide.crossVectors(_vNpcTan, _vUp).normalize();
            _vAhead.addScaledVector(_vNpcSide, npc.lane);
            if (npc.oncoming) {
              _vNpcTan.negate();
            }
            npc.mesh.position.copy(_vAhead);
            npc.mesh.quaternion.setFromUnitVectors(_forwardZ, _vNpcTan);
          }
        });

        // Camera Choreography
        if (camMode === 'first_person') {
          controls.enabled = false;
          const eyeHeight = mode === 'hsr' ? 0.62 : mode === 'car' ? 0.42 : 0.35;
          const lookDist = mode === 'flight' ? 18 : 11;
          const aheadT = Math.min(0.999, t + (mode === 'flight' ? 0.08 : 0.05));
          refs.curve.getPointAt(aheadT, _vAhead);
          if (mode === 'car') {
            _vAhead.addScaledVector(_vSide, currentLaneOffset * 0.4);
          }

          _vCamTargetPos.copy(_vPos).addScaledVector(_vUp, eyeHeight);
          if (mode !== 'flight' && !liveTel.isDwellingAtStop) {
            _vCamTargetPos.y += Math.sin(elapsed * 14) * 0.007;
          }

          const yaw = lookOffsetRef.current.yaw;
          const pitch = lookOffsetRef.current.pitch;
          _vCamTargetLook
            .copy(_vCamTargetPos)
            .addScaledVector(_vTan, lookDist)
            .addScaledVector(_vSide, Math.sin(yaw) * lookDist)
            .addScaledVector(_vUp, Math.sin(pitch) * lookDist - (mode === 'flight' ? 1.4 : 0.35));

          if (!camInitialized) {
            camera.position.copy(_vCamTargetPos);
            camera.lookAt(_vCamTargetLook);
            camInitialized = true;
          } else {
            const dampRate = 12;
            camera.position.x = THREE.MathUtils.damp(camera.position.x, _vCamTargetPos.x, dampRate, dt);
            camera.position.y = THREE.MathUtils.damp(camera.position.y, _vCamTargetPos.y, dampRate, dt);
            camera.position.z = THREE.MathUtils.damp(camera.position.z, _vCamTargetPos.z, dampRate, dt);
            camera.lookAt(_vCamTargetLook);
          }
        } else if (camMode === 'chase') {
          controls.enabled = false;
          const chaseBack = mode === 'flight' ? 6.5 : 4.8;
          const chaseUp = mode === 'flight' ? 2.8 : 2.3;
          _vCamTargetPos
            .copy(_vPos)
            .addScaledVector(_vTan, -chaseBack)
            .addScaledVector(_vUp, chaseUp);
          _vCamTargetLook.copy(_vPos).addScaledVector(_vTan, 5.5).addScaledVector(_vUp, 0.4);

          camera.position.x = THREE.MathUtils.damp(camera.position.x, _vCamTargetPos.x, 7, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _vCamTargetPos.y, 7, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _vCamTargetPos.z, 7, dt);
          camera.lookAt(_vCamTargetLook);
        } else {
          controls.enabled = true;
          controls.update();
        }

        if (refs.weatherPoints) {
          const icon = liveTel.activeWeather.icon;
          const showWeather = icon === 'rain' || icon === 'storm' || icon === 'snow';
          refs.weatherPoints.visible = showWeather && camMode !== 'overview';
          if (refs.weatherPoints.visible) {
            refs.weatherPoints.position.copy(_vPos).addScaledVector(_vTan, 7);
            const attr = refs.weatherPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
            const fallSpeed = icon === 'snow' ? 2.5 : 14;
            for (let i = 0; i < attr.count; i++) {
              let py = attr.getY(i) - fallSpeed * dt;
              if (py < 0) py = 10;
              attr.setY(i, py);
            }
            attr.needsUpdate = true;
          }
        }
      }

      // Station-by-station HTML projected labels!
      labelThrottle += dt;
      if (labelThrottle >= 0.05) {
        labelThrottle = 0;
        const rSize = renderer.domElement.getBoundingClientRect();
        const nextLabels: ProjectedLabel[] = [];
        const statsMap = new Map(userStatsRef.current.map((s) => [s.adcode, s]));

        if (camMode === 'overview') {
          const candidates = PROVINCE_NODES.filter(
            (p) =>
              p.adcode === j.origin.adcode ||
              p.adcode === j.destination.adcode ||
              (statsMap.get(p.adcode)?.activeUsers ?? 0) > 21000
          );

          candidates.forEach((p) => {
            const stat = statsMap.get(p.adcode);
            const towerHeight = stat ? 1.5 + (stat.activeUsers / 47000) * 11 : 2.5;
            _vProj.copy(lngLatToWorld(p.coords, 0.95 + towerHeight));
            _vProj.project(camera);
            if (_vProj.z > 1 || _vProj.z < -1) return;
            const sx = ((_vProj.x + 1) / 2) * rSize.width;
            const sy = ((-_vProj.y + 1) / 2) * rSize.height;
            if (sx < 14 || sx > rSize.width - 14 || sy < 44 || sy > rSize.height - 96) return;
            const isEndpoint = p.adcode === j.origin.adcode || p.adcode === j.destination.adcode;
            nextLabels.push({
              id: `p-${p.adcode}`,
              text: `${p.shortName} · ${p.hubCity}`,
              subText: stat ? `${(stat.activeUsers / 1000).toFixed(1)}k` : undefined,
              x: sx,
              y: sy,
              isHighlight: isEndpoint,
            });
          });
        } else {
          // In first_person or chase: show ONLY the upcoming nextWaypoint (never jump straight to final destination early!)
          const nextWp = liveTel.nextWaypoint;
          const nextY = mode === 'flight' ? 11 : 2.45;
          _vProj.copy(lngLatToWorld(nextWp.coords, nextY));
          _vProj.project(camera);
          if (_vProj.z >= -1 && _vProj.z <= 1) {
            const sx = ((_vProj.x + 1) / 2) * rSize.width;
            const sy = ((-_vProj.y + 1) / 2) * rSize.height;
            if (sx >= 24 && sx <= rSize.width - 24 && sy >= 56 && sy <= rSize.height - 115) {
              nextLabels.push({
                id: `next-${nextWp.name}`,
                text: liveTel.isDwellingAtStop
                  ? `停靠站 · ${liveTel.dwellingStopName}`
                  : `下一站 · ${nextWp.name}`,
                subText: liveTel.isDwellingAtStop
                  ? '上下客中'
                  : `距 ${liveTel.nextWaypointRemainingKm} km`,
                x: sx,
                y: sy,
                isHighlight: true,
              });
            }
          }
        }

        setLabels(nextLabels);
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      sceneObjectsRef.current?.routeTextures.forEach((tex) => tex.dispose());
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Theme Sync
  useEffect(() => {
    const refs = sceneObjectsRef.current;
    if (!refs) return;
    const bgHex = isDark ? 0x091121 : 0xd8e8f8;
    refs.scene.background = new THREE.Color(bgHex);
    refs.fog.color.setHex(bgHex);
    if (refs.skyPlaneMat) {
      refs.skyPlaneMat.color.setHex(isDark ? 0x060b16 : 0xc5daf0);
    }
    refs.ambientHemi.groundColor.setHex(isDark ? 0x1e293b : 0x94a3b8);
  }, [isDark]);

  // Overview Camera Reset
  useEffect(() => {
    const refs = sceneObjectsRef.current;
    if (!refs) return;
    if (cameraMode === 'overview') {
      refs.camera.position.set(15, 195, 195);
      refs.controls.target.set(10, 0, 18);
      refs.controls.update();
    }
  }, [cameraMode]);

  // Choropleth Shading & Distribution Towers
  useEffect(() => {
    const refs = sceneObjectsRef.current;
    if (!refs) return;
    const maxUsers = Math.max(...userStats.map((s) => s.activeUsers), 1);

    userStats.forEach((stat) => {
      const provMesh = refs.provinceMeshes.get(stat.adcode);
      const isOrigin = stat.adcode === journey.origin.adcode;
      const isDest = stat.adcode === journey.destination.adcode;
      const ratio = Math.sqrt(stat.activeUsers / maxUsers);

      if (provMesh) {
        const mat = provMesh.material as THREE.MeshStandardMaterial;
        if (isOrigin) {
          mat.color.setHex(0x0369a1);
        } else if (isDest) {
          mat.color.setHex(0x047857);
        } else if (isDark) {
          mat.color.setRGB(0.08 + ratio * 0.08, 0.14 + ratio * 0.18, 0.28 + ratio * 0.26);
        } else {
          mat.color.setRGB(0.84 - ratio * 0.22, 0.90 - ratio * 0.12, 0.96);
        }
      }

      const tower = refs.towerMeshes.get(stat.adcode);
      if (tower) {
        const targetH = 1.2 + ratio * 11.5;
        tower.scale.set(1, targetH, 1);
        const tMat = tower.material as THREE.MeshStandardMaterial;
        if (isOrigin) {
          tMat.color.setHex(0x38bdf8);
          tMat.emissive.setHex(0x0284c7);
        } else if (isDest) {
          tMat.color.setHex(0x34d399);
          tMat.emissive.setHex(0x059669);
        } else {
          tMat.color.setHex(0x38bdf8);
          tMat.emissive.setHex(0x0369a1);
        }
      }
    });
  }, [userStats, journey.origin.adcode, journey.destination.adcode, isDark]);

  // User Browser GPS Pin
  useEffect(() => {
    const refs = sceneObjectsRef.current;
    if (!refs) return;
    if (locationState.status === 'located' && locationState.coords && locationState.inChinaBounds) {
      refs.myPinMesh.position.copy(lngLatToWorld(locationState.coords, 0.2));
      refs.myPinMesh.visible = true;
    } else {
      refs.myPinMesh.visible = false;
    }
  }, [locationState]);

  // Rebuild Route Scenery & Vehicle Models
  useEffect(() => {
    const refs = sceneObjectsRef.current;
    if (!refs) return;

    while (refs.routeGroup.children.length > 0) {
      const child = refs.routeGroup.children.pop()!;
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const m = (obj as THREE.Mesh).material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else if (m) m.dispose();
      });
    }
    while (refs.vehicleGroup.children.length > 0) {
      const child = refs.vehicleGroup.children.pop()!;
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) (obj as THREE.Mesh).geometry.dispose();
        const m = (obj as THREE.Mesh).material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else if (m) m.dispose();
      });
    }
    refs.routeTextures.forEach((tex) => tex.dispose());
    refs.routeTextures = [];
    refs.npcCars = [];
    refs.oncomingTrain = null;

    const points3D = journey.pathCoords.map((coord, idx) => {
      const t = idx / Math.max(1, journey.pathCoords.length - 1);
      let y = 0.98;
      if (journey.mode === 'flight') {
        y = 1.15 + Math.sin(t * Math.PI) * 15.5;
      }
      return lngLatToWorld(coord, y);
    });

    const curve = new THREE.CatmullRomCurve3(points3D);
    refs.curve = curve;

    if (journey.mode === 'hsr') {
      // Twin-Track Concrete Viaduct Deck
      const deckGeo = buildRibbonGeometry(curve, 180, 0.72, 0.02);
      const deckMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        roughness: 0.85,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });
      refs.routeGroup.add(new THREE.Mesh(deckGeo, deckMat));

      // Viaduct Concrete Support Piers descending to ground
      const pierCount = 46;
      const pierGeo = new THREE.BoxGeometry(0.45, 0.9, 0.35);
      const pierMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
      const piers = new THREE.InstancedMesh(pierGeo, pierMat, pierCount);
      for (let i = 0; i < pierCount; i++) {
        const t = (i + 0.2) / pierCount;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        _quat.setFromUnitVectors(_forwardZ, tan);
        _mat4.compose(p.clone().add(new THREE.Vector3(0, -0.42, 0)), _quat, new THREE.Vector3(1, 1, 1));
        piers.setMatrixAt(i, _mat4);
      }
      piers.instanceMatrix.needsUpdate = true;
      piers.frustumCulled = false;
      refs.routeGroup.add(piers);

      // Twin Steel Rails (active + parallel oncoming track)
      const railMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.65,
        roughness: 0.25,
        metalness: 0.85,
      });
      [-0.18, 0.18, -0.96, -0.60].forEach((offset) => {
        const railPts: THREE.Vector3[] = [];
        for (let i = 0; i <= 160; i++) {
          const t = i / 160;
          const p = curve.getPointAt(t);
          const tan = curve.getTangentAt(t).normalize();
          const side = new THREE.Vector3().crossVectors(tan, _vUp).normalize();
          railPts.push(p.clone().addScaledVector(side, offset).add(new THREE.Vector3(0, 0.06, 0)));
        }
        const railCurve = new THREE.CatmullRomCurve3(railPts);
        refs.routeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(railCurve, 160, 0.032, 6, false), railMat));
      });

      // Overhead Catenary Longitudinal Contact Wire
      const wirePts: THREE.Vector3[] = [];
      for (let i = 0; i <= 140; i++) {
        const p = curve.getPointAt(i / 140);
        wirePts.push(p.clone().add(new THREE.Vector3(0, 0.96, 0)));
      }
      const wireCurve = new THREE.CatmullRomCurve3(wirePts);
      const wireMat = new THREE.MeshStandardMaterial({
        color: 0xbae6fd,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.35,
      });
      refs.routeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(wireCurve, 140, 0.014, 5, false), wireMat));

      // Instanced Railway Sleepers
      const sleeperCount = 220;
      const sleeperGeo = new THREE.BoxGeometry(0.56, 0.03, 0.12);
      const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
      const sleepers = new THREE.InstancedMesh(sleeperGeo, sleeperMat, sleeperCount);
      for (let i = 0; i < sleeperCount; i++) {
        const t = i / sleeperCount;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        _quat.setFromUnitVectors(_forwardZ, tan);
        _mat4.compose(p.clone().add(new THREE.Vector3(0, 0.035, 0)), _quat, new THREE.Vector3(1, 1, 1));
        sleepers.setMatrixAt(i, _mat4);
      }
      sleepers.instanceMatrix.needsUpdate = true;
      sleepers.frustumCulled = false;
      refs.routeGroup.add(sleepers);

      // Overhead Catenary Gantry Portals
      const gantryCount = 36;
      const gantryGeo = new THREE.BoxGeometry(1.45, 0.06, 0.06);
      const gantryMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.35 });
      const gantries = new THREE.InstancedMesh(gantryGeo, gantryMat, gantryCount);
      const poleGeo = new THREE.BoxGeometry(0.06, 1.05, 0.06);
      const poles = new THREE.InstancedMesh(poleGeo, gantryMat, gantryCount * 2);

      for (let i = 0; i < gantryCount; i++) {
        const t = (i + 0.5) / gantryCount;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        const side = new THREE.Vector3().crossVectors(tan, _vUp).normalize();
        _quat.setFromUnitVectors(_forwardZ, tan);

        _mat4.compose(p.clone().add(new THREE.Vector3(0, 1.05, 0)), _quat, new THREE.Vector3(1, 1, 1));
        gantries.setMatrixAt(i, _mat4);

        [-0.7, 0.7].forEach((sx, sIdx) => {
          const polePos = p.clone().addScaledVector(side, sx).add(new THREE.Vector3(0, 0.52, 0));
          _mat4.compose(polePos, _quat, new THREE.Vector3(1, 1, 1));
          poles.setMatrixAt(i * 2 + sIdx, _mat4);
        });
      }
      gantries.instanceMatrix.needsUpdate = true;
      poles.instanceMatrix.needsUpdate = true;
      gantries.frustumCulled = false;
      poles.frustumCulled = false;
      refs.routeGroup.add(gantries, poles);

      // 3D Station Platforms & Canopies at every stop!
      journey.waypoints.forEach((wp) => {
        if (!wp.isStop) return;
        const clampedT = Math.max(0.02, Math.min(0.98, wp.progress));
        const sp = curve.getPointAt(clampedT);
        const tan = curve.getTangentAt(clampedT).normalize();
        const canopy = buildStationCanopy(wp.kind === 'destination' ? 0x10b981 : 0x38bdf8);
        canopy.position.copy(sp);
        canopy.quaternion.setFromUnitVectors(_forwardZ, tan);
        refs.routeGroup.add(canopy);
      });

      // Roadside Stylized Karst Mountains
      const hillCount = 36;
      const hillGeo = new THREE.ConeGeometry(1.1, 2.6, 7);
      const hillMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.85, flatShading: true });
      const hills = new THREE.InstancedMesh(hillGeo, hillMat, hillCount);
      for (let i = 0; i < hillCount; i++) {
        const t = (i + 0.3) / hillCount;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        const side = new THREE.Vector3().crossVectors(tan, _vUp).normalize();
        const offsetSign = i % 2 === 0 ? 1 : -1;
        const dist = 2.6 + ((i * 17) % 5) * 0.7;
        const hPos = p.clone().addScaledVector(side, offsetSign * dist);
        hPos.y += 1.1;
        const scale = 0.65 + ((i * 13) % 7) * 0.16;
        _mat4.compose(hPos, new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
        hills.setMatrixAt(i, _mat4);
      }
      hills.instanceMatrix.needsUpdate = true;
      hills.frustumCulled = false;
      refs.routeGroup.add(hills);

      // Animated Oncoming CR400AF Bullet Train on parallel track!
      const oncomingMesh = buildTrainModel(true);
      refs.routeGroup.add(oncomingMesh);
      refs.oncomingTrain = { mesh: oncomingMesh, baseT: 0.28, speed: 0.045 };

      refs.vehicleGroup.add(buildTrainModel(false));
    } else if (journey.mode === 'flight') {
      const skyTubeGeo = new THREE.TubeGeometry(curve, 120, 0.12, 8, false);
      const skyTubeMat = new THREE.MeshStandardMaterial({
        color: 0x818cf8,
        emissive: 0x6366f1,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.78,
      });
      refs.routeGroup.add(new THREE.Mesh(skyTubeGeo, skyTubeMat));

      const shadowPts = journey.pathCoords.map((c) => lngLatToWorld(c, 0.98));
      const shadowGeo = new THREE.BufferGeometry().setFromPoints(shadowPts);
      const shadowMat = new THREE.LineDashedMaterial({
        color: 0x94a3b8,
        dashSize: 0.8,
        gapSize: 0.5,
      });
      const shadowLine = new THREE.Line(shadowGeo, shadowMat);
      shadowLine.computeLineDistances();
      refs.routeGroup.add(shadowLine);

      // 3D Airport Runways at Origin & Destination
      [0.01, 0.99].forEach((rt) => {
        const rp = lngLatToWorld(
          rt < 0.5 ? journey.origin.coords : journey.destination.coords,
          0.98
        );
        const tan = curve.getTangentAt(rt).setY(0).normalize();
        const runway = buildAirportRunway();
        runway.position.copy(rp);
        runway.quaternion.setFromUnitVectors(_forwardZ, tan);
        refs.routeGroup.add(runway);
      });

      const hoopGeo = new THREE.TorusGeometry(1.15, 0.055, 10, 28);
      const hoopMat = new THREE.MeshStandardMaterial({
        color: 0xa5b4fc,
        emissive: 0x6366f1,
        emissiveIntensity: 0.9,
      });
      for (let i = 1; i <= 8; i++) {
        const t = i / 9;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        const hoop = new THREE.Mesh(hoopGeo, hoopMat);
        hoop.position.copy(p);
        hoop.quaternion.setFromUnitVectors(_forwardZ, tan);
        refs.routeGroup.add(hoop);
      }

      const cloudCount = 84;
      const cloudGeo = new THREE.IcosahedronGeometry(1.25, 1);
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.95,
        transparent: true,
        opacity: 0.82,
      });
      const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, cloudCount);
      for (let i = 0; i < cloudCount; i++) {
        const t = (i + 0.5) / cloudCount;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        const side = new THREE.Vector3().crossVectors(tan, _vUp).normalize();
        const sideSpread = (i % 2 === 0 ? 1 : -1) * (2.2 + (i % 5) * 2.0);
        const cPos = p.clone().addScaledVector(side, sideSpread);
        cPos.y = Math.max(4.5, cPos.y + ((i % 3) - 1) * 1.7);
        _mat4.compose(
          cPos,
          new THREE.Quaternion(),
          new THREE.Vector3(1.7 + (i % 3) * 0.55, 0.58, 1.4 + (i % 2) * 0.45)
        );
        clouds.setMatrixAt(i, _mat4);
      }
      clouds.instanceMatrix.needsUpdate = true;
      clouds.frustumCulled = false;
      refs.routeGroup.add(clouds);

      refs.vehicleGroup.add(buildAirplaneModel());
    } else {
      // Procedural Textured 3-Lane Asphalt Expressway
      const asphaltTex = createAsphaltTexture(refs.maxAnisotropy);
      refs.routeTextures.push(asphaltTex);
      const roadGeo = buildRibbonGeometry(curve, 220, 0.92, 0.02, 48);
      const roadMat = new THREE.MeshStandardMaterial({
        map: asphaltTex,
        roughness: 0.82,
        metalness: 0.08,
        side: THREE.DoubleSide,
      });
      refs.routeGroup.add(new THREE.Mesh(roadGeo, roadMat));

      // Real-Time Congestion Curb Strips & Steel Guardrails
      journey.segments.forEach((seg) => {
        const segPts: THREE.Vector3[] = [];
        for (let i = 0; i <= 32; i++) {
          const t = Math.min(0.999, seg.startProgress + (seg.endProgress - seg.startProgress) * (i / 32));
          segPts.push(curve.getPointAt(t));
        }
        const segColor =
          seg.trafficLevel === 'congested'
            ? 0xef4444
            : seg.trafficLevel === 'moderate'
            ? 0xf59e0b
            : 0x10b981;
        const curbMat = new THREE.MeshStandardMaterial({
          color: segColor,
          emissive: segColor,
          emissiveIntensity: 0.8,
        });
        [-0.94, 0.94].forEach((edgeOffset) => {
          const edgePts = segPts.map((pt, idx) => {
            const st = Math.min(0.999, seg.startProgress + (seg.endProgress - seg.startProgress) * (idx / 32));
            const tan = curve.getTangentAt(st).normalize();
            const side = new THREE.Vector3().crossVectors(tan, _vUp).normalize();
            return pt.clone().addScaledVector(side, edgeOffset).add(new THREE.Vector3(0, 0.09, 0));
          });
          const edgeCurve = new THREE.CatmullRomCurve3(edgePts);
          refs.routeGroup.add(new THREE.Mesh(new THREE.TubeGeometry(edgeCurve, 28, 0.036, 6, false), curbMat));
        });
      });

      // 3D Service Area Canopies at intermediate highway stops
      journey.waypoints.forEach((wp) => {
        if (wp.kind !== 'service_area') return;
        const clampedT = Math.max(0.05, Math.min(0.95, wp.progress));
        const sp = curve.getPointAt(clampedT);
        const tan = curve.getTangentAt(clampedT).normalize();
        const side = new THREE.Vector3().crossVectors(tan, _vUp).normalize();
        const canopy = buildStationCanopy(0x10b981);
        canopy.scale.set(0.75, 0.78, 0.72);
        canopy.position.copy(sp).addScaledVector(side, 1.55);
        canopy.quaternion.setFromUnitVectors(_forwardZ, tan);
        refs.routeGroup.add(canopy);
      });

      // Overhead Highway Gantry Arches
      const archCount = 14;
      const archGeo = new THREE.BoxGeometry(2.05, 0.14, 0.08);
      const archMat = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.4 });
      const arches = new THREE.InstancedMesh(archGeo, archMat, archCount);
      for (let i = 0; i < archCount; i++) {
        const t = (i + 0.5) / archCount;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        _quat.setFromUnitVectors(_forwardZ, tan);
        _mat4.compose(p.clone().add(new THREE.Vector3(0, 1.05, 0)), _quat, new THREE.Vector3(1, 1, 1));
        arches.setMatrixAt(i, _mat4);
      }
      arches.instanceMatrix.needsUpdate = true;
      arches.frustumCulled = false;
      refs.routeGroup.add(arches);

      // Roadside Trees
      const treeCount = 80;
      const treeGeo = new THREE.ConeGeometry(0.28, 0.85, 6);
      const treeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
      const trees = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
      for (let i = 0; i < treeCount; i++) {
        const t = (i + 0.2) / treeCount;
        const p = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        const side = new THREE.Vector3().crossVectors(tan, _vUp).normalize();
        const tp = p.clone().addScaledVector(side, (i % 2 === 0 ? 1 : -1) * (1.45 + (i % 3) * 0.4));
        tp.y += 0.42;
        _mat4.compose(tp, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
        trees.setMatrixAt(i, _mat4);
      }
      trees.instanceMatrix.needsUpdate = true;
      trees.frustumCulled = false;
      refs.routeGroup.add(trees);

      // NPC Highway Vehicles (Same-direction + Oncoming opposite carriageway!)
      const carPalette = [0x38bdf8, 0xe2e8f0, 0xf59e0b, 0x94a3b8, 0xec4899, 0x6366f1];
      const npcList: Array<{ mesh: THREE.Group; baseT: number; lane: number; speed: number; oncoming?: boolean }> = [];
      for (let i = 0; i < 6; i++) {
        const npcMesh = buildCarModel(carPalette[i % carPalette.length]);
        npcMesh.scale.setScalar(0.88);
        refs.routeGroup.add(npcMesh);
        npcList.push({
          mesh: npcMesh,
          baseT: 0.08 + i * 0.14,
          lane: (i % 3 === 0 ? -1 : i % 3 === 1 ? 1 : 0) * 0.44,
          speed: 0.015 + (i % 3) * 0.004,
        });
      }
      for (let i = 0; i < 4; i++) {
        const oncMesh = buildCarModel(carPalette[(i + 2) % carPalette.length]);
        oncMesh.scale.setScalar(0.88);
        refs.routeGroup.add(oncMesh);
        npcList.push({
          mesh: oncMesh,
          baseT: 0.12 + i * 0.22,
          lane: -1.35,
          speed: 0.022 + (i % 2) * 0.005,
          oncoming: true,
        });
      }
      refs.npcCars = npcList;

      refs.vehicleGroup.add(buildCarModel(0x10b981));
    }
  }, [journey]);

  const selectedProvince = selectedProvinceAdcode
    ? PROVINCE_BY_ADCODE.get(selectedProvinceAdcode)
    : null;

  const isRaining =
    telemetry.activeWeather.icon === 'rain' || telemetry.activeWeather.icon === 'storm';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[430px] sm:min-h-[480px] overflow-hidden select-none bg-[#091121]"
    >
      {/* Isolated WebGL Mount Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* WebGL Fallback */}
      {webglError && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/95 p-6 text-center">
          <div className="max-w-md space-y-3">
            <h3 className="text-base font-semibold text-white">3D 引擎初始化受限</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              当前环境暂不支持 WebGL2 硬件加速，您仍可通过左上角中国实时态势图与面板查看全部实时分布、逐站进度与语音播报。
            </p>
          </div>
        </div>
      )}

      {/* Projected 3D Labels (Station-by-station in FP/Chase, Hub stats in Overview) */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {labels.map((lbl) => (
          <div
            key={lbl.id}
            className="absolute -translate-x-1/2 -translate-y-full"
            style={{ left: lbl.x, top: lbl.y }}
          >
            <div
              className={`px-2 py-0.5 rounded border text-[11px] whitespace-nowrap shadow ${
                lbl.isHighlight
                  ? 'bg-slate-950/92 border-sky-500/75 text-white font-semibold'
                  : 'bg-slate-950/82 border-slate-700/75 text-slate-200'
              }`}
            >
              <span>{lbl.text}</span>
              {lbl.subText && (
                <span className="ml-1.5 font-mono text-sky-400 tabular-nums">{lbl.subText}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* First-Person Cockpit / Windshield Immersion (Unobstructed Center) */}
      {cameraMode === 'first_person' && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Subtle HSR Cab A-pillar Corners */}
          {journey.mode === 'hsr' && (
            <>
              <div className="hidden sm:block absolute bottom-0 left-0 w-24 h-44 bg-gradient-to-tr from-slate-950/85 via-slate-950/20 to-transparent" />
              <div className="hidden sm:block absolute bottom-0 right-0 w-24 h-44 bg-gradient-to-tl from-slate-950/85 via-slate-950/20 to-transparent" />
            </>
          )}

          {/* Flight Aviation Pitch Reticle */}
          {journey.mode === 'flight' && (
            <div className="absolute inset-0 flex items-center justify-center opacity-55">
              <svg width="220" height="130" viewBox="0 0 240 140" className="text-sky-300">
                <line x1="20" y1="70" x2="88" y2="70" stroke="currentColor" strokeWidth="1.2" />
                <line x1="152" y1="70" x2="220" y2="70" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="120" cy="70" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
                <line x1="75" y1="42" x2="105" y2="42" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="135" y1="42" x2="165" y2="42" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="75" y1="98" x2="105" y2="98" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="135" y1="98" x2="165" y2="98" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              </svg>
            </div>
          )}

          {/* Car Steering Wheel Silhouette + Animated Rain Wipers */}
          {journey.mode === 'car' && (
            <div className="absolute bottom-[106px] sm:bottom-[104px] left-1/2 -translate-x-1/2 opacity-40">
              <svg width="240" height="58" viewBox="0 0 260 58" className="text-slate-300 overflow-visible">
                <path
                  d="M25,58 A105,105 0 0,1 235,58"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <line x1="65" y1="48" x2="195" y2="48" stroke="currentColor" strokeWidth="4" />
                {isRaining && (
                  <g>
                    <line
                      x1="60"
                      y1="56"
                      x2="130"
                      y2="-14"
                      stroke="#94a3b8"
                      strokeWidth="3"
                      strokeLinecap="round"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        values="-38 60 56; 32 60 56; -38 60 56"
                        dur="1.3s"
                        repeatCount="indefinite"
                      />
                    </line>
                    <line
                      x1="190"
                      y1="56"
                      x2="250"
                      y2="-14"
                      stroke="#94a3b8"
                      strokeWidth="3"
                      strokeLinecap="round"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        values="-38 190 56; 32 190 56; -38 190 56"
                        dur="1.3s"
                        repeatCount="indefinite"
                      />
                    </line>
                  </g>
                )}
              </svg>
            </div>
          )}

          {/* Desktop Top-Center Station-by-Station Telemetry Strip (hidden on narrow mobile to avoid overlap) */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 hidden xl:flex items-center gap-3.5 px-4 py-1.5 rounded-lg border border-slate-700/80 bg-slate-950/90 text-xs text-slate-200 shadow-lg whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 font-semibold text-white">
              {journey.mode === 'hsr' && <TrainFront className="w-3.5 h-3.5 text-sky-400" />}
              {journey.mode === 'flight' && <Plane className="w-3.5 h-3.5 text-indigo-400" />}
              {journey.mode === 'car' && <Car className="w-3.5 h-3.5 text-emerald-400" />}
              <span>
                {telemetry.isDwellingAtStop
                  ? `停靠 ${telemetry.dwellingStopName}`
                  : `下一站 ${telemetry.nextWaypoint.name}`}
              </span>
            </span>
            <span className="text-slate-600">|</span>
            <span className="font-mono tabular-nums text-amber-400 font-semibold">
              {telemetry.isDwellingAtStop
                ? '站台上下客'
                : `距 ${telemetry.nextWaypointRemainingKm} km · ${telemetry.nextWaypointClockText}`}
            </span>
            <span className="text-slate-600">|</span>
            <span className="font-mono tabular-nums text-sky-400 font-semibold">
              {isBoosted && !telemetry.isDwellingAtStop
                ? telemetry.currentSpeedKmh + 42
                : telemetry.currentSpeedKmh}{' '}
              km/h
            </span>
          </div>
        </div>
      )}

      {/* Top-Left Always-Visible Responsive China Minimap Radar */}
      <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 z-20">
        <ChinaMinimap
          journey={journey}
          telemetry={telemetry}
          userStats={userStats}
          isOverview={cameraMode === 'overview'}
          onToggleOverview={() =>
            onChangeCameraMode(cameraMode === 'overview' ? 'first_person' : 'overview')
          }
        />
      </div>

      {/* Top-Right Camera Switcher + Voice Broadcast + Fun Actions */}
      <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-20 flex flex-col items-end gap-1.5 sm:gap-2 max-w-[calc(100%-156px)] sm:max-w-none">
        <div className="inline-flex items-center gap-0.5 sm:gap-1 p-1 rounded-lg border border-slate-700/80 bg-slate-950/90 shadow-lg">
          <button
            type="button"
            onClick={() => onChangeCameraMode('first_person')}
            className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer ${
              cameraMode === 'first_person'
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>第一视角</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeCameraMode('chase')}
            className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer ${
              cameraMode === 'chase'
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">3D 追尾</span>
            <span className="xs:hidden sm:hidden">追尾</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeCameraMode('overview')}
            className={`min-h-[34px] px-2 sm:px-2.5 py-1 rounded-md text-[11px] sm:text-xs font-medium inline-flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer ${
              cameraMode === 'overview'
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="hidden xs:inline sm:inline">中国全图</span>
            <span className="xs:hidden sm:hidden">全图</span>
          </button>
        </div>

        {/* Fun Interactive Controls & Spoken Voice Toggle */}
        <div className="flex flex-wrap justify-end gap-1 sm:gap-1.5">
          {journey.mode === 'car' && cameraMode !== 'overview' && (
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-slate-700/80 bg-slate-950/90">
              <button
                type="button"
                onClick={() => setLaneIndex((l) => (l > -1 ? ((l - 1) as -1 | 0 | 1) : l))}
                disabled={laneIndex === -1}
                title="向左变道 (A / ←)"
                className="min-h-[34px] px-2 py-1 rounded text-[11px] sm:text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-35 inline-flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>左道</span>
              </button>
              <button
                type="button"
                onClick={() => setLaneIndex((l) => (l < 1 ? ((l + 1) as -1 | 0 | 1) : l))}
                disabled={laneIndex === 1}
                title="向右变道 (D / →)"
                className="min-h-[34px] px-2 py-1 rounded text-[11px] sm:text-xs text-slate-200 hover:bg-slate-800 disabled:opacity-35 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>右道</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onToggleVoice}
            title={voiceEnabled ? '点击静音语音播报' : '点击开启实时中文语音播报'}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              voiceEnabled
                ? 'border-sky-500/70 bg-sky-500/20 text-sky-200'
                : 'border-slate-700/80 bg-slate-950/90 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5 text-sky-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{voiceEnabled ? '语音播报开' : '开启语音'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleBoost}
            className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              isBoosted
                ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                : 'border-slate-700/80 bg-slate-950/90 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isBoosted ? '极速巡航中' : '超速体验'}</span>
            <span className="sm:hidden">{isBoosted ? '极速' : '加速'}</span>
          </button>

          <button
            type="button"
            onClick={() => playVehicleHorn(journey.mode)}
            title="按 H 键或点击鸣笛"
            className="min-h-[34px] px-2 sm:px-2.5 py-1 rounded-lg border border-slate-700/80 bg-slate-950/90 text-slate-200 hover:bg-slate-800 text-[11px] sm:text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{journey.mode === 'flight' ? '提示音' : '鸣笛'}</span>
          </button>
        </div>

        {isRaining && cameraMode !== 'overview' && (
          <div className="px-2.5 py-1 rounded-md border border-sky-500/40 bg-slate-950/90 text-[11px] text-sky-300 inline-flex items-center gap-1.5">
            <CloudRain className="w-3.5 h-3.5" />
            <span>前方雨区 · {telemetry.activeWeather.condition}</span>
          </div>
        )}
      </div>

      {/* Overview Mode Province Click Selector Popover */}
      {selectedProvince && cameraMode === 'overview' && (
        <div className="absolute top-36 sm:top-48 left-2.5 sm:left-3 z-30 w-56 sm:w-60 rounded-lg border border-slate-700 bg-slate-950/95 p-3 shadow-xl text-xs">
          <div className="font-semibold text-white">{selectedProvince.name}</div>
          <div className="mt-0.5 text-slate-400">
            枢纽 {selectedProvince.hubCity} · {selectedProvince.weather.condition} {selectedProvince.weather.tempC}°C
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={selectedProvince.adcode === journey.destination.adcode}
              onClick={() => {
                onSetOrigin(selectedProvince.adcode);
                setSelectedProvinceAdcode(null);
              }}
              className="min-h-[36px] py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white font-medium cursor-pointer"
            >
              设为起点
            </button>
            <button
              type="button"
              disabled={selectedProvince.adcode === journey.origin.adcode}
              onClick={() => {
                onSetDestination(selectedProvince.adcode);
                setSelectedProvinceAdcode(null);
              }}
              className="min-h-[36px] py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium cursor-pointer"
            >
              设为终点
            </button>
          </div>
        </div>
      )}

      {/* Bottom Unified Playback Dock + Live Broadcast Subtitle Banner */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 sm:bottom-3 sm:left-3 sm:right-3 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
        {/* Live Voice Broadcast Subtitle Ticker */}
        {broadcastSubtitle && (
          <button
            type="button"
            onClick={onSpeakNow}
            title="点击重播语音播报"
            className="pointer-events-auto max-w-2xl w-full sm:w-auto px-3 py-1.5 rounded-lg border border-sky-500/40 bg-slate-950/92 text-xs text-slate-100 shadow-lg flex items-center gap-2 text-left cursor-pointer hover:border-sky-400/70 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate flex-1">{broadcastSubtitle}</span>
            <span className="text-[10px] text-sky-400 shrink-0 whitespace-nowrap">重播</span>
          </button>
        )}

        <div className="pointer-events-auto w-full max-w-2xl rounded-lg border border-slate-700/80 bg-slate-950/92 px-3 py-2 sm:px-3.5 sm:py-2.5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={onTogglePlay}
                className="min-h-[36px] sm:h-8 px-2.5 sm:px-3 inline-flex items-center gap-1.5 rounded-md bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium cursor-pointer whitespace-nowrap"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? '暂停' : '继续'}</span>
              </button>

              <button
                type="button"
                onClick={onRestart}
                title="回到起点"
                className="min-h-[36px] w-9 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-slate-900 border border-slate-800">
                {([1, 2, 5] as const).map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => onChangePlaybackSpeed(spd)}
                    className={`min-h-[30px] px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer ${
                      playbackSpeed === spd
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Station-by-Station Next Stop Readout */}
            <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-300 tabular-nums ml-auto">
              <span className="text-slate-400 hidden md:inline">
                {telemetry.isDwellingAtStop
                  ? `正停靠 ${telemetry.dwellingStopName}`
                  : `下站 ${telemetry.nextWaypoint.shortLabel}`}
              </span>
              <span className="font-semibold text-sky-400">
                {telemetry.isDwellingAtStop
                  ? '停靠上下客'
                  : `下站 ${telemetry.nextWaypointClockText} (${telemetry.nextWaypointRemainingKm}km)`}
              </span>
            </div>
          </div>

          <div className="mt-1.5 sm:mt-2 flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap max-w-[76px] truncate">
              {telemetry.prevWaypoint.shortLabel}
            </span>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(progress * 1000)}
              onChange={(e) => onProgressChange(Number(e.target.value) / 1000)}
              aria-label="行程进度"
              className="w-full h-2 sm:h-1.5 accent-sky-500 cursor-pointer"
            />
            <span className="text-[11px] font-medium text-sky-400 whitespace-nowrap max-w-[76px] truncate">
              {telemetry.nextWaypoint.shortLabel}
            </span>
            <span className="text-[11px] font-mono tabular-nums text-slate-200 w-9 text-right shrink-0">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
