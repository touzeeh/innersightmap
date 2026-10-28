# InnerSight · 3D Smart Indoor Navigation

InnerSight is a frontend-only prototype of indoor navigation for a large building. It
is set in a **fictional four-storey hospital**, which is an original layout and does not
represent any real building, including AIIMS.

Visitors can search for a destination by name, room number, department or Hindi name,
or speak it. The app plans a route through a navigation graph, shows it on a procedural
3D model, and walks a 3D guide along the route. Lifts and stairs connect the floors, and
directions are given in English or Hindi, on screen and by voice.

It runs with no API keys, no backend, no database and no sign-in.

---

## Prerequisites

- **Node.js 20.19+ or 22.12+** (Vite 7 requires one of these). Node 24 was used during development.
- npm 10+ (ships with Node).
- A modern browser with WebGL 2 (Chrome, Edge, Firefox or Safari).
- Optional, for voice input: Chrome or Edge. Speech recognition is not available in every browser (see *Known limitations*).

## Installation

```bash
npm install
```

## Development

```bash
npm run dev          # Vite dev server on http://localhost:5173
```

## Production build

```bash
npm run build        # type-checks (tsc -b), then builds to dist/
npm run preview      # serves dist/ locally on http://localhost:4173
```

## Tests

```bash
npm test             # Vitest + React Testing Library (one run)
npm run test:watch   # watch mode
npm run typecheck    # TypeScript only
```

The suite covers:

- **Data integrity:** room blocks clear of corridors and the core, doors on walls, rooms
  opening onto real junctions, same skeleton on every floor, 8–12 destinations per floor.
- **Search:** English and Hindi names, aliases and transliterations, room numbers,
  partial and case-insensitive matches, floor queries, ambiguous results and no-match cases.
- **Voice intent parsing:** commands, language switches, destination phrases, ordinal and digit answers to clarifications.
- **Routing:** the required journeys (Reception → Blood Bank, Main Entrance → Emergency Ward, Reception → Floor 3), elevator-only and staircase-only buildings, step-free routing, restricted rooms, no-route and same-location errors. A geometry check confirms that every walking edge lies in a corridor or in the room it serves, and a route test confirms that no room is passed through.
- **Instructions:** start and arrival, turn direction (left, right, straight, around), room entry, lift and stair rides, exits.
- **Avatar progression:** starts at the start node, finishes at the destination, never teleports, changes level during a ride, reports remaining distance.
- **State and persistence:** reducer rules (for example, floors are never all hidden, and route changes stop navigation), localStorage sanitising.
- **Components:** keyboard search and clarification, voice button states, unsupported-browser fallback, failed recognition messages.

## Demo script

1. Open the page. The building is shown in overview with the main entrance selected as the start.
2. Type **blood bank** and press **Enter**. The route, distance, estimated time and directions appear.
3. Press **Start navigation**. The guide walks the route. It uses the stairs by default, so you'll see stair climbs.
4. Select **Step-free (no stairs)** before starting to use the lift instead. You'll see the lift ride.
5. Switch the camera to **Follow guide** or **Top-down**. While guiding, top-down shows only the guide's floor, and follow hides floors above it.
6. Try **Reception → Inpatient Ward A** (Floor 3), **Main Entrance → Emergency Ward**, and **Room 204** (Medical Records on Floor 2).
7. Search **washroom** to see the clarification list, or **lift** to see one option per floor.
8. Search **मुझे ब्लड बैंक जाना है** (Hindi) or **खून की जाँच** (ambiguous between Pathology and Blood Collection).
9. Click **Restricted Radiation Store** (Floor 2). The app explains that the room is not open for visitor navigation.
10. Press **Reset demo** to clear saved preferences.

### Voice commands

Voice input starts only after you press **Speak**. Recognised phrases:

