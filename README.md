# Frozen Assets

The bank froze your assets. Literally.

A local 3D recovery campaign with five chapters, 32 main deliveries, six tool families, and a weighted rotatable tray, built with Three.js, React, and the existing Vinext/Sites scaffold. The long-term target is premium PC/Steam; this build does not include Steamworks or a desktop wrapper. All objects, interface graphics, currency designs, and synthesized sound effects are original to this project.

## Run

Requires Node.js 22.13 or newer.

```sh
npm install
npm run dev
```

Open the local address printed by the server, normally http://localhost:3000.

For a production build and local playback:

```sh
npm run build
npm start
```

The production preview runs at http://localhost:4173. The deployable game is the static `dist/client/` directory. No account, external service, API key, or server database is needed for gameplay.

## Play

Choose one of three local save slots, then **New game** or **Continue recovery**. **Pause → Save slots** switches slots. Clearing a slot uses an in-game confirmation and exposes **Restore cleared file** until the recovery copy is replaced.

- Move the pointer to aim. Click with the starter chisel. New files begin with Tony's two-parcel induction: recover two coins, buy **Hold to Chip** with the proceeds, then practice holding across six small finds. Later tools strike, break or melt. Settings also offers toggle work.
- Sweep around an object and cut the ice beneath it. A revealed find may still have supports.
- Valuables fall into the tray and collect automatically. Money is saved immediately on release; the visible counter rolls when the item lands.
- Open **Upgrades** (**U**) for six separate radial tool trees and 60 authored upgrades. Choose an unlocked tool across the top; undiscovered tools show **?**. Hover or focus a node for its effect and price. Drag to pan, use the wheel or right-hand rail to zoom, and use arrow keys for nearby-node navigation. Purchases use your net balance after Tony's commission. Tony reveals equipment; each later tool has a separate paid acquisition. The bench pauses while menus are open.
- Click the ringing landline or press **P** to pick up. Live calls pause the work and wait for **Next**; one confirmation reveals unfinished text silently, the next advances. Pick up an idle handset and dial **7** for any waiting call; **Esc** hangs up an outgoing line. Click the manila folder or press **F** for **Recovery Files**, the separate call/evidence archive. **[ / ]** cycles owned tools.
- **Primary-drag an empty or tray area** to rotate. A stroke starting on ice melts; a stroke starting off the ice rotates. Crossing into UI cancels either stroke. Right-drag remains an alternate inspection gesture.
- **Q / E** turn the tray; **C** smoothly returns it to the front. Space-drag and Alt-drag are also available. Vertical tilt is limited to ±8°.
- Press **R** or select **Refill** for free fuel. Your current thaw stays intact.
- Press **1** for precision or **2** for the fan nozzle after purchasing it.
- Press **Esc** or the F/A mark to pause. Restart and the control guide live here. The separate **Settings** screen (**O**) contains audio, dialogue type sounds, text speed, tray sensitivity, toggle firing, fewer particles, reduced motion, and larger text.
- Finish 32 main deliveries across Small Change, Cold Storage, The Audit, Sublevel B and The Vault. Claims contain varied inner compartments, progressing from small parcels to seams, supported wings, and archives. The three-part final vault contains the Freeze Ledger. Read the final unknown-number message to unlock Recovery Contracts.

Saves are automatic and local to this browser and origin. Version 4 saves retain campaign state, commissions, evidence, message history, tools and active compartments. Version 3 imports preserve the current recovery, money and equipment; finishing that imported block starts Tony's campaign with those possessions intact. The original `frozen-assets-v3` browser key is imported into file 1 when no catalog exists and remains untouched. The three-file catalog uses `frozen-assets-slots-v1`; each file keeps its own version 4 recovery. Restart clears progress but retains comfort settings. The isolated `?qa=1` bench is disposable and does not write the regular save.

Standard Xbox / PlayStation mapping: RT / R2 works, left stick aims, right stick rotates the tray, shoulders cycle tools, Y / Triangle opens the phone, X / Square opens Upgrades, A / Cross confirms, B / Circle goes back, and Start pauses. In menus, the D-pad moves focus; right stick pans Upgrades or scrolls messages, and LT / L2 + right stick zooms the map. Left / right on a focused slider adjusts it. Clicking the left stick refills thermal fuel. Hardware glyphs and Steam Input integration remain future platform work.

