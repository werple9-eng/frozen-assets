# Frozen Assets — stress-test report

Tested September 13–14, 2026, starting from `3a798c5` on `codex/frozen-assets`.
This report describes this QA pass, not a guarantee that no bugs remain. Tests used isolated practice saves; the player's save slots were not reset or overwritten.

## Bugs fixed

1. **Tutorial upgrade focus — high impact.** Finishing Tony's upgrade instructions could focus a locked upgrade instead of Hold to Chip. Competing popup and tutorial focus handlers also lost the return-button target after purchase. Consolidated the handoff and prioritized the visible lesson control. Browser verification: Hold to Chip receives focus, purchases for $25 ($62 → $37), and Back to the bench receives focus after the acknowledgement. The second parcel then loads normally.
2. **Overlapping failed saves — high impact.** Two queued writes that failed could leave unsaved progress in the in-memory slot catalog. A subsequent clear could back up that phantom progress. Save, clear, and restore now run as complete serialized transactions; catalog changes publish only after storage succeeds. Regressions reproduce both failures and verify recovery after a transient failure.
3. **Clear versus autosave race — high impact.** Clearing the active slot could race blur/pagehide autosave and refill the cleared slot. Detach the active save target before awaiting the clear, and restore it if clearing fails. Save-menu actions stay disabled during an operation. Switching slots flushes current progress first. Manually cleared and restored a disposable Batch 32 save, then created another slot without replacing it.
4. **Invalid active slot in damaged catalogs — medium impact.** Malformed, fractional, and out-of-range active indices were accepted/coerced. They are now rejected before publishing catalog state. Original stored data remains untouched. Six invalid index forms are covered.
5. **Tony's call cooldown lost on reload — medium impact.** The 45-second spacing lived outside serialized campaign state. Reloading could make the next queued call ring after the initial three-second quiet period. The remaining cooldown is now saved, restored, and bounded; older saves remain supported. Regression verifies both suppression and eventual delivery of the queued call.
6. **Refill interrupts the wrong state — medium impact.** The refill command accepted manual tools and could interrupt a call, dial screen, delivery receipt, or tool notice. It now requires a thermal tool and an unobstructed playing state. Regression covers rejected states and a valid thermal refill.
7. **Browser shortcuts also trigger game controls — medium impact.** Global handlers responded to modified shortcuts such as Ctrl+C. Both the UI and scene now ignore Ctrl, Meta, and Alt combinations, preventing simultaneous game actions.
8. **Phone opens behind menus — medium impact.** The shared phone callback lacked the keyboard handler's menu protection, allowing another input route to open it behind a menu. It now respects active menus, receipts, and tool notices.
9. **Unsupported mug material option — minor.** Three.js warned that `clearcoat` was not supported by the mug's standard material. The ceramic now uses the physical material that supports that property.

## Verification performed