| Say (English) | Say (Hindi) | Effect |
| --- | --- | --- |
| "Take me to the blood bank" | "मुझे ब्लड बैंक जाना है" | Sets the destination and announces the route |
| "Room 204" | "मुझे रूम 204 तक ले चलो" | Sets the destination by room number |
| "Start navigation" | "नेविगेशन शुरू करो" | Starts guidance (only after a destination is set) |
| "Pause" / "Resume" | "रुको" | Pauses or resumes guidance |
| "Stop" | "बंद करो" | Stops navigation |
| "Repeat directions" | "दोबारा बोलो" | Repeats the current instruction |
| "Switch to Hindi" / "Switch to English" | "हिंदी में बदलो" / "अंग्रेज़ी" | Changes the interface and voice language |

If several places match, the app lists them and you can say their number ("two") or click one.

### Keyboard and accessibility

- Search is an ARIA combobox: **↑/↓** move through results, **Enter** chooses, **Escape** clears.
- Floor and camera controls are buttons with `aria-pressed` states. The live guidance panel is a live region.
- **Escape** cancels a pending "pick on map" action.
- Reduced motion (the operating system setting) shortens CSS transitions and makes camera moves immediate.
- **Low-detail mode** turns off shadows and antialiasing and shows only key labels.
- If WebGL is unavailable or the scene fails, the 3D view is replaced by a message, and search and text directions keep working.

## Controls in the 3D view

- Drag to orbit, scroll or pinch to zoom, right-drag (or two-finger drag) to pan.
- Click a room to make it the destination. While **Pick start on map** is active, a click sets the start instead.
- Floor panel: click a floor name to isolate it. Use the eye icon to show or hide a floor. **All floors** restores everything.
- **Explode floors** separates the storeys to show the structure.
- **Cutaway walls** lowers the walls.
- **Reset view** returns the camera to the building overview.

## Project structure

```
src/
  App.tsx                      Wiring: state, voice commands, announcements, layout
  main.tsx                     React entry point (StrictMode)
  styles.css                   Design tokens, layout, responsive rules, reduced motion
  data/                        Structured building data (edit these to change the building)
    floors.ts                  Storey names and levels
    layout.ts                  Shared corridor skeleton, planning blocks, core, exterior doors
    rooms.ts                   Every room: level, block, door, junction, category, names, room number
    connectors.ts              Lift (all levels) and staircase (adjacent levels), exterior entrances
    aliases.ts                 English, Hindi and transliterated aliases; category keywords
    navigationGraph.ts         Builds the weighted graph from the data above
    destinations.ts            Searchable destinations and start points, derived from the data
  types/                       building.ts, navigation.ts, speech.d.ts (Web Speech typings)
  services/                    Pure logic, no React and no Three.js
    textNormalize.ts           Hindi-aware normalisation, stop words, edit distance
    destinationSearch.ts       Scoring, ambiguity rules, labels
    voiceIntent.ts             Deterministic parsing of recognised speech
    speechSupport.ts           Voice selection and bilingual error messages
    pathfinding.ts             Dijkstra with a binary heap, step-free option
    routePlanner.ts            Route plan, distance and time estimates, error reasons
    instructionGenerator.ts    Ordered bilingual directions anchored to route nodes
    routeTimeline.ts           Time-based avatar track through lifts, stairs and corridors
    timing.ts                  Shared speed and connector timing constants
  state/                       appState.tsx (reducer and context), persistence.ts (localStorage)
  hooks/                       useVoiceRecognition, useSpeechSynthesis, useCapabilities
  i18n/                        strings.ts (UI text), categories.ts (labels and icons)
  three/                       3D scene
    BuildingScene.tsx          Canvas root, lights, floors, connectors, route, avatar, camera
    Floor.tsx, Room.tsx, Corridor.tsx   Floor plates, walls, room pads and labels
    Connectors.tsx             Lift shaft and car, stair treads, connector labels
    Avatar.tsx                 Procedural walking guide driven by the route timeline
    RouteOverlay.tsx           Route line, start and destination markers
    CameraRig.tsx              Camera modes, eased transitions, follow logic
    geometry.ts, palette.ts, levels.ts, sceneBus.ts, useGeometry.ts
  components/                  layout, search, voice, navigation, building, common, notice
  tests/                       Vitest and Testing Library suites
```