## Campaign and platform boundaries

- `campaign-content.ts`: chapters, deliveries, layered profiles, tools, evidence, short storylets and stable localization keys.
- `campaign.ts`: trigger queue, chronological message history, once-only flags, commission ledger, collections and stable milestone events. The finale has an explicit evidence guard; contracts require the epilogue.
- `campaign-layout.ts`: authored shapes and distinct reward pools. Larger physical volumes and compartments add work; scalar ice health remains bounded at 1.
- `platform.ts`: asynchronous save backend interface, ordered save writes and standard controller action mappings. Gameplay never accesses localStorage. A future file/Steam adapter can replace storage without changing the campaign.
- `workshop.ts`: physical phone, owned tools, recovered evidence and chapter equipment. Demo builds can use the exported Chapter 1 tag boundary with the same save schema; there is no purchase link.

Tony takes 12%, then 8% following the exception log. Each delivery locks its settlement rate. The final vault charges 0%; contracts resume an 8% routing fee. Rounding is cumulative within each delivery, so split rewards never create duplicate deductions.

## Implementation

`lib/game/ice.ts` owns a bounded scalar volume. Marching tetrahedra converts that volume into the visible surface; the pointer ray hits that same surface. Local heat clears frost color and moves the surface. A base-connected flood fill removes unsupported sections. Tiny final restraints fracture before the treasure's fall corridor is cleared, so a drop never travels through a solid visible restraint.

`lib/game/model.ts` owns fuel, phases, economy, deterministic layouts, explicit treasure states, and versioned saves. Rewards are independent of decorative landing and collection. No delayed reward callbacks survive a restart. Heat, prices, audio limits, and timings are centralized in `tuning.ts` and the upgrade definitions.

`lib/game/scene.ts` owns the close orthographic view, rotation-aware framing, local targeting, physical presentation, bounded effects, and timing diagnostics. `rotation.ts` is a damped spring with bounded tilt and a short release tail. Ice, tray, loot and droplets share an assembly; rays and collection sweeps are transformed into its coordinates. Ice and valuables have real world dimensions 2.9× the original (1.71× the second pass); the tray grows 2.05× horizontally. Heat radii, gravity, effect sizes, camera fitting, and pointer bounds follow the same physical scale. The scalar-field dimensions and version-3 saves remain compatible. `tool-trees.ts` defines each real upgrade, its tool family, prerequisite, price, and physical effect, with stale-selection protection in the model. `audio.ts` uses reusable woodblock and varied material buffers through Web Audio with ramps and a compressor. No licensed stock assets or temporary remote asset links are required.

## Validate

```sh
npm test
npx tsc --noEmit
npm run build
```

The tests compile into ignored `.test-build/` using the installed TypeScript compiler. Localhost also exposes WebMCP tools for a deterministic test player, input safeguards, and short melting probes. The deterministic player uses ordinary heat, fuel and earned-money purchases. Open `http://localhost:4173/?qa=1` for an isolated practice bench that never reads or writes your normal save. Only that practice page exposes authored-batch selection and destructive test setup. It also provides a read-only compatibility audit of the regular save. The test controls are not registered on the hosted domain. Normal WebMCP controls provide status, pause, refill, and owned-nozzle selection.

The static build uses the existing Vite/Vinext APIs and lets Node finish naturally, avoiding the CLI’s intermittent Windows native-worker shutdown assertion.

The interface uses stable button hit targets with a spring-driven visual surface, magnetic pointer influence, individually responsive letters, and a thin hollow cursor. Reduced motion disables these effects. `progression.ts` contains the complete cost/effect curve; old saves migrate their equipment levels once, preserving their existing power and fuel capacity. `pan.ts` owns bounded tree inertia. jsfxr generates three short filtered mechanical latch samples offline (`node tests/render-ui-sounds.mjs`); these are cached and layered with the existing Web Audio woodblock for purchases. No arcade presets play in the game.

Upgrades now uses six separate radial maps with 55px icon faces, larger invisible hit targets, restrained branch colors, and adjacent detail panels. The earlier card-grid design is retained only in historical QA notes. Nine deterministic reward silhouettes preserve existing values and saves. Local kinetic value labels originate at each tray impact, with neighboring labels assigned separate lanes.

