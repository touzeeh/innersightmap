/**
 * Colours and shared materials. Materials are created once per scene and reused
 * by every floor, room and connector, then disposed when the scene unmounts.
 */
import { Color, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { RoomCategory } from '../types/building';

export const COLORS = {
  navy: '#0b1f3a',
  cobalt: '#1d4ed8',
  cyan: '#06b6d4',
  amber: '#f59e0b',
  red: '#dc2626',
  background: '#f8fafc',
} as const;

/** Floor tint per room category. Colour is never the only signal: labels and icons carry meaning too. */
export const CATEGORY_TINT: Record<RoomCategory | 'corridor' | 'circulation', string> = {
  entrance: '#bfdbfe',
  reception: '#c7d2fe',
  emergency: '#fca5a5',
  clinical: '#a5c7ff',
  lab: '#67e8f9',
  imaging: '#a5b4fc',
  pharmacy: '#86efac',
  ward: '#7dd3fc',
  waiting: '#fde68a',
  washroom: '#93c5fd',
  staff: '#cbd5e1',
  restricted: '#c4b5fd',
  corridor: '#F8FAFC',
  circulation: '#a5b4fc',
};

export interface SceneMaterials {
  floors: Record<keyof typeof CATEGORY_TINT, MeshStandardMaterial>;
  walls: MeshStandardMaterial;
  exterior: MeshStandardMaterial;
  shell: MeshStandardMaterial;
  shaft: MeshStandardMaterial;
  shaftActive: MeshStandardMaterial;
  stair: MeshStandardMaterial;
  car: MeshStandardMaterial;
  highlight: MeshStandardMaterial;
  routeGlow: MeshBasicMaterial;
  doorFrame: MeshStandardMaterial;
  skybridge: MeshStandardMaterial;
  blockedCorridor: MeshStandardMaterial;
  ground: MeshStandardMaterial;
  dispose: () => void;
}

export function createSceneMaterials(): SceneMaterials {
  const floors = {} as Record<keyof typeof CATEGORY_TINT, MeshStandardMaterial>;
  for (const [key, tint] of Object.entries(CATEGORY_TINT) as [keyof typeof CATEGORY_TINT, string][]) {
    const isCorridor = key === 'corridor';
    floors[key] = new MeshStandardMaterial({ color: new Color(tint), emissive: new Color(tint), emissiveIntensity: isCorridor ? 0 : 0.08, roughness: 0.9, metalness: 0, transparent: !isCorridor, opacity: isCorridor ? 1 : 0.92 });
  }
  const walls = new MeshStandardMaterial({ color: '#f8fafc', emissive: '#dbeafe', emissiveIntensity: 0.12, roughness: 0.7, transparent: true, opacity: 0.32, depthWrite: false });
  const exterior = new MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.3, transparent: true, opacity: 0.06, depthWrite: false });
  const shell = new MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.2,
    metalness: 0,
    transparent: true,
    opacity: 0.06,
    depthWrite: false,
  });
  const shaft = new MeshStandardMaterial({ color: '#0d9488', emissive: '#0d9488', emissiveIntensity: 0.12, roughness: 0.35, transparent: true, opacity: 0.13, depthWrite: false });
  const shaftActive = new MeshStandardMaterial({ color: '#5eead4', emissive: '#0d9488', emissiveIntensity: 0.5, roughness: 0.25, transparent: true, opacity: 0.48, depthWrite: false, toneMapped: false });
  const stair = new MeshStandardMaterial({ color: '#6366f1', roughness: 0.6 });
  // The car is see-through so the passenger stays visible while riding.
  const car = new MeshStandardMaterial({ color: '#38bdf8', emissive: '#0e7490', emissiveIntensity: 0.72, roughness: 0.24, metalness: 0.12, transparent: true, opacity: 0.34, depthWrite: false, toneMapped: false });
  const highlight = new MeshStandardMaterial({
    color: new Color('#a5f3fc'),
    emissive: new Color(COLORS.cyan),
    emissiveIntensity: 0.55,
    roughness: 0.6,
  });
  const routeGlow = new MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.35, depthWrite: false });
  const doorFrame = new MeshStandardMaterial({ color: '#67e8f9', emissive: '#0891b2', emissiveIntensity: 0.38, metalness: 0.12, roughness: 0.3 });
  const skybridge = new MeshStandardMaterial({ color: '#bae6fd', emissive: '#0e7490', emissiveIntensity: 0.26, transparent: true, opacity: 0.45, roughness: 0.22, metalness: 0.08, depthWrite: false });
  const blockedCorridor = new MeshStandardMaterial({ color: '#ef4444', emissive: '#dc2626', emissiveIntensity: 0.85, roughness: 0.34, metalness: 0.08, transparent: true, opacity: 0.9 });
  const ground = new MeshStandardMaterial({ color: '#f4f7fb', emissive: new Color('#dfe7f2'), emissiveIntensity: 0.45, roughness: 1 });

  const all: { dispose(): void }[] = [...Object.values(floors), walls, exterior, shell, shaft, shaftActive, stair, car, highlight, routeGlow, doorFrame, skybridge, blockedCorridor, ground];
  return {
    floors,
    walls,
    exterior,
    shell,
    shaft,
    shaftActive,
    stair,
    car,
    highlight,
    routeGlow,
    doorFrame,
    skybridge,
    blockedCorridor,
    ground,
    dispose: () => all.forEach((m) => m.dispose()),
  };
}
