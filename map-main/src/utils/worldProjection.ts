import { geoMercator } from 'd3-geo';
import * as THREE from 'three';

// Mercator centered on China so 1 degree ~ 9 world units
const chinaMercator = geoMercator()
  .center([104.5, 35.0])
  .scale(520)
  .translate([0, 0]);

export function lngLatToWorld(coords: [number, number], y = 0): THREE.Vector3 {
  const projected = chinaMercator(coords);
  if (!projected) return new THREE.Vector3(0, y, 0);
  return new THREE.Vector3(projected[0], y, projected[1]);
}

export function lngLatTo2D(coords: [number, number]): [number, number] {
  const projected = chinaMercator(coords);
  if (!projected) return [0, 0];
  return [projected[0], projected[1]];
}

export function ringToShapePoints(ring: number[][]): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < ring.length; i++) {
    const [x, z] = lngLatTo2D([ring[i][0], ring[i][1]]);
    // Shape sits in XY before rotating -PI/2 around X onto XZ plane:
    // After rotateX(-PI/2): local (x, y, 0) -> world (x, 0, -y)
    // So set shape Y = -z so world Z = +z!
    if (
      pts.length === 0 ||
      Math.hypot(x - pts[pts.length - 1].x, -z - pts[pts.length - 1].y) > 0.08
    ) {
      pts.push(new THREE.Vector2(x, -z));
    }
  }
  return pts;
}