See `QA-CAMPAIGN.md` and `NARRATIVE-REVIEW.md` for the campaign update. `QA-FIFTH-PASS.md` retains the preceding polish results. Human first-play duration and subjective sound/feel remain playtest questions, not automated-test guarantees.

## Motion pass

Buttons use interruptible, substepped springs for their face and active letters. Nearby controls gently pull toward the cursor. Screen transitions reverse natively from their current pose. The Upgrades map keeps inertia and springs to navigation targets; purchase signals travel along connections before their child nodes awaken. Tony's handset lifts when a call is answered. Live calls use a large bottom panel, while Recovery Files opens a separate archive. New visible messages use individual bouncing glyphs, punctuation timing, and cached quiet letter sounds.

The six tool families retain distinct lift, recoil, twist and return tuning. Chisel contact is immediate; Hold to Chip is part of its upgrade tree. Impact waves shade the real ice surface, while a shared content transform keeps ice/reward motion and ray targeting aligned. Deliveries fall and settle, freed finds recoil/tumble, and their landings use material-dependent deformation. Particle meshes and geometry are reused under the existing 48-particle ceiling. Reduced Motion retains quick fades and clear state feedback.

See **MOTION-AUDIT.md** for the action-by-action audit, measurements, and remaining limits. `npm test` includes spring stability, interrupted retargeting, slot import/isolation/restore/failure handling, and visible-versus-saved money checks. The local `?qa=1` WebMCP surface exposes `test_motion_choreography` for repeatable UI, delivery, tools, rewards, purchase and phone checks.

## Directed opening

New games enter an empty workshop and a ringing physical landline. Tony's 17 authored tutorial panels use a large, bottom-centered, player-paced call screen. Click **Read now** or confirm once to reveal the rest silently; confirm again to continue. Important calls never auto-dismiss. Work instructions use a compact **CURRENT TASK** strip after the dialogue closes. The call archive is separate and shows only panels already reached.

The two induction parcels have 45% and 68% of the normal first parcel's linear footprint. Their dedicated surface-exposure rule releases finds after the upper/front shell is sufficiently open, then clears the physical fall corridor. Campaign parcels retain their existing support rules. The first $70 gross claim deducts Tony's $8 fee; **Hold to Chip** costs $25 from the remaining $62. The second parcel is thicker and contains six finds, using the same strengthened impact tuning. A stamped assignment board introduces all five chapters, followed by a final live call and the Chapter 1 title.

Tutorial checkpoints, first-impact confirmation, fitting purchase, and the board stamp persist in version 4 saves. Existing recoveries without tutorial data continue normally. To try the opening without touching a recovery file, use `http://localhost:4173/?qa=1`, then **New game**. The collapsible tutorial inspector and `inspect_tutorial`, `test_tutorial_sequence`, `test_tutorial_ui`, `test_tool_contacts`, and `tutorial_control` WebMCP tools exist only on this isolated localhost bench. Sequence validation can reload every checkpoint; jump/replay/release/stamp controls operate only on disposable practice state.

Display lettering uses locally bundled **Barlow Condensed Black**, licensed under SIL OFL 1.1; the license is in `public/fonts/OFL-Barlow.txt`. Geometry and sound remain generated locally. **QA-LANDLINE.md** records this correction pass; **QA-TUTORIAL.md** retains the earlier implementation's results.

Live text defaults to 50 ms per character, with longer punctuation pauses. Settings offers Slow, Normal, Fast, and Instant. All glyphs reserve their final word layout before animation. The hollow cursor contracts on actual ice and expands over buttons. The camera fits the delivered solid and stays steady during excavation; the tray has shallow lips and collision-aware collection routes. A physical keypad, amber line lamp, coiled cord, file folder, workshop lamp, drifting cold air, papers, and a file crate provide desk context.

Tutorial revision 2 saves the dialogue/task/ringing state and preserves the previous two-item practice parcel when loading revision 1 checkpoints. Active campaign calls also save the current panel and speaker handoff. This remains a local build; nothing is published or uploaded.


## Tool-tree regression and pacing checks

After `npm test`, run `node tests/run-progression.mjs` for eight complete surface-targeting strategies, including the fresh tutorial, or `node tests/compare-branches.mjs` for equal-spend branch comparisons. Reports are written to ignored `qa-artifacts/`. These simulate input, reading, and purchases; they are not a substitute for human playtesting. See `UPGRADES-OVERHAUL.md` for the latest scope, validation, and pacing results.
