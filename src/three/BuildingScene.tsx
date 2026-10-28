import { memo, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Edges, OrbitControls } from '@react-three/drei';
import { NoToneMapping, Vector3 } from 'three';
import { ROOMS } from '../data/rooms';
import { LEVELS } from '../data/floors';
import { getNavigationGraph } from '../data/navigationGraph';
import { destinationLabel as labelFor, startLabel } from '../services/destinationSearch';
import { DESTINATIONS } from '../data/destinations';
import type { CameraMode, Instruction, Language, NavStatus } from '../types/navigation';
import type { Level, RoomDef } from '../types/building';
import type { Timeline } from '../services/routeTimeline';
import { Avatar, type AvatarProgress, type Spawn } from './Avatar';
import { CameraRig } from './CameraRig';
import { Connectors } from './Connectors';
import { Floor } from './Floor';
import { Html } from '@react-three/drei';
import { levelToY } from './levels';
import { createSceneMaterials, type SceneMaterials } from './palette';
import { RouteOverlay } from './RouteOverlay';
import { createSceneBus, type SceneBus } from './sceneBus';

export interface BuildingSceneProps {
  language: Language;
  floorVisible: readonly boolean[];
  /** Whole level the avatar is on, used to isolate floors in top-down and follow views. */
  navLevel: number;
  explode: number;
  cutaway: boolean;
  lowDetail: boolean;
  darkMode: boolean;
  autoRotate: boolean;
  cameraMode: CameraMode;
  cameraNonce: number;
  focusLevel: Level | null;
  startId: string;
  destinationId: string | null;
  selectedRoomId: string | null;
  blockedCorridor: string | null;
  timeline: Timeline | null;
  instructions: readonly Instruction[];
  navStatus: NavStatus;
  speed: number;
  reducedMotion: boolean;
  onRoomSelect: (roomId: string) => void;
  onProgress: (progress: AvatarProgress) => void;
  onArrive: () => void;
  onContextLost: () => void;
}

const ROOMS_BY_LEVEL: Record<Level, RoomDef[]> = {
  0: ROOMS.filter((r) => r.level === 0),
  1: ROOMS.filter((r) => r.level === 1),
  2: ROOMS.filter((r) => r.level === 2),
  3: ROOMS.filter((r) => r.level === 3),
};

/** World position of a navigation node, for the avatar spawn and map markers. */
function worldOfNode(nodeId: string, explode: number): { x: number; y: number; z: number; level: number } | null {
  const node = getNavigationGraph().nodes.get(nodeId);
  if (!node) return null;
  return { x: node.x, y: levelToY(node.level, explode), z: node.z, level: node.level };
}

interface SceneContentsProps extends Omit<BuildingSceneProps, 'onContextLost' | 'onRoomSelect' | 'onProgress' | 'onArrive'> {
  materials: SceneMaterials;
  bus: SceneBus;
  onRoomSelect: (roomId: string) => void;
  onProgress: (progress: AvatarProgress) => void;
  onArrive: () => void;
}

