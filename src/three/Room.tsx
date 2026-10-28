import { useCallback } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { BLOCKS } from '../data/layout';
import type { RoomDef } from '../types/building';
import type { Language } from '../types/navigation';
import { slabGeometry } from './geometry';
import { PLATE_THICKNESS } from './levels';
import type { SceneMaterials } from './palette';
import { useOwnedGeometry } from './useGeometry';
import { setCursor } from './cursor';

export interface RoomPlateProps {
  room: RoomDef;
  materials: SceneMaterials;
  highlighted: boolean;
  onSelect: (roomId: string) => void;
}

/** The walkable floor of one room. Clicking it selects the room on the map. */
export function RoomPlate({ room, materials, highlighted, onSelect }: RoomPlateProps) {
  const block = BLOCKS[room.block];
  const geometry = useOwnedGeometry(() => slabGeometry(block.rect, PLATE_THICKNESS), [block]);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      onSelect(room.id);
    },
    [onSelect, room.id],
  );

  return (
    <mesh
      geometry={geometry}
      material={highlighted ? materials.highlight : materials.floors[room.category]}
      receiveShadow
      userData={{ roomId: room.id }}
      onClick={handleClick}
      onPointerOver={(event) => {
        event.stopPropagation();
        setCursor('pointer');
      }}
      onPointerOut={() => setCursor('default')}
    />
  );
}

export interface RoomLabelProps {
  room: RoomDef;
  language: Language;
  /** World y of the floor top surface. */
  floorY: number;
  /** Key labels (destination, start, selection) stay visible when zoomed out. */
  emphasis: 'key' | 'normal';
  active: boolean;
}

/** HTML label for a room. Non-key labels are hidden by CSS when the camera is zoomed out. */
export function RoomLabel({ room, language, floorY, emphasis, active }: RoomLabelProps) {
  const block = BLOCKS[room.block];
  const cx = (block.rect.x0 + block.rect.x1) / 2;
  const cz = (block.rect.z0 + block.rect.z1) / 2;
  const className = ['room-label', emphasis === 'key' ? 'is-key' : 'is-compact', active ? 'is-active' : ''].filter(Boolean).join(' ');
  return (
    <Html position={[cx, floorY + 0.6, cz]} center zIndexRange={[12, 0]}>
      <div className={className} title={`${room.roomNumber ? `${room.roomNumber} ` : ''}${language === 'hi' ? room.nameHi : room.name}`}>
        {room.roomNumber ? <span className="room-number">{room.roomNumber}</span> : null}
        <span className="room-name">{language === 'hi' ? room.nameHi : room.name}</span>
      </div>
    </Html>
  );
}
