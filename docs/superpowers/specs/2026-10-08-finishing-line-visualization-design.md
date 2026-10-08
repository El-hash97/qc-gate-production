# Finishing Line Visualization — Design

Date: 2026-10-08
Branch: `claude/finishing-process-visualization-bf4dd7`

## Goal

A new menu **Visualisasi** shows a simple 3D animation of the Block Cylinder
finishing line. While production is running (not reset), blocks flow through
the line continuously; OK, Repair and NG blocks take their own routes, and the
current OK / Repair / NG counts are clearly visible.

## Decisions

- **Three.js only** (`three` dependency, no `@react-three/fiber`). The `.blend`
  file (189 MB) is not used; the layout is rebuilt low-poly to resemble the
  reference video. Station names/positions will be corrected later by the user.
- **Mode A — continuous flow by ratio**: the line runs at a constant rhythm;
  each block's outcome is drawn from the actual OK/Repair/NG ratio.
- **Scope = Block Cylinder** (line 1 = BC 1TR + line 2 = BC 2TR counters).
- **Public page** like Dashboard (no login).
- No DB / API changes. Data comes from the existing `useProductionState()`
  (3 s poll).

## Process flow

```
Baritori → HSB05 → HSB06 → Grinding → Hanten MC → Final Proses
  → QC Gate 1 → QC Gate 2 ─┬─ OK     → Spray Booth → Junbiki → Truk
                           ├─ Repair → Meja Repair → QC Gate 2 → (OK route)
                           └─ NG     → Box Merah
```

## Units

### `utils/finishingFlow.ts` (pure, unit-tested)
- `STATIONS`: id, label, position `[x, z]`, shape (`box` | `cylinder`), size.
  One table — moving a station means editing one row.
- `ROUTES`: waypoint station-id lists for `main` (Baritori → QC Gate 2),
  `ok` (QC Gate 2 → Spray Booth → Junbiki), `repair` (QC Gate 2 → Meja Repair →
  QC Gate 2), `ng` (QC Gate 2 → Box Merah).
- `bcCounts(state)` → `{ ok, repair, ng }` = line1 + line2.
- `isRunning(counts)` → `ok + repair + ng > 0` (reset zeroes them → stops).
- `pickOutcome(counts, r)` with `r ∈ [0,1)` → `'ok' | 'repair' | 'ng'`
  proportional to the counts.

### `components/visual/FinishingLine3D.tsx` (client only, `dynamic` ssr:false)
- Builds the scene from `STATIONS`: floor, conveyors between consecutive
  stations, machines (HSB05/06 as cylinders), floating text labels
  (canvas sprites), red NG box, repair table, Junbiki, truck.
- Isometric camera + `OrbitControls` (rotate/zoom).
- One `requestAnimationFrame` loop; paused while the tab is hidden; all
  geometry/material/renderer disposed on unmount.
- Props: `counts`, `running`, `theme`. Counts are read through a ref so a poll
  update does not rebuild the scene.

### Block animation
- Spawn a block every ~2 s at Baritori while `running`.
- It moves along `main` at constant speed. At QC Gate 2 it draws its outcome
  and changes colour: green (OK), yellow (Repair), red (NG).
- Repair blocks go to Meja Repair, pause, return to QC Gate 2, turn green and
  continue on the OK route.
- NG blocks drop into Box Merah, pile briefly, then disappear.
- OK blocks reach Junbiki, then load onto the truck bed.

### Truck
- Parked beside Junbiki. OK blocks stack in the bed.
- When the bed holds **10** blocks (`TRUCK_CAPACITY`), the truck drives off
  screen, the bed is cleared, and an empty truck drives back in. Blocks
  arriving while the truck is away wait at Junbiki.

### Page `app/visualisasi/page.tsx` + TopNav link
- Top: three count tiles **OK / Repair / NG** (BC 1TR+2TR) with percentages,
  using existing theme tokens.
- Below: the 3D canvas (fills remaining height).
- When not running: scene stays static with overlay
  "Produksi belum berjalan".

## Performance & theme
- Live objects capped (blocks removed after piling); target 60 fps on a
  plant PC/tablet.
- Light/dark: scene background and floor colours follow `useTheme`.

## Testing
- Vitest unit tests for `finishingFlow.ts`: `bcCounts`, `isRunning`,
  `pickOutcome` ratio boundaries, and that every route starts/ends on
  existing stations.
- Manual/browser verification of the page in the preview (running vs reset,
  theme toggle, truck cycle).

## Out of scope (later)
- Exact station names/positions (user will point them out).
- Importing a decimated GLB from Blender.
- Event-driven blocks per actual input.