Data flows one way. The data files describe the building, and the graph and destinations
are derived from them. Services are pure functions. The 3D scene reads a route timeline and
writes progress back through a throttled callback. The avatar and camera use a shared
mutable bus, so 60 fps updates never trigger React re-renders.

## Adding floors, rooms and connectors

**Add a room** (`src/data/rooms.ts`)

1. Pick an unused planning block for the floor in `src/data/layout.ts` (or add a new block that does not overlap a corridor or the core; a test checks this).
2. Add a `RoomDef`: `id` (unique), `level`, `name`, `nameHi`, `roomNumber`, `category`, `block`, `door` (a point on the block's wall), and `junction` (the corridor junction the door opens onto).
3. Optionally set `publicAccess: false` to show the room on the map but exclude it from routing.
4. Add aliases in `src/data/aliases.ts`, keyed by the room id. Both scripts work, and matching ignores case, punctuation and common Hindi spelling variants.

The navigation node, doorway, search entry and 3D pad are generated automatically.

**Add a corridor junction** (`src/data/layout.ts`): add coordinates to `CORRIDOR_JUNCTIONS` (keep them on a corridor centreline in `CORRIDORS`). Every floor shares this skeleton.

**Add a connector** (`src/data/connectors.ts`): a lift lists every level it serves and joins them directly. A staircase may only join adjacent levels (a test enforces this). Connectors sit on the main corridor at `LIFT_POINT` or `STAIR_POINT`.

**Add an entrance** (`ENTRANCES` in `connectors.ts`, plus `EXTERIOR_DOORS` in `layout.ts` for the wall gap): give it a point inside the building and a room to connect to.

**Add a floor:** the current model is fixed at four levels. The `Level` type (`src/types/building.ts`), `FLOORS`, `LEVELS`, the camera offsets and the floor-visibility tuple all assume four. Extending it means widening those types and updating the tuples. This is a deliberate limit of the prototype.

After any data change, run `npm test`. The data-integrity tests report exactly which room, door or junction is wrong.

## Known limitations

- **Starting position is simulated.** GPS, Wi-Fi and Bluetooth positioning are not implemented. Start points are chosen by the user.
- **Time and distance are estimates** from the building model and fixed assumptions (1.3 m/s walking, lift and stair timing in `src/services/timing.ts`). They are not measured.
- **The guide is procedural.** It is built from primitives and walks a timeline. A rigged character would look more natural, but no licence-cleared asset was added.
- **Stairs are a single stepped run per floor pair.** Flights are drawn as steps, and the guide walks up or down them. The model has no landings or switchbacks, and each lift is a single car.
- **Ambient occlusion is not implemented.** Shadows are on by default and off in low-detail mode.
- **Speech recognition depends on the browser.** The Web Speech API is available in Chromium-based browsers (Chrome, Edge). Firefox and some Safari versions don't offer it, and the app then says so and keeps typed search. Microphone permission can be blocked, and the app reports that.
- **Speech output depends on the operating system's voices.** No Hindi voice may be installed, in which case the app shows a note. Hindi text is always displayed.
- **The layout is fixed to the hospital.** Changing building type means changing the skeleton in `layout.ts`.
- **Developer console warning.** In development, React StrictMode can log "Attempted to synchronously unmount a root while React was already rendering" for the HTML labels (drei `Html`). This does not appear in the production build, which logs no errors.

## Verification status

What was checked in this environment:

- `npm test`: 88 tests pass across 7 files.
- `npm run typecheck` and `npm run build` succeed. The production bundle loads with zero console errors or warnings.
- In headless Chrome, using the dev and production builds: typed search and Enter-to-choose, route and summary, starting navigation and live directions, the follow and top-down views, the floor isolation, the lift ride, Hindi search and Hindi interface.

What was **not** checked:

- Real microphone speech recognition, and spoken output in Hindi or English through real device voices.
- Real GPU hardware and mobile devices. The headless check used a software renderer at about 10 fps, so the simulated time runs slower there.
- Firefox and Safari.
- Screen-reader behaviour beyond the ARIA attributes in the code.

## Licence and attribution

The building, names and data are fictional. Icons are from [lucide-react](https://lucide.dev). The 3D stack is React Three Fiber, drei and three.js.
