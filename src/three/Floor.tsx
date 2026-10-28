import { memo, useEffect, useMemo } from 'react';
import { Edges } from '@react-three/drei';
import { BoxGeometry, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BLOCKS, BUILDING_BOUNDS, CORE, DOOR_WIDTH, EXTERIOR_DOORS, WALL_THICKNESS } from '../data/layout';
import type { Level, RoomDef } from '../types/building';
import type { Language } from '../types/navigation';
import { slabGeometry, wallBoxesForRect, wallBoxesToGeometry } from './geometry';
import { CUTAWAY_WALL_HEIGHT, levelToY, PLATE_THICKNESS, WALL_HEIGHT } from './levels';
import type { SceneMaterials } from './palette';
import { CorridorPlates } from './Corridor';
import { RoomLabel, RoomPlate } from './Room';
import { useOwnedGeometry } from './useGeometry';

export interface FloorProps {
  level: Level;
  language: Language;
  explode: number;
  cutaway: boolean;
  visible: boolean;
  rooms: RoomDef[];
  materials: SceneMaterials;
  destinationId: string | null;
  selectedRoomId: string | null;
  startRoomId: string | null;
  labels: boolean;
  /** Low-detail devices only label key rooms (destination, start, selection, entrances, emergency). */
  keyLabelsOnly: boolean;
  routeActive: boolean;
  ghost?: boolean;
  onRoomSelect: (roomId: string) => void;
}

const SHELL_THICKNESS = 0.4;

function DoorwayFrame({ room, materials }: { room: RoomDef; materials: SceneMaterials }) {
  const rect = BLOCKS[room.block].rect;
  const [x, z] = room.door;
  const horizontalWall = Math.abs(z - rect.z0) < 0.01 || Math.abs(z - rect.z1) < 0.01;
  const half = DOOR_WIDTH / 2 + 0.035;
  const post = 0.075;
  const height = 2.25;
  const depth = 0.13;
  return (
    <group position={[x, 0.02, z]}>
      <mesh position={horizontalWall ? [-half, height / 2, 0] : [0, height / 2, -half]} material={materials.doorFrame}>
        <boxGeometry args={horizontalWall ? [post, height, depth] : [depth, height, post]} />
      </mesh>
      <mesh position={horizontalWall ? [half, height / 2, 0] : [0, height / 2, half]} material={materials.doorFrame}>
        <boxGeometry args={horizontalWall ? [post, height, depth] : [depth, height, post]} />
      </mesh>
      <mesh position={[0, height, 0]} material={materials.doorFrame}>
        <boxGeometry args={horizontalWall ? [DOOR_WIDTH + 0.14, post, depth] : [depth, post, DOOR_WIDTH + 0.14]} />
      </mesh>
    </group>
  );
}

/** Walls for every room on one floor, merged into a single geometry. */
function useInteriorWalls(rooms: RoomDef[], cutaway: boolean) {
  return useOwnedGeometry(() => {
    const boxes = rooms.flatMap((room) => wallBoxesForRect(BLOCKS[room.block].rect, [room.door], WALL_THICKNESS));
    // Service block behind the lift and stair shafts is solid.
    boxes.push(...wallBoxesForRect(CORE.service, [], WALL_THICKNESS));
    return wallBoxesToGeometry(boxes, cutaway ? CUTAWAY_WALL_HEIGHT : WALL_HEIGHT);
  }, [rooms, cutaway]);
}

/** Translucent exterior walls with the main and emergency entrance gaps. */
function useShellGeometry(cutaway: boolean) {
  return useOwnedGeometry(() => {
    const height = cutaway ? CUTAWAY_WALL_HEIGHT : WALL_HEIGHT;
    const boxes = wallBoxesForRect(BUILDING_BOUNDS, EXTERIOR_DOORS, SHELL_THICKNESS, 3);
    return wallBoxesToGeometry(boxes, height);
  }, [cutaway]);
}

/** Open glass volume that outlines the building footprint. */
function useGlassGeometry() {
  return useOwnedGeometry(() => {
    const width = BUILDING_BOUNDS.x1 - BUILDING_BOUNDS.x0;
    const depth = BUILDING_BOUNDS.z1 - BUILDING_BOUNDS.z0;
    const geometry = new BoxGeometry(width, WALL_HEIGHT, depth);
    geometry.translate(0, WALL_HEIGHT / 2, 0);
    return geometry;
  }, []);
}