/** Everything inside the canvas. Kept separate so the canvas's own setup stays small. */
function SceneContents(props: SceneContentsProps) {
  const { language, floorVisible, navLevel, explode, cutaway, lowDetail, darkMode, autoRotate, cameraMode, cameraNonce, focusLevel, startId, destinationId, selectedRoomId, blockedCorridor, timeline, instructions, navStatus, speed, reducedMotion, materials, bus, onRoomSelect, onProgress, onArrive } = props;

  // While guiding, top-down shows only the avatar's floor and follow hides the floors above it,
  // so the upper building never blocks the view of the route. Otherwise the user's floor choices apply.
  const guiding = navStatus === 'navigating' || navStatus === 'paused';
  const routeHighestLevel = timeline?.segments.reduce((highest, segment) => Math.max(highest, segment.from.level, segment.to.level), 0) ?? null;
  const routeExplode = timeline && cameraMode !== 'firstperson' ? Math.max(explode, 0.25) : explode;
  const showGuide = navStatus === 'navigating' || navStatus === 'paused' || navStatus === 'arrived';
  const visibleFloors = useMemo(() => {
    if (cameraMode === 'firstperson') return LEVELS.map((level) => level === navLevel);
    if (timeline && !showGuide) return LEVELS.map(() => true);
    if (!guiding) return floorVisible;
    if (cameraMode === 'topdown') return LEVELS.map((level) => level === navLevel);
    if (cameraMode === 'follow') return LEVELS.map((level) => level <= navLevel);
    return floorVisible;
  }, [guiding, cameraMode, navLevel, floorVisible, timeline, routeHighestLevel, showGuide]);

  const spawnNode = worldOfNode(startId, routeExplode);
  const spawn: Spawn = useMemo(() => ({ x: spawnNode?.x ?? 0, z: spawnNode?.z ?? 0, level: spawnNode?.level ?? 0 }), [spawnNode?.x, spawnNode?.z, spawnNode?.level]);
  const destNode = destinationId ? worldOfNode(destinationId, routeExplode) : null;
  const destinationVector = useMemo(
    () => (destNode ? new Vector3(destNode.x, destNode.y, destNode.z) : null),
    // Only the node position matters; `destNode` is recreated each render.
    [destNode?.x, destNode?.y, destNode?.z],
  );
  const startRoomId = ROOMS.some((r) => r.id === startId) ? startId : null;
  const pulse = useRef(0);

  useFrame((state) => {
    pulse.current = state.clock.elapsedTime;
    materials.highlight.emissiveIntensity = 0.4 + 0.22 * Math.sin(pulse.current * 3);
  });

  const destDisplay = destinationId ? DESTINATIONS.find((d) => d.id === destinationId) : undefined;
  const destNodeForRoute = destNode ? { x: destNode.x, level: destNode.level, z: destNode.z } : null;
  const startNode = worldOfNode(startId, routeExplode);

  useEffect(() => {
    materials.ground.color.set(darkMode ? '#111827' : '#f4f7fb');
    materials.ground.emissive.set(darkMode ? '#090d16' : '#dfe7f2');
    materials.ground.emissiveIntensity = darkMode ? 0.18 : 0.45;
  }, [darkMode, materials]);

  return (
    <>
      <color attach="background" args={[darkMode ? '#090d16' : '#e8edff']} />
      <hemisphereLight args={darkMode ? ['#c7d2fe', '#111827', 0.7] : ['#ffffff', '#c9d6e8', 0.85]} />
      <ambientLight intensity={darkMode ? 0.42 : 0.3} />
      <directionalLight
        position={[46, 80, 38]}
        intensity={1.1}
        castShadow={!lowDetail}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={1}
        shadow-camera-far={220}
        shadow-bias={-0.0005}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]} receiveShadow material={materials.ground}>
        <planeGeometry args={[400, 400]} />
      </mesh>

      {LEVELS.map((level) => (
        <Floor
          key={level}
          level={level}
          language={language}
          explode={routeExplode}
          cutaway={cutaway}
          visible={visibleFloors[level]}
          ghost={routeHighestLevel !== null && level > routeHighestLevel && cameraMode !== 'firstperson'}
          rooms={ROOMS_BY_LEVEL[level]}
          materials={materials}
          destinationId={destinationId}
          selectedRoomId={selectedRoomId}
          startRoomId={startRoomId}
          labels
          keyLabelsOnly={lowDetail}
          routeActive={Boolean(timeline)}
          onRoomSelect={onRoomSelect}
        />
      ))}

      <Connectors explode={routeExplode} materials={materials} bus={bus} labels={!lowDetail} />

      {blockedCorridor ? LEVELS.map((level) => (
        <group key={`blocked-${level}`} position={[0, levelToY(level, routeExplode), 0]}>
          <mesh position={[-12, 1.15, 0]} material={materials.blockedCorridor}>
            <boxGeometry args={[0.38, 2.3, 3.7]} />
            <Edges color="#fecaca" />
          </mesh>
        </group>
      )) : null}

      {!lowDetail ? <>
        <Html position={[0, levelToY(3, routeExplode) + 4.2, 35]} center zIndexRange={[9, 0]}><div className="wing-badge">Wing A <span>OPD</span></div></Html>
        <Html position={[-42, levelToY(3, routeExplode) + 4.2, 0]} center zIndexRange={[9, 0]}><div className="wing-badge wing-badge-emergency">Wing B <span>Emergency</span></div></Html>
        <Html position={[42, levelToY(3, routeExplode) + 4.2, 0]} center zIndexRange={[9, 0]}><div className="wing-badge wing-badge-lab">Wing C <span>Diagnostics &amp; Labs</span></div></Html>
      </> : null}

      {/* Ambulance arrival canopy at the west trauma entrance. */}
      <group position={[-43, levelToY(0, routeExplode), -8]}>
        <mesh position={[0, 3.15, 0]} material={materials.skybridge} castShadow><boxGeometry args={[8, 0.35, 8]} /></mesh>
        {[-3.5, 3.5].flatMap((x) => [-3.5, 3.5].map((z) => <mesh key={`${x}-${z}`} position={[x, 1.5, z]} material={materials.doorFrame}><boxGeometry args={[0.18, 3, 0.18]} /></mesh>))}
        <mesh position={[0, 0.04, 0]} material={materials.floors.emergency}><boxGeometry args={[8, 0.12, 8]} /></mesh>
      </group>

      <RouteOverlay
        timeline={timeline}
        explode={routeExplode}
        destination={destNodeForRoute}
        start={startNode ? { x: startNode.x, level: startNode.level, z: startNode.z } : null}
        startLabel={startLabel(startId, language)}
        destinationLabel={destDisplay ? labelFor(destDisplay, language) : ''}
        firstPerson={cameraMode === 'firstperson'}
      />

      <Avatar
        timeline={timeline}
        instructions={instructions}
        spawn={spawn}
        status={navStatus}
        speed={speed}
        explode={routeExplode}
        reducedMotion={reducedMotion}
        bus={bus}
        onProgress={onProgress}
        onArrive={onArrive}
      />

      <CameraRig
        mode={cameraMode}
        nonce={cameraNonce}
        focusLevel={focusLevel}
        explode={routeExplode}
        reducedMotion={reducedMotion}
        bus={bus}
        destination={destinationVector}
        groundRoute={routeHighestLevel === 0 && Boolean(timeline)}
      />

        <OrbitControls
        makeDefault
        enableDamping
        autoRotate={autoRotate}
        autoRotateSpeed={0.65}
        dampingFactor={0.08}
        minDistance={5}
        maxDistance={180}
        maxPolarAngle={Math.PI * 0.49}
        target={[0, 8, 0]}
      />
    </>
  );
}

function BuildingSceneBase(props: BuildingSceneProps) {
  const { lowDetail, onContextLost } = props;
  const materials = useMemo(() => createSceneMaterials(), []);
  const bus = useMemo(() => createSceneBus(), []);
  useEffect(() => () => materials.dispose(), [materials]);

  const contextLostRef = useRef(onContextLost);
  contextLostRef.current = onContextLost;

  return (
    <Canvas
      className="scene-canvas"
      shadows={!lowDetail}
      dpr={lowDetail ? 1 : [1, 1.75]}
      camera={{ position: [32, 26, 34], fov: 36, near: 0.5, far: 600 }}
      gl={{ antialias: !lowDetail, powerPreference: 'high-performance', toneMapping: NoToneMapping }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (event) => {
          event.preventDefault();
          contextLostRef.current();
        });
      }}
    >
      <SceneContents {...props} materials={materials} bus={bus} />
    </Canvas>
  );
}

/** The 3D building. Memoised so progress updates from the avatar do not re-render the scene tree. */
export const BuildingScene = memo(BuildingSceneBase);

