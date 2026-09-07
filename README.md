# Frozen Assets

The bank froze your assets. Literally.

A complete 3D recovery game with a close camera and weighted rotatable tray built with Three.js, React, and the supplied Vinext/Sites scaffold. All objects, interface graphics, currency designs, and synthesized sound effects are original to this project.

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

- Move the pointer to aim. Hold the primary button to melt.
- Sweep around an object and cut the ice beneath it. A revealed find may still have supports.
- Valuables fall into the tray and collect automatically. Money is banked immediately on release.
- Open **Skill Tree** (or press **U**) to explore 42 connected upgrades across heat, fuel, fan, and afterheat branches. Drag empty space to pan; the arrow keys also pan, and + / − zoom. Click an available node to buy it with your real balance. The first $35 coin buys a $25 heat or fuel step. The tree pauses the bench. Each branch has larger mechanical milestones, and progression continues beyond the vault.
- **Primary-drag an empty or tray area** to rotate. A stroke starting on ice melts; a stroke starting off the ice rotates. Crossing into UI cancels either stroke. Right-drag remains an alternate inspection gesture.
- **Q / E** turn the tray; **C** smoothly returns it to the front. Space-drag and Alt-drag are also available. Vertical tilt is limited to ±8°.
- Press **R** or select **Refill** for free fuel. Your current thaw stays intact.
- Press **1** for precision or **2** for the fan nozzle after purchasing it.
- Press **Esc** or the F/A mark to pause. Restart and the control guide live here. The separate **Settings** screen contains only preferences: audio, tray sensitivity, toggle firing, fewer particles, reduced motion, and larger text.
- Finish 20 batches, including an authored final vault. Continue playing or restart with confirmation.

Saves are automatic and local to this browser and origin. Restart clears progress but retains comfort settings. A local development save is separate from a hosted save.

## Implementation

`lib/game/ice.ts` owns a bounded scalar volume. Marching tetrahedra converts that volume into the visible surface; the pointer ray hits that same surface. Local heat clears frost color and moves the surface. A base-connected flood fill removes unsupported sections. Tiny final restraints fracture before the treasure's fall corridor is cleared, so a drop never travels through a solid visible restraint.

`lib/game/model.ts` owns fuel, phases, economy, deterministic layouts, explicit treasure states, and versioned saves. Rewards are independent of decorative landing and collection. No delayed reward callbacks survive a restart. Heat, prices, audio limits, and timings are centralized in `tuning.ts` and the upgrade definitions.

`lib/game/scene.ts` owns the close orthographic view, rotation-aware framing, local targeting, physical presentation, bounded effects, and timing diagnostics. `rotation.ts` is a damped spring with bounded tilt and a short release tail. Ice, tray, loot and droplets share an assembly; rays and collection sweeps are transformed into its coordinates. Ice and valuables have real world dimensions 2.9× the original (1.71× the second pass); the tray grows 2.05× horizontally. Heat radii, gravity, effect sizes, camera fitting, and pointer bounds follow the same physical scale. The scalar-field dimensions and version-3 saves remain compatible. `skills.ts` maps each real upgrade to an explicit fitting and prerequisite, with stale-selection protection in the model. `audio.ts` uses reusable woodblock and varied material buffers through Web Audio with ramps and a compressor. No licensed stock assets or temporary remote asset links are required.

## Validate

```sh
npm test
npx tsc --noEmit
npm run build
```

The tests compile into ignored `.test-build/` using the installed TypeScript compiler. Localhost also exposes WebMCP tools for a deterministic test player, input safeguards, and short melting probes. The deterministic player uses ordinary heat, fuel and earned-money purchases. Open `http://localhost:4173/?qa=1` for an isolated practice bench that never reads or writes your normal save. Only that practice page exposes authored-batch selection and destructive test setup. It also provides a read-only compatibility audit of the regular save. The test controls are not registered on the hosted domain. Normal WebMCP controls provide status, pause, refill, and owned-nozzle selection.

The static build uses the existing Vite/Vinext APIs and lets Node finish naturally, avoiding the CLI’s intermittent Windows native-worker shutdown assertion.

The interface uses stable button hit targets with a spring-driven visual surface, magnetic pointer influence, individually responsive letters, and a small dot cursor. Reduced motion disables these effects. `progression.ts` contains the complete cost/effect curve; old saves migrate their equipment levels once, preserving their existing power and fuel capacity. `pan.ts` owns bounded tree inertia. jsfxr generates three short filtered mechanical latch samples offline (`node tests/render-ui-sounds.mjs`); these are cached and layered with the existing Web Audio woodblock for purchases. No arcade presets play in the game.

See `QA-FOURTH-PASS.md` for this update. Earlier QA documents retain their historical results. Human first-play duration and subjective sound/feel remain tuning judgments, not automated-test guarantees.
