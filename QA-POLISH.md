# Frozen Assets — interaction polish verification

Local build, 7 September 2026. No deployment or repository upload. Existing player saves were inspected read-only; playtests used the isolated `?qa=1` memory-backed save.

## Changes

- Button focus is distinct from pointer hover. Label replacement resets glyph springs, reads current DOM glyphs each frame, and settles exactly. This fixes the reproduced crooked **Read now → Next** label without requiring a hover.
- Call delivery ignores completed/duplicate events and cannot replace an existing call. Save restoration removes an active call from its pending queue. Next carries the displayed line identity, so stale confirmation cannot advance another panel. The reported `ch1.more` call completed in a clean reproduction before the change; duplicate saved checkpoints and stale input are now explicitly guarded and covered by regression tests.
- Upgrades fills the viewport with original icon nodes, thin connections, a continuous left zoom slider, pointer-anchored wheel zoom, bounded inertial panning, and a large return action. Purchases retain all existing prices, prerequisites and effects. Tree view preferences persist separately from recovery saves.
- Tools opens a compact selector. Owned tools have silhouettes and an equipped state; undiscovered slots show question marks without future names or artwork. Equipment withdraws before the replacement appears.
- Gameplay zoom is saved per recovery, interpolated, and constrained by projected block bounds. The orthographic camera never moves into the ice.
- Funds have a larger display, spring-driven counting and an interruptible response to earning/spending. Tony's normal reveal is 30 ms per character, with 85 ms comma and 130 ms sentence pauses; dialogue remains manually advanced.
- Tool follow separates raw targets from displayed position, normal and quaternion, with damping and velocity limits. The pick has a 525 ms strike cycle and a 210 ms impact point, one late buffered click, and a consistent held rhythm. Pause, cancellation and restore discard pending strikes. Damage, fragments, frost, material contact light and layered audio share the impact event.
- Early calls add phone bounce, a soft phone-centered vignette and hover response. Moving toward the phone or picking it up releases the vignette; guidance diminishes after the opening chapters.

## Verification

- `npm test`: **73 passed**. Includes the tutorial, complete campaign state sequence, old saves, atomic purchases, duplicate calls, input buffering, strike timing at 30/60/144/240 Hz, damped tool follow, and zoom persistence.
- TypeScript check, game-scoped lint, and production build passed.
- Live call regression: auto-focused Next letters settled without hover; `ch1.more:0 → ch1.more:1 → closed`, read once, no repeat.
- Live map regression: full viewport, pointer-reachable map, no extra navigation or +/- buttons, continuous scale changes, synchronized slider, remembered view. Actual pointer drags and wheel/slider interleaving were also exercised. This caught and fixed inherited `pointer-events: none` and old card margins that programmatic clicks alone would miss.
- Rendered pick measurement: **225 ms to impact; 523 ms to end of cycle** in the sampled run. One hit, visible anticipation. This is a sampled browser result; the authoritative timeline is 210/525 ms.
- Chisel/pick clearance: **16/16 poses passed**, including both tilt limits and near/far/side faces, with depth testing enabled. This clearance probe isolates resting presentation on intact ice; a separate live strike test exercises actual excavation and timing.
- Phone: **5.45 px peak lift**, 0.12 focus opacity, approach releases focus, pickup succeeds.
- Full tutorial UI regression passed at all text speeds and both UI sizes: exact letter-sound count, silent skip, stable text layout, manual advancement, purchase/return focus, archive separation and no button overflow.
- Rapid menu interruption: at most one interactive dialog, no dialogs left behind, no NaN transforms or unintended firing. Controller phone, focus, map pan/zoom, return and tool cycling passed after starting the isolated practice save.
- Pointer release, blur, cancellation, pause/resume, rotated targeting and UI-input isolation passed. The existing saved recovery retained its funds, upgrades, recovered items, credited flags and partial ice.
- Tools and map visually checked at the current desktop size and **1280×720**. The selector has no horizontal overflow. Final browser console check: no errors or warnings.

Evidence is in the ignored `qa-artifacts/polish-*.json` and `qa-artifacts/polish-*.png` files. These are targeted measurements and practice fixtures, not a claim of a complete manual playthrough or validation on every GPU/controller.
