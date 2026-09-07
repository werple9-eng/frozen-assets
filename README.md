# Frozen Assets

The bank froze your assets. Literally.

A complete fixed-camera 3D recovery game built with Three.js, React, and the supplied Vinext/Sites scaffold. All objects, interface graphics, currency designs, and synthesized sound effects are original to this project.

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
- Buy heat output with the first $35 coin. Workshop prices use the real balance.
- Press **R** or select **Refill** for free fuel. Your current thaw stays intact.
- Press **1** for precision or **2** for the fan nozzle after purchasing it.
- Press **Esc** for pause and settings. Settings include toggle firing, master/effects volume, mute, fewer particles, and larger text.
- Finish 20 batches, including an authored final vault. Continue playing or restart with confirmation.

Saves are automatic and local to this browser and origin. Restart clears progress but retains comfort settings. A local development save is separate from a hosted save.

## Implementation

`lib/game/ice.ts` owns a bounded scalar volume. Marching tetrahedra converts that volume into the visible surface; the pointer ray hits that same surface. Local heat clears frost color and moves the surface. A base-connected flood fill removes unsupported sections. Tiny final restraints fracture before the treasure's fall corridor is cleared, so a drop never travels through a solid visible restraint.

`lib/game/model.ts` owns fuel, phases, economy, deterministic layouts, explicit treasure states, and versioned saves. Rewards are independent of decorative landing and collection. No delayed reward callbacks survive a restart. Heat, prices, audio limits, and timings are centralized in `tuning.ts` and the upgrade definitions.

`lib/game/scene.ts` owns the fixed camera, local targeting, physical presentation, bounded effects, and timing diagnostics. `audio.ts` synthesizes the sound palette through Web Audio with ramps and a compressor. No licensed stock assets or temporary remote asset links are required.

## Validate

```sh
npm test
npx tsc --noEmit
npm run build
```

The tests compile into ignored `.test-build/` using the installed TypeScript compiler. Localhost also exposes WebMCP tools for a deterministic test player, input safeguards, and short melting probes. These tools use ordinary heat and purchases; they cannot grant money or skip rounds. The test controls are not registered on the hosted domain. Normal WebMCP controls provide status, pause, refill, and owned-nozzle selection.

See `QA.md` for observed checks and limitations. The 15–25 minute first-player duration is a tuning target, not a validated human playtest result.