/** Base plate under the whole footprint, so unused space still reads as floor. */
function useBasePlate() {
  return useOwnedGeometry(() => {
    const wings = [
      { x0: -48, x1: -24, z0: -16, z1: 16 }, { x0: 24, x1: 48, z0: -16, z1: 16 },
      { x0: -24, x1: -6, z0: -16, z1: 16 }, { x0: 6, x1: 24, z0: -16, z1: 16 },
      { x0: -6, x1: 6, z0: -16, z1: -5 }, { x0: -6, x1: 6, z0: 5, z1: 16 },
      { x0: -16, x1: 16, z0: 16, z1: 40 },
    ];
    const parts = wings.map((rect) => {
      const geometry = new BoxGeometry(rect.x1 - rect.x0, PLATE_THICKNESS, rect.z1 - rect.z0);
      geometry.translate((rect.x0 + rect.x1) / 2, -PLATE_THICKNESS / 2 - 0.05, (rect.z0 + rect.z1) / 2);
      return geometry;
    });
    const merged = mergeGeometries(parts, false);
    parts.forEach((part) => part.dispose());
    return merged ?? new BoxGeometry(1, 1, 1);
  }, []);
}

/** Landing inside the stairwell at this level, so the avatar can stand there between flights. */
function useStairLanding() {
  return useOwnedGeometry(() => slabGeometry(CORE.stair, PLATE_THICKNESS), []);
}

/**
 * One storey of the building: floor plates, walls, glass shell and room labels.
 * Positioned at its level's height, so floors line up with the lifts and stairs.
 */
function FloorBase(props: FloorProps) {
  const { level, language, explode, cutaway, visible, rooms, materials, destinationId, selectedRoomId, startRoomId, labels, keyLabelsOnly, routeActive, ghost = false, onRoomSelect } = props;
  const y = levelToY(level, explode);
  const walls = useInteriorWalls(rooms, cutaway);
  const shell = useShellGeometry(cutaway);
  const glass = useGlassGeometry();
  const base = useBasePlate();
  const landing = useStairLanding();
  const serviceSlab = useOwnedGeometry(() => slabGeometry(CORE.service, PLATE_THICKNESS), []);
  const ghostMats = useMemo(() => {
    const clone = (source: MeshStandardMaterial): MeshStandardMaterial => {
      const material = source.clone();
      material.transparent = true;
      material.opacity = 0.05;
      material.wireframe = true;
      material.depthWrite = false;
      return material;
    };
    return {
      floors: Object.fromEntries(Object.entries(materials.floors).map(([key, value]) => [key, clone(value)])) as SceneMaterials['floors'],
      walls: clone(materials.walls), exterior: clone(materials.exterior), shell: clone(materials.shell),
      shaft: clone(materials.shaft), stair: clone(materials.stair), car: clone(materials.car),
      highlight: clone(materials.highlight), doorFrame: clone(materials.doorFrame), skybridge: clone(materials.skybridge), blockedCorridor: clone(materials.blockedCorridor), ground: clone(materials.ground),
      routeGlow: materials.routeGlow,
      dispose() { Object.values(this.floors).forEach((m) => m.dispose()); [this.walls, this.exterior, this.shell, this.shaft, this.stair, this.car, this.highlight, this.doorFrame, this.skybridge, this.blockedCorridor, this.ground].forEach((m) => m.dispose()); },
    } satisfies SceneMaterials;
  }, [materials]);
  const activeMaterials = ghost ? ghostMats : materials;
  useEffect(() => () => ghostMats.dispose(), [ghostMats]);

  const isKey = (room: RoomDef): boolean => room.id === destinationId || room.id === selectedRoomId || room.id === startRoomId;
  const labelRooms = useMemo(
    () => (labels && visible ? rooms.filter((room) => (!routeActive || (room.id !== destinationId && room.id !== startRoomId)) && (!keyLabelsOnly || isKey(room))) : []),
    // isKey closes over the selection ids, which are listed explicitly below.
    [labels, visible, rooms, keyLabelsOnly, routeActive, destinationId, selectedRoomId, startRoomId],
  );

  return (
    <group position={[0, y, 0]} visible={visible}>
      <mesh geometry={base} material={activeMaterials.floors.corridor} receiveShadow />
      <CorridorPlates materials={activeMaterials} />
      <mesh geometry={serviceSlab} material={activeMaterials.floors.circulation} receiveShadow />
      <mesh geometry={landing} material={activeMaterials.stair} receiveShadow />

      {rooms.map((room) => (
        <RoomPlate
          key={room.id}
          room={room}
          materials={activeMaterials}
          highlighted={room.id === destinationId}
          onSelect={onRoomSelect}
        />
      ))}

      {walls ? <mesh geometry={walls} material={activeMaterials.walls} castShadow receiveShadow /> : null}
      {rooms.map((room) => <DoorwayFrame key={`door-${room.id}`} room={room} materials={activeMaterials} />)}
      {shell ? <mesh geometry={shell} material={activeMaterials.exterior} renderOrder={2} castShadow /> : null}
      <mesh geometry={glass} material={activeMaterials.shell} renderOrder={1}>
        <Edges color="#5f93d3" />
      </mesh>

      {!ghost ? labelRooms.map((room) => (
        <RoomLabel key={room.id} room={room} language={language} floorY={0} emphasis={isKey(room) ? 'key' : 'normal'} active={room.id === destinationId} />
      )) : null}
    </group>
  );
}

export const Floor = memo(FloorBase);
