# Workshop atmosphere and graphics

## Current follow-up: solid packing and clearer onboarding

- Fresh tutorial, campaign and contract assets no longer have voxel boxes cut
  around them at spawn. Old saves refill only sealed authored cavities; opened
  excavations stay removed. Save records carry a packing revision. Actual mesh
  contact still releases and credits assets on the next update.
- Reduced exposure, overhead light, ambient fill, key and rim light. The pick
  and heavy pick now hang handle-down on vertical ice, pivoting at the tip.
- Gameplay zoom frames the ice more closely at its default midpoint and reaches
  6.73 times that magnification at maximum. The longer slider retains a wide
  view at minimum. Desk props stay fixed in world space; extreme close-ups can
  crop them. The upgrade-map zoom remains independent.
- The first tutorial recovery uses Delivery Complete. Continue dismisses the
  receipt in one action. Upgrades and Hold to Chip receive gold lesson cues,
  with a static cue under Reduced motion. Tutorial copy describes ice clearance.
- Removed the persistent Phone button, Toggle to fire setting and Show results
  step. Old toggle preferences restore to normal press/release input.
- Fifteen routine equipment/handling calls are filed in Recovery Files silently.
  Other calls wait for three quiet seconds, with 45 seconds between completed
  calls during play. Required final-vault conversations and ending transitions
  retain their progression gates and commission effects.

Validation for this follow-up:

- **265 tests passed**, including packed faces at every asset placement, sealed
  and opened old-save migration, receipt-to-Hold-to-Chip progression, call
  cadence, and the existing 966 real-tool/phase release runs.
- **6,768 rendered release cases passed**, across **376 objects / 81 phases**,
  sampling **1,965,932 actual mesh contact points**. The matching headless
  release corpus and 20–144 FPS save/reload cases passed too.
- **16 live contact poses passed** for the chisel and pick, including both tilt
  limits, side faces, edges and rotations, with depth testing enabled.
- **24 live graphics/zoom switches passed**. Wide-view props, shared room scale,
  quality budgets, reduced motion and bounded allocations were checked.
- Visually checked softer lighting, packed coins, upright pick head, extreme
  zoom, the tutorial receipt, both gold highlights and Settings. The full
  tutorial sequence completed through 32 save/reload checkpoints.
- TypeScript, lint, formatting, production build and whitespace checks passed.
  Browser checks used the memory-only practice save; player slots were untouched.

The old external-ice budgets excluded cargo cavities. Budget regression tests
now account separately for the filled packing volume; tools were tested against
the actual new solid fields. Earlier timings below belong to the previous pass.

## Previous atmosphere pass (5721e6e)

The room now shares the delivery scale with the phone and tray. Previously the
room root was accidentally included in the static-matrix freeze, leaving its
props at full size outside the small early-game workshop. Static child meshes
remain frozen; the room root updates normally. Local point-light power and
range also follow that scale. The ceiling uses a cutaway when the fixed camera
is above it, rather than covering the work area with its outside face.

The camera composes the ice plus the reachable desk props. Original ice bounds
remain stable while chipping. Orthographic zoom is capped before the working
cluster leaves the crop. Prop positions do not move with zoom. Phone supports,
mug, folders, and the later service equipment are registered in `room-layout.ts`
and stay outside the rotating tray's sweep or above it on the raised shelf.

Atmosphere consists of two bounded particle draws: warm/cool lamplit dust and
cold wisps around the tray. Landing a delivery stirs the air. Paper corners move
slightly, the task light varies gently, and tapping the mug produces coffee
ripples. These effects have no collision bodies or recovery rewards.

Settings now contains a stepped Low / Medium / High / Ultra graphics slider.
The preset saves with the game and applies live without rebuilding the scene.
Old or invalid preferences default to High. Resolution caps, shadow-map size,
shadow filtering, dust/wisp counts and cosmetic fragment budgets change with
quality. Fewer particles overrides density and disables wisps; Reduced motion
disables the airborne animation and incidental movement.

## Validation

- `npm test`: **259 passed, 0 failed**. Includes the existing campaign, save,
  release stress and tool suites, plus three graphics/framing tests.
- **25,875 mathematical compositions**: all 32 deliveries / 69 authored
  phases, five yaw angles, three tilts, five aspect ratios and five zoom levels.
  Ice and reachable props remain within the usable crop; zoom is monotonic.
- TypeScript, lint on changed TypeScript/TSX, formatting, and production build
  passed. The generated game is served locally at port 4173.
- Live `test_workshop_graphics` runs passed on delivery one, both outer and
  final Vault phases, and tutorial step two. Each run switches four graphics
  levels at three zoom levels twice, checks real projected mug/phone/files
  bounds, room scale, rendering budgets, reduced motion and bounded GPU counts.
  Viewports included a 1600×900 landscape and 800×1000 portrait override;
  overrides were reset afterward.
- Mouse selection of Ultra and keyboard Home to Low updated the actual
  renderer immediately. The Low check reported pixel ratio 0.8 and shadows off;
  Ultra reported 360 motes, 36 wisps and a 2048 shadow map.
- **20 create/render/dispose cycles passed**: no listener, RAF or context leaks;
  geometry/texture allocations stayed bounded after warmup, with unchanged
  parent-scene resource counts. The later lighting normalization only changes
  existing light uniforms; a final live graphics audit also passed.
- Final-build, six-second real breaker interaction on Vault phase one:
  766 frames, mean 7.84 ms, p95 16.60 ms, CPU-work p95 10.10 ms, no frame error.
  This is a local hardware measurement, not a frame-rate guarantee or a full
  campaign playthrough.
- Browser QA used only `localhost/?qa=1`, whose save and slot backends are
  memory-only. Player save slots were not modified.

For a repeatable live check, open an isolated practice tab, select an authored
delivery with `practice_major_delivery`, then call `test_workshop_graphics`.
It restores graphics/zoom/comfort preferences afterward. `profile_major_field`
and `test_scene_lifetime` remain available for tool load and resource checks.
