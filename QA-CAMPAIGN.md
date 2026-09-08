# Frozen Assets — campaign QA

7 September 2026. Local build only. No publishing, repository upload, Steamworks calls, or cloud service.

## Implemented scope

Five chapters and 32 main deliveries; eight compound lots and a three-part final vault; seven physically represented tools; 42 persistent fittings; 18 reward designs; five required evidence objects and Tony's optional ring; queued phone story, retained history and inspection; 12% → 8% → final 0% commission; completed ending and Recovery Contracts.

Save schema 4 retains active geometry, compartment, rewards, evidence, queues, history, tools, upgrades and commissions. The old browser key is retained, with a backup before the first campaign write. The asynchronous save adapter, localization keys, milestone IDs, demo boundary and input action layer are platform seams for a future desktop build, not a Steam integration.

## Automated checks

- `npm test`: 43 passing tests, including the original 27 regression checks and 16 campaign checks.
- `npx tsc --noEmit`: passed.
- Targeted Oxlint on changed React/game modules: passed.
- `npm run build`: passed and prerendered the static local game. Existing Vinext dynamic-import and Three.js chunk-size warnings remain nonfatal.
- Geometry tests cover every campaign layer, initial reward support, unique reward IDs, scalar health bounded at 1, and separation between all 42 fitting cards, seven tool cards and the root.
- State tests cover the full 32-delivery ending, all inner compartments, no duplicate credit, final ledger guard, 0% vault settlement, epilogue gate, contracts, optional ring, corrupt saves, old saves, pending story across reload, notification priority versus chronological history, and quick-click/cancellation behavior.

## Timing evidence

The surface-aiming simulation intersects the actual marching-tetrahedra mesh with a Three.js ray. It uses normal damage, cadence, fuel, refills, earned-money purchases, landing timers and settlement timers. It does not clear the field or grant currency. Its access to optimal target positions means it is a diagnostic bot, not a representative human player.

- Newest tool / precision policy: 86.23 minutes to campaign completion.
- Shape-matched tools / fan policy: 57.22 minutes.
- First block: 32 seconds in both runs.
- Ratchet grip: 32 seconds, after the first block.
- Proper ice pick purchase: 331 seconds (5.52 minutes).
- Final vault: 897 seconds with precision only; 463 seconds (7.72 minutes) with the broader toolkit.
- Gross recovered: $171,390. Net before purchases: $157,928. No final-vault commission.

Reproduce after `npm test` with `node tests/simulate-campaign.mjs` and `node tests/simulate-campaign.mjs --toolkit`. Per-delivery results and unlock times are in ignored `qa-artifacts/campaign-simulation*.json`.

The 100–140 minute first-time human target is **not verified**. The bot results support a longer campaign and expose how much tool choice matters, but omit reading, investigation, aim search, menus and exploration. They are not a guarantee of 60–90 minute speedruns or a lower bound. The opening and Audit chapter need human pacing feedback; precision-only use makes the vault too slow. No forced delays were added to disguise this.

## Browser verification

Used a separate `?qa=1` tab. The normal user tab was not played, reset or reloaded.

- 1280×800 opening: a direct canvas click chips the ice; the physical phone opens the handset. Large controls remain reachable.
- 1920×1080: inspected the equipped final vault, workshop equipment and retained evidence. The tag's account mismatch and non-sale status are readable.
- 1280×800: checked Upgrades, the next-tool preview, the independent tool inspector, retained evidence, ending receipt and epilogue. Fixed a competing `display: block !important` rule that prevented long message histories from scrolling. Final history had a 513px viewport, 6,827px content and correctly opened at the last message.
- Verified the full ending UI using an explicitly labeled state-machine fixture. This fixture skips physical work and is only an interface check; it was not used for duration measurements. Read the epilogue, returned to the receipt, and entered contract 1 with the 8% routing fee.
- No browser errors or warnings were recorded in the checked final-build flow.

Startup measurement on this machine, local production preview, 1280×800: input handlers ready at 482.1ms after navigation; first rendered frame at 575.6ms; first direct pointer strike responded in 22.3ms. Renderer initialization to first frame was 118.7ms. Steady sampled frame P95 was 4.3ms, with one 79.1ms frame maximum. These are local measurements, not cold-install or low-end hardware benchmarks. Diagnostics are in `qa-artifacts/campaign-startup.json`.

## Controller verification

Exercised the actual application polling loop with a temporary standard-gamepad fixture, restoring the browser provider afterward. Passed: phone opens, Back returns to play, Upgrades opens, D-pad changes focus, right stick pans the map, trigger + stick zooms, and shoulders cycle owned tools. A separate completed-campaign test confirmed A/Cross opens the final message and subsequently enters Recovery Contracts. This caught and fixed confirm/back handling in the completed state.

Xbox and PlayStation use the same standard indices through the action adapter. Stick rates use elapsed time. Keyboard focus brings offscreen tool nodes into view. Left/right on focused sliders emits the same adjustment as keyboard input. Physical controllers, Steam Input glyphs, haptics and Steam Deck hardware remain unverified.

## Save preservation

Read-only audits before and after the work found the regular version-3 save at round index 29, $4,690 and 118 recoveries. Its active thaw, credits, balance, recovery count and upgrades were preserved by migration. Migrated levels: heat 5, residual 8, tank 6, wide 7. The practice tab never writes that save.

## Narrative review

The five requested passes and harsh editorial review are in `NARRATIVE-REVIEW.md`, with the implemented line rewrites, notification fixes, mechanical corrections and remaining commercial-quality concerns. In the final UI pass, evidence collection was also separated from ordinary gold notifications and sounds, eliminating the misleading “+$0” ledger message.

The static playable output is `dist/client`. Screenshots and diagnostics are local in `qa-artifacts`; they are intentionally excluded from Git.
