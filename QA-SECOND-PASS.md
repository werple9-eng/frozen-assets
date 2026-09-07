# Second-pass verification

Overhaul of the existing Frozen Assets prototype, tested on 7 September 2026. The original build record is retained in QA.md. This pass stays local.

## Concrete changes

- Ice and treasure coordinates are 1.7 times their original size on every axis, approximately 4.9 times the volume. The new starter uses the substantial regular block instead of a smaller starter cube. Existing saved starter geometry retains its thaw and is enlarged with the same coordinate transform.
- The tray grows 1.42 times horizontally. The closer orthographic view frames the entire assembly, including its rotated bounds, with a damped adjustment that keeps ice and tray clear of the HUD. There is no wide-angle distortion or player camera orbit.
- A spring-driven turntable supports right-drag, Space/Alt-drag, an explicit Rotate tray control for left-drag/touch, Q/E turning, and C centering. Tilt is limited to +/-8 degrees. Rendering, surface rays, local gravity, particles, and collection sweeps all share the same tray transform.
- The default view has dark slate controls, a subdued wooden surface, brighter cloudy ice, softened shadows, and a small HUD. Upgrades are behind a separate equipment menu with the original prices, levels, and current/next effects. Original fitting illustrations replace generic upgrade icons.
- Buttons depress and recover quickly. Menu transitions are short and distinct. A reusable synthesized woodblock provides quiet, throttled UI feedback. Up to four reward traces visually connect releases with the counter; authoritative credit remains immediate.

## Tests completed

- 19 automated tests pass, covering the previous economy/fuel/save/ending invariants plus physical dimensions with unchanged save topology, spring/inertia/tilt behavior, and purchases while paused.
- The regular localhost:4173 save was audited without playing or changing it: version 3, batch 2, $245, five credited treasures. Balance, progression, upgrades, credit identities, and every thaw sample loaded unchanged.
- Runtime input tests exercised the actual canvas/window handlers. Right-drag did not fire or alter fuel, money, or ice. Left press fired; left dragging did not rotate. UI pointer movement did not rotate. Release, blur, pointer cancellation, pause, and resume stopped or kept firing stopped as appropriate. Rotated surface coordinates transformed back with error around 1e-15 world units.
- The rotation spring did not teleport to its target, retained a short tail after release, and remained inside its vertical limit. A real drag through the visible Rotate tray control preserved fuel and ice.
- Real UI purchases used earned funds while the bench remained paused: $945 -> $910 for Heat output and $910 -> $730 for Fan nozzle. Levels/effects and nozzle availability updated correctly. Escape, the close button, menu tabs, and the return action were exercised.
- A burst of 40 hover requests produced one UI voice after trusted audio activation. Voice counts stayed within the configured cap. AudioContext, output gain and mute behavior were observed; subjective sound quality was not listened to through recording tools.
- Visual checks covered 1569x912, 1280x720, 900x720 and 560x820. The narrow page had document width and scroll width both 560px. The equipment panel remains usable within the viewport and scrolls when needed.

## Critique fixes made during this pass

1. The first enlarged starter still left too much empty tray. The starter now uses the full regular envelope; framing is closer and accounts for the actual assembly bounds.
2. A side-on view could place the ice behind the top HUD. Framing now follows the rotated bounds smoothly, with fixed HUD clearances. The fallback torch aim is also expressed in tray coordinates.
3. Menu animation temporarily overrode the positioning translation, which was obvious on the narrow viewport. Animation now uses a separate transform, keeping the panel centered throughout its entrance and exit. Keyboard event ordering was hardened for Escape, and upgrade rows preserve keyboard focus across purchases.

## Performance and limits

The test context is the Windows Codex in-app Chromium browser, static production output, Node.js 24.15.0, pixel ratio 1. Active sampled intervals in the overhaul reported roughly 197-240 FPS, p95 intervals around 4.3-8.4ms, and p99 intervals up to 12.5ms. A later sample recorded a 33.4ms maximum with no frames above 50ms in its 900-frame window. JavaScript update/render work in active samples had p95 around 8.1-10.4ms. These are local browser-loop observations, not a GPU capture or hardware-wide guarantee.

A first-frame diagnostic during a throttled/background interval returned 808.5ms. That is recorded rather than treated as a normal active-input measurement. The input state itself changed synchronously. Current diagnostics include visible long frames and report document visibility/focus so long stalls are not silently discarded.

Particles remain capped at 48, fracture fragments at 18 per event, one-shot voices at 12, and reward traces at four. Physics remains a controlled local approximation: the assembly carries the material; rotation does not inject unbounded physical energy into loot. Blocked collection paths retain the local settling fallback.

The visuals and audio remain original procedural prototype assets, with no music or recorded Foley. Human enjoyment, 15-25-minute pacing, subjective long-session sound comfort, physical touch devices, and low-end GPU performance remain unverified. No additional game systems or currencies were added.

## Complete replay and final regression checks

A separate isolated production bench completed all 20 batches with 82 credited valuables, $13,260 recovered, every upgrade purchased and $7,595 remaining. Unpaused game time was 381.3 seconds including manual UI and rotation checks. Early purchases were performed manually with earned funds; the later run used the deterministic player. Batches were recovered at about 176 degrees of tray rotation and then about 248 degrees with a 6.7-degree tilt; the final stages used the fan nozzle. This was an automated core replay, not a human pacing study.

Continue Playing retained $7,595, the upgrades, settings and nozzle, then began batch 21. Cancelling restart retained that state. Confirmed restart on this disposable bench reset money, upgrades, current field, rewards, particles and firing; comfort settings remained. Geometry count returned to 74 with the new shadow setup. The regular player save was never reset.

A later settings check caught an interface-scaling issue across the dialog portal. The large-text class is now also applied to the equipment menus. The input diagnostic explicitly selects melting before testing left-button fire, so it does not mistake the selected rotation tool's correct input isolation for a firing failure.

Final build checks passed after the menu fixes: TypeScript validation, static export, and HTTP 200 from localhost:4173. A Windows native-runtime shutdown assertion occurred once after successful export; static builds now avoid importing the unused Cloudflare native helpers at all, and the subsequent builds exited successfully. The toolchain still emits its advisory about the large Three.js client bundle.

The final large-text settings labels measured 16px inside the portal. Switching management tabs starts the new panel at its top, and only one management dialog is present. Clicking the backdrop closed the menu with fuel unchanged and firing still off. The final input safeguard probe passed all state assertions.