- **271 automated tests passed**, including six new regression tests. TypeScript, lint on changed source, and the production static build passed.
- **600 interleaved save / clear / restore requests** produced the expected catalog and matched durable storage. Injected storage failures did not publish phantom saves and did not poison subsequent operations.
- **6,768 rendered release scenarios** covered 376 cargo items across 81 campaign/endless phases, with 1,965,932 mesh-contact samples and zero failures. These are synthetic physical openings checked against actual rendered meshes, not manual playthroughs. The test matrix includes final-contact removal and retained-contact cases.
- The automated suite also passed **966 actual-tool final-contact cases** across all six tools, with base and developed configurations, and **276 mid-fall save/reload scenarios** at modeled 20–144 FPS. No additional ice-release defect reproduced in this pass.
- **Nine complete campaign simulations** reached the ending: mixed, saver, upgrader, cheapest-first, power-first, speed-first, control-first, technique-first, and deliberately inefficient. Together these completed 288 deliveries. They use the real model, raycasts, earned money, and purchase rules. Their estimated reading/menu time is not hours of human playtesting.
- **24 live graphics/zoom combinations passed:** Low, Medium, High, and Ultra at minimum, middle, and maximum zoom, repeated twice. Checked resolution, shadow settings, room/tray scale, mug/phone/file bounds at wide view, stable allocation counts across repeated settings, and reduced-particle behavior.
- **16 rendered contact poses passed** for chisel and pick, with 23 samples per pose: front, left/right rotation, both tilt limits, near/far edge, and side face. The audit rendered controlled 60 Hz steps through the normal scene frame function so every animation phase was sampled. This is geometry evidence, not an FPS benchmark.
- **20 controlled scene creation/render/disposal cycles** covered early, middle, late, and vault fields, disposing both during and after phase-shell animations. All 20 individual cleanup checks passed: no frame errors, no remaining registered listeners, stopped animation loops, released WebGL contexts, removed canvases, and zero remaining phase shells. The original scene's GPU counters were unchanged; disposed scenes reported zero textures. Geometry counts stayed bounded.
- Browser interaction checks covered tutorial purchase/return focus, dialogue persistence and sound count (60 letters / 60 sounds), silent reveal, settings access, message/evidence separation, archive overflow, campaign call progression, tool pages, tree growth, tooltip ownership, and save-slot clear/restore/switching. The controller baseline passed all 13 navigation checks. Pointer release, blur, and cancellation stopped firing in the input audit.

## Limits and results that are not certified

- **Real-time performance remains inconclusive.** Both test browser surfaces repeatedly delivered roughly one animation frame per second, including while reporting visible/focused. Fresh 6–8-second profiles correctly returned invalid sampling windows. No 60-FPS claim follows from this pass. Controlled rendering above deliberately does not report FPS.
- Short live animation audits therefore did not pass in full: some contact windows received zero samples; the initial live lifecycle run failed to warm enough frames or drain shells before its wall-clock deadline; normal-motion tutorial bounds were sampled mid-entry. Controlled contact rendering resolved the contact failures, and controlled lifecycle rendering passed each cleanup check. A subsequent settled tutorial screenshot and DOM measurement confirmed all glyphs inside the dialogue panel and the panel inside the 1563×912 viewport. No production timing or acceptance threshold was relaxed to hide these results.
- The aggregate controlled lifecycle report still flags **live texture-count variance** in the vault fixture (29–36 allocated before disposal), even though every disposed scene returned to zero textures and the parent scene was unchanged. This does not demonstrate a retained-resource leak, but the strict aggregate live-count check is not certified as passing.
- Native viewport and an 800×600 layout were inspected. At the short viewport the delivery receipt scrolls to Continue; it does not fit entirely above the fold. Browser automation's coordinate mapping became unreliable under viewport override, so pointer results from that override were not treated as game defects.
- This was not a physical-controller hardware lab, a mobile/Safari certification, a multi-hour human soak, or a listening assessment on multiple audio devices. The keyboard modifier and menu-phone guards have source/type verification; the earlier controller baseline predates those guards.

## Repeat the checks

From the repository:

```powershell
npm test
npx tsc --noEmit
npm run build
npm start
node tests/run-major-policies.mjs --all --through=32 --max-minutes=240
```

Open `http://localhost:4173/?qa=1`, start a disposable practice game, and expand **QA · Stress tests**. Select an audit and run it. The new console makes the existing audits available without a browser connector; it is absent from the normal game. Contact and lifecycle console audits use clearly labeled controlled frames; `profile` measures real-time rendering and reports invalid windows explicitly. Some audits pause or replace the practice checkpoint. Reloading that QA page resets its memory-only saves.

The simulator now processes the normal delivery receipt before attempting the next tutorial action. Its previous harness could stall at that transition even while the game UI could continue. Other audit updates align camera expectations with the requested extreme zoom and isolate tutorial focus from stale practice fixtures.

The normal local game is `http://localhost:4173/`.
