# Frozen Assets — major progression overhaul QA

**VERIFIED LOCAL BUILD; BALANCE TARGET DEVIATIONS REMAIN**

Generated 2026-09-09T14:42:02.963Z. Geometry is freshly compiled from the current local workspace; historical simulation and browser data retain their own provenance. This report does not publish the game or read player saves.

## Summary

Fresh audit: 32 deliveries, 69 physical phases, constant 0.30-world-unit cells, 1,936–28,350 samples per phase. 69/69 authored phase budgets pass the stated ±12% tolerance; 0 cargo/solid intersections and 0 initially free cargo items were measured; 0 cargo items have initial exterior exposure.

Selected Mixed run: **53.24 active minutes**, **88.54 modeled experience minutes**. Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final. This is measured engine interaction plus explicitly estimated first-time overhead, not a measured human playthrough.

Target conflict: exact authored delivery bands add to **56.33–63.17 active minutes**, while the overall brief asks for 45–55. The implementation decision is to prioritize the overall measured Mixed 45–55-minute active target and 75–95-minute modeled first-play target; individual delivery bands remain authored intent, with deviations reported rather than hidden by timers or HP multipliers.

Re-run with `node tests/write-major-report.mjs`. Edit [qa-artifacts/major-report-inputs.json](qa-artifacts/major-report-inputs.json) to select final policy files and enter verification/review facts. Do not edit generated tables manually.

## Measurement provenance

| Policy | Input | Stage / source status |
| --- | --- | --- |
| SAVER | [qa-artifacts/major-saver-premium-rev6-full.json](qa-artifacts/major-saver-premium-rev6-full.json) | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| POWER | [qa-artifacts/major-power-first-premium-rev6-full.json](qa-artifacts/major-power-first-premium-rev6-full.json) | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| SPEED | [qa-artifacts/major-speed-first-premium-rev6-full.json](qa-artifacts/major-speed-first-premium-rev6-full.json) | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| CONTROL | [qa-artifacts/major-control-first-premium-rev6-full.json](qa-artifacts/major-control-first-premium-rev6-full.json) | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| TECHNIQUE | [qa-artifacts/major-technique-first-premium-rev6-full.json](qa-artifacts/major-technique-first-premium-rev6-full.json) | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| MIXED | [qa-artifacts/major-mixed-premium-rev6-full.json](qa-artifacts/major-mixed-premium-rev6-full.json) | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| CHEAPEST | [qa-artifacts/major-cheapest-first-premium-rev6-full.json](qa-artifacts/major-cheapest-first-premium-rev6-full.json) | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| INEFFICIENT | [qa-artifacts/major-inefficient-premium-rev6-full.json](qa-artifacts/major-inefficient-premium-rev6-full.json) | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| UPGRADER | [qa-artifacts/major-upgrader-premium-rev6-full.json](qa-artifacts/major-upgrader-premium-rev6-full.json) | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |

All nine policies use the shared simulator, launcher and premium-value helper. Each selected run is checked separately. A run is eligible for the fastest-rational column only when complete, explicitly marked final, integrity checks pass, the original compilation was stable, and all required hashes are present. Full-source matching is preferred. A documented exception is accepted only for overhaul-qa.ts, webmcp.ts or motion-audit.ts when an independently resolved TypeScript graph proves they are outside the model/tutorial simulation, every actual runtime/helper/script/dependency/config hash is still identical, and the qualification records the exact original and current differing hashes. These rows explicitly say simulation dependencies match while browser-QA source differs; the frozen hashes are never rewritten. That column is an observed per-delivery lower envelope, not a single optimal campaign strategy. Missing policies stay Pending. Stored source hashes, qualification evidence, required coverage, assumptions and portable data are in [qa-artifacts/major-report/data.json](qa-artifacts/major-report/data.json).

Selected Mixed overhead assumptions: reading 180 words/minute, at least 1.2 seconds per line, 0.4 seconds per acknowledgement and 1.25 seconds per pickup. Menu opening adds 2.5 seconds; micro/major inspection 4/8 seconds; tool selection 0.8 seconds; quarter-turn 1.2 seconds; receipt/evidence inspection 4/8 seconds. Delivery/inner-phase orientation adds 6/3 seconds. These are modeling assumptions, not delays inserted into gameplay.

Aiming policy: Power/Speed/Saver use direct nearest-support rays. Mixed, Technique and Control inspect visible nearby offsets beside exposed economic cargo with remaining grade premium. Each candidate is charged only the actual rounded grade premium its predicted contact can lose, never authored base money or an already-lost bonus. Loss is normalized by mean phase cargo value. Control considers more offsets and gives preservation greater weight.

Tool choice: Power maximizes predicted useful ice throughput with zero monetary-risk penalty. Speed has a small premium-loss preference; Mixed balances useful work against remaining grade premium, and Control gives that premium greater weight. The predictor uses the current contact horizon and real discrete grade thresholds; it does not infer future tool use or force target completion times.

Purchase policy: Candidates must be the newest tool or account for at least15% of recent work since the newest tool acquisition. Cheapest considers any tool with fresh use. Rank by cost per marginal fitting effect weighted by fresh recent tool use. Focused policies reserve most spending for their primary branch, a secondary branch, and limited first-rank exploration; Mixed has no branch allocation. Purchases stop when all final cargo is free. Complete assumptions and each policy’s inputs remain in the portable JSON.

## Files changed

Compared by SHA-256 against the frozen pre-overhaul snapshot, not against a clean Git checkout. “Absent from snapshot” does not prove a file was newly created in this update.

| Path | Baseline relation |
| --- | --- |
| [app/campaign.css](app/campaign.css) | Absent from frozen hash inventory |
| [app/first-time.css](app/first-time.css) | Absent from frozen hash inventory |
| [app/globals.css](app/globals.css) | Absent from frozen hash inventory |
| [app/landline.css](app/landline.css) | Absent from frozen hash inventory |
| [app/layout.tsx](app/layout.tsx) | Absent from frozen hash inventory |
| [app/major-progression.css](app/major-progression.css) | Absent from frozen hash inventory |
| [app/motion.css](app/motion.css) | Absent from frozen hash inventory |
| [app/page.tsx](app/page.tsx) | Absent from frozen hash inventory |
| [app/polish.css](app/polish.css) | Absent from frozen hash inventory |
| [components/game/condition-cue.tsx](components/game/condition-cue.tsx) | Absent from frozen hash inventory |
| [components/game/custody-tag.tsx](components/game/custody-tag.tsx) | Absent from frozen hash inventory |
| [components/game/delivery-complete.tsx](components/game/delivery-complete.tsx) | Absent from frozen hash inventory |
| [components/game/fitting-drawing.tsx](components/game/fitting-drawing.tsx) | Absent from frozen hash inventory |
| [components/game/incoming-call.tsx](components/game/incoming-call.tsx) | Absent from frozen hash inventory |
| [components/game/menu-header.tsx](components/game/menu-header.tsx) | Absent from frozen hash inventory |
| [components/game/motion.tsx](components/game/motion.tsx) | Absent from frozen hash inventory |
| [components/game/phone-dial.tsx](components/game/phone-dial.tsx) | Absent from frozen hash inventory |
| [components/game/phone.tsx](components/game/phone.tsx) | Absent from frozen hash inventory |
| [components/game/save-menu.tsx](components/game/save-menu.tsx) | Absent from frozen hash inventory |
| [components/game/skill-tree.tsx](components/game/skill-tree.tsx) | Absent from frozen hash inventory |
| [components/game/tactile.tsx](components/game/tactile.tsx) | Absent from frozen hash inventory |
| [components/game/tony-panel.tsx](components/game/tony-panel.tsx) | Absent from frozen hash inventory |
| [components/game/tool-display.tsx](components/game/tool-display.tsx) | Absent from frozen hash inventory |
| [components/game/tool-selector.tsx](components/game/tool-selector.tsx) | Absent from frozen hash inventory |
| [components/game/tutorial-board.tsx](components/game/tutorial-board.tsx) | Absent from frozen hash inventory |
| [components/game/tutorial-debug.tsx](components/game/tutorial-debug.tsx) | Absent from frozen hash inventory |
| [components/game/tutorial-upgrade.tsx](components/game/tutorial-upgrade.tsx) | Absent from frozen hash inventory |
| [components/game/upgrade-glyph.tsx](components/game/upgrade-glyph.tsx) | Absent from frozen hash inventory |
| [components/game/upgrade-map.tsx](components/game/upgrade-map.tsx) | Absent from frozen hash inventory |
| [components/game/zoom-slider.tsx](components/game/zoom-slider.tsx) | Absent from frozen hash inventory |
| [lib/game/audio.ts](lib/game/audio.ts) | Content changed |
| [lib/game/campaign-content.ts](lib/game/campaign-content.ts) | Content changed |
| [lib/game/campaign-layout.ts](lib/game/campaign-layout.ts) | Content changed |
| [lib/game/campaign.ts](lib/game/campaign.ts) | Content changed |
| [lib/game/condition.ts](lib/game/condition.ts) | Absent from frozen hash inventory |
| [lib/game/contracts.ts](lib/game/contracts.ts) | Absent from frozen hash inventory |
| [lib/game/field-save.ts](lib/game/field-save.ts) | Absent from frozen hash inventory |
| [lib/game/ice-grid.ts](lib/game/ice-grid.ts) | Absent from frozen hash inventory |
| [lib/game/ice-renderer.ts](lib/game/ice-renderer.ts) | Absent from frozen hash inventory |
| [lib/game/ice.ts](lib/game/ice.ts) | Content changed |
| [lib/game/legacy-cargo.ts](lib/game/legacy-cargo.ts) | Absent from frozen hash inventory |
| [lib/game/legacy-layouts.ts](lib/game/legacy-layouts.ts) | Absent from frozen hash inventory |
| [lib/game/major-campaign.ts](lib/game/major-campaign.ts) | Absent from frozen hash inventory |
| [lib/game/major-qa.ts](lib/game/major-qa.ts) | Absent from frozen hash inventory |
| [lib/game/major-story.ts](lib/game/major-story.ts) | Absent from frozen hash inventory |
| [lib/game/model.ts](lib/game/model.ts) | Content changed |
| [lib/game/motion-audit.ts](lib/game/motion-audit.ts) | Content changed |
| [lib/game/overhaul-qa.ts](lib/game/overhaul-qa.ts) | Content changed |
| [lib/game/phone-call.ts](lib/game/phone-call.ts) | Absent from frozen hash inventory |
| [lib/game/scene-resources.ts](lib/game/scene-resources.ts) | Absent from frozen hash inventory |
| [lib/game/scene.ts](lib/game/scene.ts) | Content changed |
| [lib/game/tool-affinity.ts](lib/game/tool-affinity.ts) | Absent from frozen hash inventory |
| [lib/game/tool-footprints.ts](lib/game/tool-footprints.ts) | Absent from frozen hash inventory |
| [lib/game/tool-trees.ts](lib/game/tool-trees.ts) | Content changed |
| [lib/game/tuning.ts](lib/game/tuning.ts) | Content changed |
| [lib/game/webmcp.ts](lib/game/webmcp.ts) | Content changed |
| [lib/game/workshop.ts](lib/game/workshop.ts) | Content changed |
| [package-lock.json](package-lock.json) | Absent from frozen hash inventory |
| [package.json](package.json) | Absent from frozen hash inventory |
| [tests/audit-major-purchases.mjs](tests/audit-major-purchases.mjs) | Absent from frozen hash inventory |
| [tests/campaign-story.test.ts](tests/campaign-story.test.ts) | Absent from frozen hash inventory |
| [tests/campaign.test.ts](tests/campaign.test.ts) | Content changed |
| [tests/capture-major-active.mjs](tests/capture-major-active.mjs) | Absent from frozen hash inventory |
| [tests/capture-major-baseline.mjs](tests/capture-major-baseline.mjs) | Absent from frozen hash inventory |
| [tests/cargo-depth.test.ts](tests/cargo-depth.test.ts) | Absent from frozen hash inventory |
| [tests/condition.test.ts](tests/condition.test.ts) | Absent from frozen hash inventory |
| [tests/contracts.test.ts](tests/contracts.test.ts) | Absent from frozen hash inventory |
| [tests/field-save.test.ts](tests/field-save.test.ts) | Absent from frozen hash inventory |
| [tests/game.test.ts](tests/game.test.ts) | Content changed |
| [tests/ice-grid.test.ts](tests/ice-grid.test.ts) | Absent from frozen hash inventory |
| [tests/impact-condition-order.test.ts](tests/impact-condition-order.test.ts) | Absent from frozen hash inventory |
| [tests/landline.test.ts](tests/landline.test.ts) | Content changed |
| [tests/major-contracts.test.ts](tests/major-contracts.test.ts) | Absent from frozen hash inventory |
| [tests/major-migration.test.ts](tests/major-migration.test.ts) | Absent from frozen hash inventory |
| [tests/major-policy-value.mjs](tests/major-policy-value.mjs) | Absent from frozen hash inventory |
| [tests/major-policy-value.test.mjs](tests/major-policy-value.test.mjs) | Absent from frozen hash inventory |
| [tests/major-pricing.test.ts](tests/major-pricing.test.ts) | Absent from frozen hash inventory |
| [tests/major-report-provenance.mjs](tests/major-report-provenance.mjs) | Absent from frozen hash inventory |
| [tests/major-report-provenance.test.mjs](tests/major-report-provenance.test.mjs) | Absent from frozen hash inventory |
| [tests/major-review.test.ts](tests/major-review.test.ts) | Absent from frozen hash inventory |
| [tests/major-save.test.ts](tests/major-save.test.ts) | Absent from frozen hash inventory |
| [tests/major-story.test.ts](tests/major-story.test.ts) | Absent from frozen hash inventory |
| [tests/phone-call.test.ts](tests/phone-call.test.ts) | Absent from frozen hash inventory |
| [tests/plot-major-report.py](tests/plot-major-report.py) | Absent from frozen hash inventory |
| [tests/polish.test.ts](tests/polish.test.ts) | Content changed |
| [tests/probe-major-aim.mjs](tests/probe-major-aim.mjs) | Absent from frozen hash inventory |
| [tests/run-major-policies.mjs](tests/run-major-policies.mjs) | Absent from frozen hash inventory |
| [tests/run.mjs](tests/run.mjs) | Content changed |
| [tests/scene-resources.test.ts](tests/scene-resources.test.ts) | Absent from frozen hash inventory |
| [tests/simulate-major.mjs](tests/simulate-major.mjs) | Absent from frozen hash inventory |
| [tests/story-editorial.test.ts](tests/story-editorial.test.ts) | Absent from frozen hash inventory |
| [tests/summarize-major.mjs](tests/summarize-major.mjs) | Absent from frozen hash inventory |
| [tests/thermal-fan.test.ts](tests/thermal-fan.test.ts) | Absent from frozen hash inventory |
| [tests/tutorial.test.ts](tests/tutorial.test.ts) | Content changed |
| [tests/vault-layout.test.ts](tests/vault-layout.test.ts) | Absent from frozen hash inventory |
| [tests/write-major-report.mjs](tests/write-major-report.mjs) | Absent from frozen hash inventory |
| [tsconfig.json](tsconfig.json) | Absent from frozen hash inventory |


## Bugs fixed

- D19 authored Tower generation is independent of the legacy final-round shortcut; explicit historical layouts preserve old coordinates only for migration.
- Physical evidence pockets carve the authoritative field; visible local restraints and release use that same field. Local release is checked on each edited revision while global connectivity is throttled.
- Late deliveries retain authored phase counts; the blanket late-game phase deletion is removed.
- Scene-owned geometry, textures, listeners, canvas, context and RAF have explicit teardown; chunk replacement disposes obsolete owned geometry.
- Legacy campaign saves enter the new field format. Safe world-space cuts transfer; unsafe mappings restart only current physical ice while preserving account state and canonical paid identities.
- Exact authored net payouts account for floor-rounded commission. Optional contract bonuses require valid measurements and cannot reduce base payouts.
- Introductory material lessons use a thin D5 divider and small D8 anchors; later archives retain full ribs.
- Vault cargo is tied to its physical structure: dense center-seam targets, alternating archive/service compartments, real front ice, separate custody cases and a lower rear Ledger compartment. Existing reward IDs, counts and each base value are preserved.
- Wide Thermal Fan now uses an oblate brush aligned to the ice surface. Its lateral spread no longer implies spherical penetration; Precision, legacy/tutorial tools and delayed echoes retain their established behavior.
- Condition checks after mechanical excavation include objects exposed and released by the same impact. Sealed cargo still requires real exterior exposure before collateral damage can activate.
- Save quantization maps an exact density of 0.5 toward air, preserving the strict visible-solid threshold through repeated reloads instead of recreating a cut support.
- Obsolete Ledger exposure advice is retired after recovery, evidence inspection is saved, institutional callers have a distinct incoming signal, and completed legacy saves can reach their missing epilogue and contracts without replaying fees.
- UI receipt/tag spacing fixes are recorded in the isolated browser review. Final full-game hover, motion and audio acceptance remains separately tracked.

## Ice architecture

Every phase owns its dimensions, profile,0.30 cell size, layout hash, material regions and sample arrays. Empty boundary samples isolate the generated surface. Safe six-neighbor traversal does not wrap between rows. Materials independently affect hardness, fracture ease, support strength and thermal conductivity. World-space cargo fits inside actual small cavities.

Largest authored field: D32/P1, 42×27×25 =28,350 samples; 387.6KiB for density, warmth, material IDs, visited marks and connectivity queue. Point numeric payload is another 664.5KiB before JS object/array overhead. These are buffer calculations, not a measured process-memory total. Mesh and GPU storage are additional.

## Chunk architecture

Extraction divides scalar cells into 8×8×8 chunks with shared boundary samples. Edited samples dirty every extraction chunk that depends on them. Impact/distance priority and a cooperative 2.5 ms rebuild budget amortize large meshes; one indivisible chunk can exceed the budget. Root raycasts delegate to chunk meshes. Full extraction remains available for headless validation.

The fresh largest field has 72 chunks and 40,400 initial triangles. Appendix CPU extraction timings are one headless full-surface call per phase, not frame times or GPU measurements.

## Save migration

Save v5 records compact byte-quantized RLE/base64 density plus dimensions, cell size, delivery/phase identity, layout hash and checksum. Invalid field data falls back only to current ice after valid account state is restored. Exact density 0.5 encodes to 127/255 (air), so a saved cut cannot become solid again at the strict isosurface boundary.

Campaign v3/v4 and compact historical-layout saves reconstruct the original 4,830-coordinate field, then resample removed ice in world space if profile, bounds and coverage are compatible. Unsafe geometry or density triggers an explicit diagnostic and repacks canonical old cargo for the active phase. Canonical IDs and base values avoid re-paying previously credited cargo. A validated legacyCargo marker expires when that physical cargo array is replaced. Missing mandatory evidence is appended once; the old Ledger phase maps to the new final cradle. Repeated save/reload quantization is idempotent. Vault-only cargo revisions leave unrelated active-field hashes unchanged and preserve every existing Vault reward allocation.

Focused coverage: [tests/major-migration.test.ts](tests/major-migration.test.ts), [tests/major-save.test.ts](tests/major-save.test.ts), [tests/field-save.test.ts](tests/field-save.test.ts), [tests/vault-layout.test.ts](tests/vault-layout.test.ts).

## Baseline comparison

| Measure | Frozen baseline | Current geometry / selected Mixed |
| --- | --- | --- |
| Save / layout | 4 / 2 | 5 / 3 |
| Grid | 23×14×15 =4,830 every phase | Variable; largest 42×27×25 =28,350 |
| Physical phases | 89 | 69 |
| Mixed active minutes | 76.48 | 53.24 |
| Mixed modeled experience minutes | 88.41 | 88.54 |
| Validation | 95 baseline tests; build passed | 243 passed / 0 failed; qa-artifacts/major-verification-tests.log |

Timing comparability is limited by changed targeting, authored geometry, tool behavior, Condition and explicit first-time overhead. The frozen baseline active replay counts playing/aim/cadence while cargo remains embedded. Charts expose both records; they do not assert a controlled human A/B test.

![Physical volume by delivery](qa-artifacts/major-report/physical-volume.svg)

## Campaign table

Dimensions, grid, sample count and material percentages describe the **first physical phase**; solid also shows the sum across all phases. The appendix contains every phase. “Mixed” is the selected run above, even if stale; authored and measured values are distinct.

| # / chapter / name | Profile | Dimensions | Grid | Samples | Solid first / all | Materials % | Phases | Base net | Mixed active s | Fastest rational s | Ideal tools by phase | Story |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 / 1 / First claim | parcel | 4.4×2.6×2.4 | 18×12×11 | 2,376 | 828 / 828 | clear 100% | 1 | $250 | 33.8 | 32.8 (cheapest) | hand/pick | — |
| 2 / 1 / Petty cash | parcel | 4.8×2.8×2.5 | 19×13×12 | 2,964 | 1,146 / 1,146 | clear 86%; brittle 14% | 1 | $350 | 31.1 | 30.8 (cheapest) | hand/pick | — |
| 3 / 1 / Personal effects | slab | 5.2×3×2.8 | 21×13×13 | 3,549 | 1,312 / 1,312 | clear 100% | 1 | $500 | 51.1 | 51.1 (mixed) | pick | — |
| 4 / 1 / Counter deposit | tower | 5.4×3.6×3 | 22×15×13 | 4,290 | 1,737 / 1,737 | clear 100% | 1 | $700 | 58.6 | 58.6 (mixed) | pick/heavy | — |
| 5 / 1 / Wrong account | archive | 5.8×3.8×3.2 | 23×16×14 | 5,152 | 2,071 / 2,860 | clear 94.7%; reinforced 5.3% | 2 | $950 | 93.2 | 93.2 (mixed) | breaker/thermal → hand/pick | tag |
| 6 / 2 / Pooled custody | slab | 5.9×3.7×3.3 | 23×16×14 | 5,152 | 2,060 / 2,060 | clear 100% | 1 | $1,200 | 70.7 | 51.5 (technique) | pick | — |
| 7 / 2 / Maintenance lot | seam | 6.2×4×3.5 | 24×17×15 | 6,120 | 2,792 / 3,737 | clear 83.1%; dense 16.9% | 2 | $1,400 | 128.1 | 74.7 (speed) | heavy/breaker → breaker/thermal | — |
| 8 / 2 / Estate effects | wings | 6.4×4×3.6 | 25×17×15 | 6,375 | 2,584 / 3,676 | clear 37.8%; brittle 56.6%; reinforced 5.6% | 2 | $1,600 | 62.3 | 53.5 (speed) | sledge/heavy → pick/heavy | ring |
| 9 / 2 / Mixed identifiers | tower | 6.6×4.3×3.8 | 25×18×16 | 7,200 | 3,465 / 4,754 | clear 80.3%; dense 19.7% | 2 | $1,800 | 86.3 | 86.3 (mixed) | pick/heavy → breaker/thermal | — |
| 10 / 2 / Sealed cash | archive | 6.8×4.5×4 | 26×18×17 | 7,956 | 3,471 / 5,055 | clear 63.7%; reinforced 36.3% | 2 | $2,100 | 86.8 | 86.8 (mixed) | breaker/thermal → hand/pick | — |
| 11 / 2 / Internal review | seam | 7×4.6×4.1 | 27×19×17 | 8,721 | 4,448 / 6,564 | clear 80.7%; dense 19.3% | 3 | $2,400 | 122.2 | 114.7 (power) | heavy/breaker → breaker/thermal → hand/pick | hold |
| 12 / 3 / Inventory variance | slab | 6.9×4.5×4 | 27×18×17 | 8,262 | 3,896 / 3,896 | clear 100% | 1 | $2,600 | 66.8 | 63.7 (upgrader) | pick | — |
| 13 / 3 / Emergency access | wings | 7.3×4.8×4.2 | 28×19×18 | 9,576 | 3,984 / 5,925 | clear 10.2%; brittle 61.1%; reinforced 28.7% | 2 | $2,900 | 70.2 | 70 (cheapest) | sledge/heavy → pick/heavy | — |
| 14 / 3 / Bearer instruments | tower | 7.6×5×4.4 | 29×20×18 | 10,440 | 5,380 / 7,273 | clear 77.7%; dense 22.3% | 2 | $3,200 | 130.8 | 109.5 (cheapest) | pick/heavy → breaker/thermal | — |
| 15 / 3 / Exception inventory | archive | 7.9×5×4.6 | 30×20×19 | 11,400 | 5,365 / 8,714 | clear 57.2%; reinforced 42.8% | 3 | $3,500 | 133.2 | 130.9 (saver) | breaker/thermal → heavy/breaker → hand/pick | — |
| 16 / 3 / Brittle annex | wings | 8.1×5.2×4.8 | 30×21×19 | 11,970 | 5,575 / 8,204 | clear 18%; brittle 55.3%; reinforced 26.7% | 2 | $3,900 | 86.8 | 86.8 (mixed) | sledge/heavy → pick/heavy | — |
| 17 / 3 / Withheld release | seam | 8.3×5.2×4.9 | 31×21×20 | 13,020 | 7,191 / 10,899 | clear 85.4%; dense 14.6% | 3 | $4,300 | 121.7 | 121.7 (mixed) | heavy/breaker → breaker/thermal → hand/pick | — |
| 18 / 3 / Exception 7C | archive | 8.5×5.4×5 | 32×22×20 | 14,080 | 6,519 / 10,698 | clear 42.1%; dense 28%; reinforced 30% | 3 | $4,800 | 103.5 | 103.5 (mixed) | breaker/thermal → heavy/breaker → hand/pick | log |
| 19 / 4 / Downstairs equipment | tower | 8.2×5.1×4.8 | 31×20×19 | 11,780 | 6,300 / 6,300 | clear 50.4%; brittle 49.6% | 1 | $5,000 | 65 | 65 (mixed) | pick/heavy | — |
| 20 / 4 / Service channel | seam | 8.6×5.4×5 | 32×22×20 | 14,080 | 7,551 / 10,173 | clear 81.5%; dense 18.5% | 2 | $5,400 | 115 | 103.3 (speed) | heavy/breaker → breaker/thermal | — |
| 21 / 4 / Preservation machinery | wings | 8.9×5.6×5.1 | 33×22×20 | 14,520 | 7,063 / 10,399 | clear 16.1%; brittle 56.3%; reinforced 27.6% | 2 | $5,800 | 94.3 | 83.5 (speed) | sledge/heavy → pick/heavy | — |
| 22 / 4 / Thermal service | archive | 9.1×5.7×5.2 | 34×22×21 | 15,708 | 8,121 / 12,905 | clear 28.5%; reinforced 24.2%; service 47.3% | 3 | $6,300 | 112.3 | 100 (technique) | breaker/thermal → heavy/breaker → thermal/breaker | — |
| 23 / 4 / Unreleased holdings | slab | 9.3×5.9×5.4 | 35×23×22 | 17,710 | 9,757 / 13,172 | clear 83.8%; dense 16.2% | 2 | $6,800 | 103.6 | 85.5 (upgrader) | pick → breaker/thermal | — |
| 24 / 4 / Liability archive | archive | 9.6×6×5.5 | 35×23×22 | 17,710 | 9,435 / 14,727 | clear 56.3%; reinforced 43.7% | 3 | $7,400 | 96.7 | 94 (technique) | breaker/thermal → heavy/breaker → thermal/breaker | — |
| 25 / 4 / The remaining route | seam | 9.8×6.2×5.6 | 36×24×22 | 19,008 | 11,479 / 16,886 | clear 83.9%; dense 16.1% | 3 | $8,200 | 129 | 104.8 (speed) | heavy/breaker → breaker/thermal → thermal/breaker | access |
| 26 / 5 / Sublevel B intake | tower | 9.2×5.7×5.2 | 34×22×21 | 15,708 | 8,921 / 8,921 | clear 50%; brittle 50% | 1 | $8,500 | 77.8 | 43.6 (technique) | pick/heavy | — |
| 27 / 5 / Prestige custody | wings | 9.7×6×5.5 | 36×23×22 | 18,216 | 9,435 / 13,425 | clear 14.2%; brittle 56.8%; reinforced 29.1% | 2 | $9,300 | 113 | 58.2 (technique) | sledge/heavy → pick/heavy | — |
| 28 / 5 / Manual clearance | seam | 10×6.2×5.6 | 37×24×22 | 19,536 | 11,759 / 15,863 | clear 46.3%; dense 10%; service 43.8% | 2 | $10,200 | 112 | 71.7 (technique) | heavy/breaker → breaker/thermal | — |
| 29 / 5 / Master records | archive | 10.3×6.4×5.8 | 38×25×23 | 21,850 | 11,777 / 18,549 | clear 27.2%; reinforced 18.9%; service 53.9% | 3 | $11,200 | 108.3 | 63.4 (technique) | thermal/breaker → thermal/breaker → thermal/breaker | — |
| 30 / 5 / Last holdings | slab | 10.6×6.6×6 | 39×25×23 | 22,425 | 13,040 / 20,278 | clear 82.6%; dense 17.4% | 3 | $12,300 | 130.3 | 69.7 (technique) | pick → heavy/breaker → thermal/breaker | — |
| 31 / 5 / Archive antechamber | wings | 11×7×6.4 | 40×27×25 | 27,000 | 15,091 / 22,855 | clear 19.3%; brittle 54.8%; reinforced 25.9% | 3 | $13,600 | 114.5 | 66.1 (technique) | sledge/heavy → breaker/thermal → thermal/breaker | — |
| 32 / 5 / The Vault | vault | 11.5×7.2×6.6 | 42×27×25 | 28,350 | 15,592 / 67,334 | clear 18.7%; brittle 57.2%; reinforced 24.1% | 5 | $22,000 | 286 | 248.8 (saver) | sledge/heavy → heavy/breaker → breaker/heavy → thermal/breaker → pick/hand/thermal | ledger |

![Active ice duration](qa-artifacts/major-report/active-time.svg)

## Economy table and tool purchase timings

Current prices are authored content; paid prices and purchase timings come from the selected Mixed run. Differences are retained to expose stale measurements. Experience minute includes explicit overhead; active minute excludes it. Nodes are reconstructed from purchase events at or before the tool purchase.

| Tool | Reveal D | Current price | Observed reveal D | Purchase D | Experience min / active min | Paid price | Before / after | Nodes owned |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Ice pick | 5 | $2,500 | 5 | 7 | 14.46 / 7.16 | $2,500 | $2,511 / $11 | 16 |
| Heavy pick | 10 | $6,500 | 10 | 12 | 27.17 / 14.85 | $6,500 | $7,028 / $528 | 29 |
| Sledgehammer | 17 | $22,000 | 17 | 21 | 49.36 / 29.79 | $22,000 | $22,383 / $383 | 46 |
| Powered breaker | 24 | $35,000 | 24 | 28 | 67.4 / 41.01 | $35,000 | $36,083 / $1,083 | 58 |
| Thermal tool | 28 | $45,000 | 28 | 31 | 79.84 / 47.99 | $45,000 | $45,440 / $440 | 60 |

Every current base pool was run through Campaign.credit with the authored 12%/8% schedule and final 0% expectation: 32/32 net targets match exactly. Final 0% in actual play is granted by the recovered Ledger call, not by this arithmetic audit.

![Major tool purchase timings](qa-artifacts/major-report/tool-purchases.svg)

![Funds by delivery](qa-artifacts/major-report/money.svg)

## Tool identity in the final chapter

These are authored tool roles. Actual policy usage is recorded above; human comparative feel remains unmeasured.

| Tool | Why use it late in the campaign? |
| --- | --- |
| Chisel | Finish fine extraction around valuable exposed cargo with the lowest collateral impact. |
| Ice pick | Work quickly and precisely across general ice and broad slab faces. |
| Heavy pick | Penetrate deep dense seams and load-bearing connections. |
| Sledgehammer | Break brittle wings and shared supports with broad controlled fracture. |
| Powered breaker | Sustain clearing through reinforced archive ribs and layered compartments. |
| Thermal tool | Exploit service-ice conductivity and controlled extraction, while protecting heat-sensitive paper. |


## Policy results

| Policy | Campaign modeled min | Active min | Final money | Condition bonus / base | Nodes | Major tools purchased | Midgame Jaccard vs Mixed | State |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SAVER | 86.9 | 52.2 | $5,689 | 12.69% | 68 | pick, heavy, sledge, breaker, thermal | 0.913 | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| POWER | 82.36 | 52.87 | $2,735 | 12.41% | 54 | pick, heavy, sledge, breaker, thermal | 0.681 | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| SPEED | 80.32 | 51.17 | $2,824 | 13.04% | 53 | pick, heavy, sledge, breaker, thermal | 0.612 | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| CONTROL | 87.83 | 54.7 | $8,189 | 13.04% | 44 | pick, heavy, sledge, breaker, thermal | 0.489 | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| TECHNIQUE | 80.6 | 49.37 | $7,085 | 11.4% | 44 | pick, heavy, sledge, breaker, thermal | 0.438 | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| MIXED | 88.54 | 53.24 | $4,084 | 12.48% | 70 | pick, heavy, sledge, breaker, thermal | 1 | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| CHEAPEST | 88.87 | 52.72 | $4,384 | 13.04% | 73 | pick, heavy, sledge, breaker, thermal | 0.9 | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| INEFFICIENT | 92.36 | 60.41 | $4,598 | 12.24% | 68 | pick, heavy, sledge, breaker, thermal | 0.913 | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |
| UPGRADER | 89.89 | 53.6 | $2,367 | 12.39% | 72 | pick, heavy, sledge, breaker, thermal | 0.979 | Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final |

Jaccard compares each run’s recorded midgame node set with Mixed; snapshot delivery is included in the CSV. Different midgame definitions would invalidate direct comparison. A low score alone does not establish balanced strategy diversity.

| Measured target | Observed | Requested band | Result |
| --- | --- | --- | --- |
| Mixed active minutes | 53.24 | 45–55 | Within target |
| Mixed modeled experience minutes | 88.54 | 75–95 | Within target |
| Rational modeled-time spread % | 11.91 | 8–20 | Within target |
| Rational earned-net / modeled-minute spread % | 12.57 | 10–15 | Within target |
| Rational ending-wallet spread % | 245.97 | 5–15 | Outside target |
| Power Condition bonus / base % | 12.41 | 5–9 | Outside target |
| Mixed Condition bonus / base % | 12.48 | 8–13 | Within target |
| Control Condition bonus / base % | 13.04 | 12–18 | Within target |
| Mixed Vault active seconds | 286 | 330–420 | Outside target |
| Mixed Ledger-cradle active seconds | 53.05 | 60–90 | Outside target |

Spread is (maximum−minimum)/minimum across the 8/8 eligible rational-policy runs; the inefficient strategy is excluded. Earned net per modeled minute uses cumulative earnings after commission, before equipment spending. Ending wallet is unspent money after purchases and can diverge substantially when policies buy different builds. Dominance test (>20% faster and >15% richer than every other rational strategy): no qualifying strategy in this measured cohort. This does not prove global optimality.

| Policy | Longest active purchase gap s | Longest no-affordable-opportunity s |
| --- | --- | --- |
| SAVER | 454.1 | 42 |
| POWER | 535.2 | 30 |
| SPEED | 569.5 | 23 |
| CONTROL | 716 | 19 |
| TECHNIQUE | 680.6 | 23 |
| MIXED | 336.9 | 167 |
| CHEAPEST | 395.6 | 166 |
| INEFFICIENT | 515.5 | 58 |
| UPGRADER | 435.3 | 166 |


## Condition results

Condition adds a bonus; authored base value is never reduced. Grade bands are Pristine≥90, Clean≥75, Fair≥55, Recovered below55, with 20%/12%/5%/0% bonuses. Story evidence has no quality-based loss.

| Policy | Mean condition | Pristine count | Base payout | Condition bonus | Bonus / base |
| --- | --- | --- | --- | --- | --- |
| SAVER | 72.55 | 141 | $185,006 | $23,474 | 12.69% |
| POWER | 71.69 | 136 | $185,006 | $22,955 | 12.41% |
| SPEED | 72.64 | 140 | $185,006 | $24,118 | 13.04% |
| CONTROL | 76.6 | 144 | $185,006 | $24,133 | 13.04% |
| TECHNIQUE | 71.85 | 122 | $185,006 | $21,088 | 11.4% |
| MIXED | 72.51 | 143 | $185,006 | $23,086 | 12.48% |
| CHEAPEST | 74.46 | 150 | $185,006 | $24,133 | 13.04% |
| INEFFICIENT | 69.86 | 139 | $185,006 | $22,648 | 12.24% |
| UPGRADER | 72.86 | 141 | $185,006 | $22,914 | 12.39% |

![Condition distributions](qa-artifacts/major-report/condition.svg)

## Performance results

Campaign work-window measurements are recorded separately from initial geometry. Grid/chunk/triangle counts below are freshly generated headless counts; they are not browser draw calls or live geometry allocations.

| Test | Grid | Samples | Chunks | Initial triangles | Frame p50 ms | p95 ms | Worst ms | Mesh ms | Connectivity ms | Geometry count |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EARLY | 18×12×11 | 2,376 | 12 | 5,072 | 4.2 | 4.3 | 20.9 | 1.25 | 0.09 | 245 |
| MID | 30×20×19 | 11,400 | 36 | 23,972 | 4.2 | 8.5 | 29.2 | 2.38 | 0.57 | 311 |
| LATE | 40×27×25 | 27,000 | 60 | 37,316 | 8.2 | 12.6 | 41.6 | 1.97 | 1.71 | 327 |
| VAULT | 42×27×25 | 28,350 | 72 | 40,400 | 4.2 | 8.4 | 20.7 | 2.49 | 1.93 | 323 |

Recorded foundation fixtures, before final gameplay calibration:

| Fixture | Samples/chunks | Tool / duration | Solid removed | p50/p95/max ms | Mesh mean/p95 ms | Connectivity mean/p95 ms | Dirty after |
| --- | --- | --- | --- | --- | --- | --- | --- |
| small | 2,376 / 12 | pick / 6s | 619 | 4.2 / 4.3 / 29.2 | 2.26 / 3.3 | 0.26 / 0.6 | 0 |
| large | 27,000 / 60 | developed breaker / 8s | 9,409 | 4.2 / 4.3 / 8.4 | 2.08 / 3.4 | 1.2 / 2.2 | 0 |

Foundation lifecycle: 20/20 recorded scene replacements passed, with parent geometry/textures {"geometries":271,"textures":24,"programs":15} →{"geometries":271,"textures":24,"programs":15}. Engineering fixtures, not campaign balance. One fast desktop/browser/viewport. Initial warmup is separate from sustained interaction. 2.5ms is a cooperative mesh budget; one indivisible chunk may overrun it. Large fixture exposed legacy tray scale; physical-dimension scale correction followed this build.

Method: Visible in-app browser tab 8, isolated ?qa=1. Fresh real RAF windows with normal tool input and live surface raycasts; not historic rolling frame statistics.. [qa-artifacts/major-foundation-browser.json](qa-artifacts/major-foundation-browser.json).

## Story event order

Authored triggers/prerequisites are shown separately from observed first-call order in selected Mixed. Retired historical lines are excluded. Blank observed order means that run did not record the event; it does not establish a missing event bug by itself.

| Event | Ch. / D / P | Speaker | Trigger / evidence | Read prerequisites | Effect | Observed order |
| --- | --- | --- | --- | --- | --- | --- |
| equipment.pick | 1 / 5 / — | tony | BLOCK_START | — | — | 3 |
| equipment.heavy | 2 / 10 / — | tony | BLOCK_START | — | — | 9 |
| equipment.sledge | 3 / 17 / — | tony | BLOCK_START | — | — | 14 |
| equipment.breaker | 4 / 24 / — | tony | BLOCK_START | — | — | 21 |
| equipment.thermal | 5 / 28 / — | tony | BLOCK_START | — | — | 26 |
| ch1.intro | 1 / — / — | tony | GAME_START | — | — | Unrecorded |
| ch1.more | 1 / 3 / — | tony | BLOCK_START | — | — | 2 |
| ch1.tag | 1 / — / — | tony | STORY_REWARD_RECOVERED / tag | — | — | 4 |
| ch2.pool | 2 / 6 / — | tony | BLOCK_START | — | — | 5 |
| ch2.accounts | 2 / 9 / — | tony | BLOCK_START | — | — | 8 |
| ch2.internal | 2 / — / — | tony | STORY_REWARD_RECOVERED / hold | — | — | 10 |
| ch3.log | 3 / — / — | tony | STORY_REWARD_RECOVERED / log | — | — | 15 |
| ch3.cut | 3 / — / — | tony | STORY_REWARD_RECOVERED / log | tony.mercer.exception | {"commission":8,"flag":"commission.reviewed"} | 18 |
| ch4.monitored | 4 / 19 / — | tony | BLOCK_START | — | — | 19 |
| ch4.breaker | 4 / — / — | tony | TOOL_UNLOCK | — | — | 27 |
| ch4.thermal | 4 / — / — | tony | TOOL_UNLOCK | — | — | 29 |
| ch4.route | 4 / — / — | tony | STORY_REWARD_RECOVERED / access | — | — | 22 |
| ch5.intake | 5 / 26 / — | tony | BLOCK_START | — | — | 25 |
| ch5.final | 5 / 32 / 1 | tony | BLOCK_START | — | — | 31 |
| ch5.exposed | 5 / 32 / 5 | tony | FINAL_LEDGER_EXPOSED | — | — | Unrecorded |
| ch5.recovered | 5 / — / — | tony | FINAL_LEDGER_RECOVERED | — | {"commission":0,"flag":"ledger.copied"} | 34 |
| ch5.notice | 5 / — / — | bank | CAMPAIGN_COMPLETE | — | — | 35 |
| epilogue | 5 / — / — | tony | CAMPAIGN_COMPLETE | — | "ending" | 36 |
| handling.hand | 1 / 1 / — | tony | BLOCK_START | — | — | 1 |
| handling.pick | 2 / — / — | tony | TOOL_UNLOCK | — | — | 6 |
| handling.heavy | 3 / — / — | tony | TOOL_UNLOCK | — | — | 13 |
| handling.sledge | 3 / — / — | tony | TOOL_UNLOCK | — | — | 20 |
| handling.breaker | 4 / — / — | tony | TOOL_UNLOCK | — | — | 28 |
| handling.thermal | 5 / — / — | tony | TOOL_UNLOCK | — | — | 30 |
| ch2.ring | 2 / — / — | tony | STORY_REWARD_RECOVERED / ring | — | — | 7 |
| mercer.first | 3 / — / — | mercer | STORY_REWARD_RECOVERED / hold | ch2.internal | — | 11 |
| tony.mercer.first | 3 / — / — | tony | STORY_REWARD_RECOVERED / hold | mercer.first | — | 12 |
| mercer.exception | 3 / — / — | mercer | STORY_REWARD_RECOVERED / log | ch3.log | — | 16 |
| tony.mercer.exception | 3 / — / — | tony | STORY_REWARD_RECOVERED / log | mercer.exception | — | 17 |
| mercer.access | 4 / — / — | mercer | STORY_REWARD_RECOVERED / access | ch4.route | — | 23 |
| tony.mercer.access | 4 / — / — | tony | STORY_REWARD_RECOVERED / access | mercer.access | — | 24 |
| mercer.offer | 5 / 32 / 3 | mercer | FINAL_LAYER_OPENED | — | — | 32 |
| tony.mercer.offer | 5 / 32 / 3 | tony | FINAL_LAYER_OPENED | mercer.offer | — | 33 |


## Six required review passes

### 1. Ice progression and physical recovery

**All 69 phase budgets/containment checks and 31 focused foundation/Vault tests pass; final nine-policy pacing measured**

Finding: D19 borrowed the legacy final-round shape; late deliveries lost a phase; D5/D8 reinforcement exceeded the intended introductory lesson. Vault rewards initially bypassed the dense seam or shared a shallow rear plane, and its Ledger sat outside the dense collar. Exact authored delivery bands sum to 56.3–63.2 minutes, contradicting the overall 45–55 minute target.

Change: Data-driven fields keep 0.30-unit cells across 69 phases; D19 legacy coupling and removed late phases are corrected. D5 has a thin divider and D8 localized anchors. Vault cargo occupies real separate compartments, including thirteen visible custody cases and a full 2.6×0.4×1.8 Ledger in a lower rear dense cradle. P5 revision 6 is 9.6×5.9×5.75 with 11,417 solids, smaller on every axis and in solid count than P4. Existing IDs/counts/individual base values and P1–4 hashes remain unchanged. No extra HP, release delay, all-ice gate or timer was added.

Evidence: tests/ice-grid.test.ts; tests/cargo-depth.test.ts; tests/vault-layout.test.ts; tests/major-review.test.ts; qa-artifacts/major-vault-cases-review.json; qa-artifacts/major-p5-physical-probe-summary.json; qa-artifacts/major-ledger-cradle-review.json; qa-artifacts/major-nine-premium-rev6-summary.json

Remaining: Mixed reaches 53.24 active/88.54 modeled minutes, but Vault 286 s misses 330–420 and P5 actual full-run 53.05 s misses 60–90. The isolated fixed-loadout 60.65 s probe is not substituted for full campaign timing. Authored delivery bands conflict with the overall active target; human pacing remains unmeasured.

### 2. Economy, Condition and meaningful purchases

**Final nine-policy accounting, acquisition, purchase-use and Condition results recorded**

Finding: Round-to-nearest gross conversion overpaid 14 authored net targets by $1. Missing optional-contract measurements could award bonuses; restored settlement could duplicate an objective reward. Very cheap early trees reduced spending choices. Mechanical hits that exposed and freed cargo in one update could skip Condition damage.

Change: Floor-inverted commission pays exact authored base net. Optional contracts require valid measurements, Continue advances once, and settled IDs prevent duplicate rewards. Non-Chisel price curves start 30% into their existing bands while retaining caps/effects and the $25 HC-S1. Mechanical hits apply Condition to newly exposed cargo before local release freezes its value; sealed cargo remains protected. The final coefficient is 60 with existing exposure thresholds, sensitivities, grade premiums and guaranteed base retained. Policies score actual occupied material/footprint work and the discrete Condition premium at risk, reserve focused branches, refresh tool use and stop useless final purchases. All nine runs finish 32 deliveries/69 phases with six integrity checks passing. Mixed owns 70 nodes, Power 54 and Control 44. Focused midgame Jaccard versus Mixed is 0.68 Power,0.61 Speed,0.49 Control and 0.44 Technique. Every purchased upgrade has associated tool work within 90 active seconds and later in the campaign; this proves use, not a counterfactual speed gain.

Evidence: tests/major-review.test.ts; tests/major-pricing.test.ts; tests/major-contracts.test.ts; tests/condition.test.ts; tests/impact-condition-order.test.ts; qa-artifacts/major-contracts-review-pass.json; qa-artifacts/major-condition-value-case-comparison.json; qa-artifacts/major-node-price-calibration.json; qa-artifacts/major-condition-scale60-pilot.json; qa-artifacts/major-accepted-tests.log; tests/major-policy-value.mjs; qa-artifacts/major-nine-premium-rev6-summary.json; qa-artifacts/major-purchase-use-premium-rev6-audit.json

Remaining: Power 12.41%Condition bonus exceeds destructive 5–9%intent; Mixed 12.48%andControl 13.04%meet their bands. Ending-wallet spread is much larger than 5–15%because builds spend differently. Mixed maximum micro-purchase gap 654.5 active seconds remains a pacing limitation despite 19.75 s median. No universal strategy optimality or human profitability claim.

### 3. Tool identity and physical footprints

**Footprint/held-contact regressions pass and final policy tool work is measured**

Finding: Global scaling blurred mechanical tool roles. Wide Thermal Fan used a sphere, so additional width also gave excessive depth. Sealed-pocket aiming let broad tools appear harmless in some previous pilots. A held Fan hit could erase its own density gradient, after which a zero normal silently restored spherical depth.

Change: New-grid world-unit footprints and material responses distinguish tool work. Fan is an oblate active brush aligned to the field normal, including its active heat pulse; lateral reach and depth are separate. Precision and all legacy/tutorial behavior remain unchanged, as do residual heat and delayed echoes. Simulator scoring uses the same footprint/material calculation rather than only advertised radius. Fan now retains a valid normal for the same field/contact and resets on stop, no-hit or changed field/contact. A new contact with no valid normal gets no direct Fan heat. In the real 20-second held-contact regression, deep ice fell from 1 to 0 before the fix and remains 1 after it.

Evidence: tests/thermal-fan.test.ts; tests/ice-grid.test.ts; lib/game/tool-footprints.ts; lib/game/tool-affinity.ts; tests/simulate-major.mjs; qa-artifacts/major-fan-held-normal-review.json; qa-artifacts/major-accepted-tests.log

Remaining: Mixed still favors Heavy Pick for 1,137.4 active seconds and Precision Thermal for late recovery. Full-run P5 is 53.05 s, below 60–90 intent. Story evidence cannot lose its guaranteed narrative reward, so the large Ledger itself does not impose paper-loss pressure; precision finishing identity remains a content tension. Human comparative feel/audio remain unmeasured.

### 4. Story, evidence and ending continuity

**Story/read-save/phone regressions, all-nine event traces, native call acknowledgements and ending/contract state fixture checked**

Finding: Unread Ledger exposure advice could play after recovery. Optional evidence inspection was not persisted. Incoming institutional calls used the generic ring. Completed imported saves could lack a playable epilogue or remain blocked by impossible historical prerequisites.

Change: Recovered Ledger retires only obsolete unread advice; read history remains. Unique evidence-inspection IDs persist independently of required story progress. Shared caller resolution gives Mercer/Bellwether an institutional PBX signal and identity while retaining Tony’s line. Completed imports ensure one missing epilogue without replaying recovery or commission effects; legacy-only impossible prerequisites cannot hide the ending. Required Ring, four Mercer arcs, physical Ledger landing, call acknowledgements, final fee waiver and contract continuation have focused real-model coverage. Parent used nativeP/Return for Mercer’s two lines and Tony’s four final lines; the cut changed 8%to 0%after the last acknowledgement before the receipt. Final receipt showed 600 base+120 Condition=720 gross,0 cut,720 net without overflow. The corrected ending state fixture completes 32 deliveries, dismisses the tool notice, plays the epilogue and enters Recovery Contracts through the native button; its first optional 4-pristine bonus is 1696.

Evidence: qa-artifacts/major-story-editorial-review.json; tests/story-editorial.test.ts; tests/phone-call.test.ts; tests/campaign-story.test.ts; tests/major-save.test.ts; qa-artifacts/major-accepted-tests.log

Remaining: The ending check seeds QA state and is not a manual 32-delivery playthrough. Human narrative and audible listening remain unperformed.

### 5. Game feel, interface and visual readability

**Tooltip, labels, required inline views and both motion preference modes verified in targeted browser checks**

Finding: Detached hover panels obscured the tree, receipt/tag spacing could crowd controls, and generic incoming call styling weakened caller identity. Material colors needed a real-scene readability check rather than a palette-only assumption.

Change: Tree details close correctly and the 110 ms closing grace retains hit testing so panel entry can cancel dismissal. Receipt/tag layouts keep costs and actions readable, separate contract and Condition bonuses, hide obsolete hints and wrap goals. Parent verified a native keyboard Heavy Pick purchase and outside-click dismissal. The expanded React pointer audit passes 20 flags and 1,512 labels with zero failures. Actual 1066×912 tag gaps are 11.6949 px for Thermal,11.6356 px for Breaker and 11.6345 px for Pick. All nine required scenes and all five Vault phases were reviewed inline, including current P5 hash ice-1f3342e2. The HC-S1 browser purchase costs exactly $25 and adds one fitting. Normal motion shows a changing purchase connector, child/frontier reveals and settled expected states: HC-S2 locked→available, HC-S3 unknown→locked, HC-S4 hidden→unknown. First change was observed near 366 ms. Reduced motion reaches the same states without animation, first changing near 9.4 ms.

Evidence: qa-artifacts/major-ui-review-pass.json; qa-artifacts/major-story-editorial-review.json; tests/phone-call.test.ts; qa-artifacts/major-tooltip-final-review.json; qa-artifacts/major-motion-final-review.json

Remaining: No remaining recorded automated motion/tooltip failure. Required captures remain in inline browser-tool output rather than standalone image files. Native keyboard/outside-click is distinct from synthetic hover trajectories. Human full playthrough and audible listening remain unperformed.

### 6. Engineering, save boundaries and runtime ownership

**243 tests, TypeScript, full lint, final delivered build, source qualification and runtime ownership checks verified**

Finding: Fixed 4,830-sample assumptions and stale release checks conflicted with variable worlds. Whole-field rebuilding and unowned scene resources risked stalls/leaks. Save rounding at exactly 0.5 could recreate removed ice. Unsafe legacy shape mapping and regenerated cargo could risk lost progress or duplicate rewards.

Change: Each field owns dimensions/material arrays, safe neighbors and deterministic identity. Chunks of 8 cells with shared boundaries rebuild with impact priority and bounded work; replaced owned geometry is disposed. Local release runs on every edited revision, global connectivity at most about 6 Hz. Scene teardown owns RAF/listeners/canvas/context/resources. Compact v5 migration reconstructs old coordinates, resamples compatible cuts or resets only unsafe current ice with a diagnostic while preserving account state and canonical paid cargo. Exact 0.5 rounds to air across repeated saves; Vault-only cargo versions leave other active-field hashes unchanged. Final browser stress created/disposed 20 real scenes across four sizes with zero active/drained shells, removed canvases, lost contexts, cleared listeners and stopped RAF; parent resources remained 231 geometries/24 textures/15 programs. Read-only restore of real v3 and three v4 player slots preserves metadata. Slots 1/2 deliberately fall back on unsafe current-field geometry; legacy and slot 3 preserve thaw state. Player files remain unchanged. All nine final simulations share one stable 56-input fingerprint. A separate qualification records the later webmcp.ts and motion-audit.ts browser-QA changes while independently verifying all 26 TypeScript runtime dependencies plus simulator/helper/launcher/package/config hashes are unchanged. The report never rewrites frozen hashes; stale/missing qualification, helper/runtime changes and falsified graphs are rejected by three report-provenance tests. The stale motion-audit heat-1 purchase fixture was updated to current HC-S1 interaction; its exact frozen/current hashes are documented and it is outside the independently verified simulation dependency graph.

Evidence: qa-artifacts/major-foundation-browser.json; tests/ice-grid.test.ts; tests/major-migration.test.ts; tests/major-save.test.ts; tests/field-save.test.ts; tests/vault-layout.test.ts; qa-artifacts/major-accepted-tests.log; qa-artifacts/major-accepted-build.log; manifest verification.finalBrowser; tests/major-report-provenance.test.mjs; qa-artifacts/major-premium-rev6-provenance-qualification.json

Remaining: No remaining recorded engineering check failure. The documented QA-only source differences remain visible in provenance. Inline screenshots are not portable image files; human full campaign/audio acceptance is unmeasured.


## Game feel and visual evidence

Isolated UI review: Real Chrome viewport override and read-only DOM measurements of isolated React components using game styles/fonts. Screenshots inspected. No scene geometry behind the component harness.. 3 receipt viewport cases and 4 custody-tag cases were recorded. This harness does not verify scene occlusion, tool art or material readability behind the UI.

| Required screenshot | Evidence |
| --- | --- |
| D1 Parcel | Observed in inline browser capture; no standalone image file |
| D7 Seam | Observed in inline browser capture; no standalone image file |
| D8 Wings | Observed in inline browser capture; no standalone image file |
| D15 Archive | Observed in inline browser capture; no standalone image file |
| D22 Service Archive | Observed in inline browser capture; no standalone image file |
| D31 compound | Observed in inline browser capture; no standalone image file |
| Vault P1 | Observed in inline browser capture; no standalone image file |
| Vault P3 | Observed in inline browser capture; no standalone image file |
| Vault P5 | Observed in inline browser capture; no standalone image file |




## Known limitations

- This document is generated from recorded evidence. Pending rows are not passing checks.
- Selected Mixed provenance: Final premium predictor / revision6 physical Ledger cohort; frozen 2026-09-09T14:15:26.624Z; complete; simulation dependencies match; documented browser-QA differences: lib/game/motion-audit.ts, lib/game/webmcp.ts; designated final. The original run fingerprints and any permitted browser-QA differences remain visible. Ineligible historical runs are never used for the fastest-rational calculation.
- 45–55 active minutes conflicts with the exact 56.3–63.2-minute sum of authored delivery bands. The overall measured target takes priority; human 75–95-minute acceptance still requires an actual playthrough.
- Headless replay is deterministic aiming/purchasing behavior plus documented overhead assumptions. It cannot verify human exploration, usability, sound quality, GPU performance or strategy optimality.
- Foundation frame metrics come from one fast desktop/browser/viewport and engineering fixtures. Final EARLY/MID/LATE/VAULT browser stress is separate.
- The cooperative mesh budget may be exceeded by one chunk. Typed-buffer memory omits JS objects, surfaces, driver buffers and textures.
- Legacy fallback may restart the current ice arrangement when world-space mapping is unsafe; prior money, tools, nodes, story and paid identities remain.
- No supported pointer move/hover API in current browser or sky documentation; hover tests remain synthetic page events
- Full-game scene overlap and model postgame progression remain root integration checks
- Final Mixed Vault 286 seconds and Ledger cradle 53.05 seconds remain below their 330–420/60–90 targets. The real physical layout improves recovery work; no fake completion delay or hidden ice gate was used.
- Fast/destructive Power earns 12.41%Condition bonus versus 5–9%intent. Ending wallets vary far more than 5–15%as policies spend on different builds. Read the measured target table rather than treating all balance goals as passed.
- Full policy runs use frozen actual simulation dependencies. Later browser-QA-only changes are explicitly qualified; full current browser source is not identical to the frozen fingerprint.
- All policy times include modeled first-time overhead when labeled experience. There was no human full campaign playthrough or audible listening review.
- All nine required scene views were captured and reviewed inline in browser-tool output. No standalone screenshot image files were saved into this portable report.

## Test results

| Check | Evidence/status |
| --- | --- |
| Frozen baseline | 95 passed; 0 failed; build passed |
| Intermediate focused review | Final suite 243/243 passes, including seven JavaScript cases. TypeScript and full app/game/tests lint pass. Root supplied native-input, scene-lifetime, player-save, phone/ending/contract and normal/reduced-motion browser evidence separately. No human full campaign playthrough or audible listening was performed. |
| Final full suite | {"passed":243,"failed":0,"log":"qa-artifacts/major-verification-tests.log","scope":"236 game tests plus 7 JavaScript tests, including the report provenance cases."} |
| Final build | {"passed":true,"routesPrerendered":2,"log":"qa-artifacts/major-delivered-build.log","scope":"Final delivered local build after revision6 geometry, Fan, tag and browser-QA updates.","warnings":"Existing ineffective dynamic-import bundling notices; build completed."} |
| TypeScript | {"passed":true,"log":"qa-artifacts/major-verification-types.log"} |
| Final lint | {"passed":true,"exitCode":0,"log":"qa-artifacts/major-delivered-lint.log","scope":"Entire app/game/tests, including report provenance promise handling."} |
| Final full-game browser | 20 scene lifetimes passed; 20 tooltip flags and 1512 labels checked, 0 label failures. Normal/reduced-motion purchases, native phone acknowledgements, receipt and contract state fixtures are recorded in the review ledger. Player-save audit was read-only. All methods, exact state fields and limitations are preserved in portable data.json; these targeted checks are not a human full campaign. |
| Human playthrough | Not performed |
| Audio listening | Not performed |

Fresh report-generation checks only: source compilation succeeded; 69/69 phase budget checks; 32/32 exact base-net arithmetic checks; 0 cargo intersections; 0 initially free cargo; 0 initially exposed cargo. These are not a replacement for npm test or browser play.

## All-phase appendix

| D / P / phase | Profile / dimensions | Grid / samples | Solid before → carved | Material % | Chunks / triangles | Budget range / pass | Target active s | Mixed active s | Gross | Ideal / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1/1 Outer holdings | parcel 4.4×2.6×2.4 | 18×12×11 / 2,376 | 882 → 828 | clear 100% | 12 / 5,072 | 900–1100 / pass | 30–40 | 33.8 | $284 | hand/pick / — |
| 2/1 Outer holdings | parcel 4.8×2.8×2.5 | 19×13×12 / 2,964 | 1,200 → 1,146 | clear 86%; brittle 14% | 12 / 6,056 | 1100–1300 / pass | 45–55 | 31.1 | $397 | hand/pick / — |
| 3/1 Outer holdings | slab 5.2×3×2.8 | 21×13×13 / 3,549 | 1,411 → 1,312 | clear 100% | 12 / 7,408 | 1350–1600 / pass | 55–65 | 51.1 | $568 | pick / — |
| 4/1 Outer holdings | tower 5.4×3.6×3 | 22×15×13 / 4,290 | 1,836 → 1,737 | clear 100% | 12 / 8,460 | 1650–1950 / pass | 65–75 | 58.6 | $795 | pick/heavy / — |
| 5/1 Outer holdings | archive 5.8×3.8×3.2 | 23×16×14 / 5,152 | 2,170 → 2,071 | clear 94.7%; reinforced 5.3% | 12 / 11,324 | 2000–2350 / pass | 54.4–61.2 | 57.6 | $734 | breaker/thermal / — |
| 5/2 Evidence compartment | parcel 4.41×2.66×2.37 | 18×12×11 / 2,376 | 882 → 789 | clear 100% | 12 / 5,384 | 740–900 / pass | 25.6–28.8 | 35.5 | $345 | hand/pick / tag |
| 6/1 Outer holdings | slab 5.9×3.7×3.3 | 23×16×14 / 5,152 | 2,204 → 2,060 | clear 100% | 12 / 10,248 | 1900–2200 / pass | 55–65 | 70.7 | $1,363 | pick / — |
| 7/1 Outer holdings | seam 6.2×4×3.5 | 24×17×15 / 6,120 | 2,936 → 2,792 | clear 83.1%; dense 16.9% | 12 / 12,344 | 2300–2600 / pass | 44.2–51 | 91.2 | $1,081 | heavy/breaker / — |
| 7/2 Inner compartment 1 | archive 4.71×2.8×2.59 | 19×13×12 / 2,964 | 1,044 → 945 | clear 43.2%; reinforced 56.8% | 12 / 7,516 | 900–1100 / pass | 20.8–24 | 36.9 | $509 | breaker/thermal / — |
| 8/1 Outer holdings | wings 6.4×4×3.6 | 25×17×15 / 6,375 | 2,684 → 2,584 | clear 37.8%; brittle 56.6%; reinforced 5.6% | 12 / 11,744 | 2600–3000 / pass | 51–57.8 | 30.3 | $1,236 | sledge/heavy / — |
| 8/2 Evidence compartment | tower 4.86×2.8×2.66 | 20×13×12 / 3,120 | 1,216 → 1,092 | clear 100% | 12 / 6,892 | 1050–1250 / pass | 24–27.2 | 32 | $582 | pick/heavy / ring |
| 9/1 Outer holdings | tower 6.6×4.3×3.8 | 25×18×16 / 7,200 | 3,636 → 3,465 | clear 80.3%; dense 19.7% | 18 / 13,420 | 2900–3300 / pass | 54.4–61.2 | 59.8 | $1,391 | pick/heavy / — |
| 9/2 Inner compartment 1 | archive 5.02×3.01×2.81 | 20×14×13 / 3,640 | 1,388 → 1,289 | clear 37%; dense 18.8%; reinforced 44.2% | 12 / 8,684 | 1200–1450 / pass | 25.6–28.8 | 26.6 | $654 | breaker/thermal / — |
| 10/1 Outer holdings | archive 6.8×4.5×4 | 26×18×17 / 7,956 | 3,642 → 3,471 | clear 63.7%; reinforced 36.3% | 24 / 16,392 | 3300–3800 / pass | 61.2–68 | 57.4 | $1,622 | breaker/thermal / — |
| 10/2 Inner compartment 1 | parcel 5.17×3.15×2.96 | 21×14×13 / 3,822 | 1,683 → 1,584 | clear 100% | 12 / 7,984 | 1500–1750 / pass | 28.8–32 | 29.4 | $764 | hand/pick / — |
| 11/1 Outer holdings | seam 7×4.6×4.1 | 27×19×17 / 8,721 | 4,619 → 4,448 | clear 80.7%; dense 19.3% | 24 / 16,464 | 3900–4400 / pass | 59.8–65.5 | 69.6 | $1,554 | heavy/breaker / — |
| 11/2 Inner compartment 1 | archive 5.32×3.22×3.03 | 21×14×14 / 4,116 | 1,630 → 1,531 | clear 56.7%; reinforced 43.3% | 12 / 9,176 | 1450–1750 / pass | 29.4–32.2 | 33.9 | $764 | breaker/thermal / — |
| 11/3 Evidence compartment | parcel 3.78×2.3×2.21 | 16×11×11 / 1,936 | 672 → 585 | clear 100% | 8 / 4,500 | 530–650 / pass | 15.8–17.3 | 18.8 | $409 | hand/pick / hold |
| 12/1 Outer holdings | slab 6.9×4.5×4 | 27×18×17 / 8,262 | 4,094 → 3,896 | clear 100% | 24 / 15,248 | 3500–3900 / pass | 75–85 | 66.8 | $2,954 | pick / — |
| 13/1 Outer holdings | wings 7.3×4.8×4.2 | 28×19×18 / 9,576 | 4,164 → 3,984 | clear 10.2%; brittle 61.1%; reinforced 28.7% | 36 / 17,276 | 4100–4500 / pass | 57.8–64.6 | 34.9 | $2,241 | sledge/heavy / — |
| 13/2 Inner compartment 1 | tower 5.55×3.36×3.11 | 22×15×14 / 4,620 | 2,040 → 1,941 | clear 100% | 12 / 8,924 | 1800–2100 / pass | 27.2–30.4 | 35.3 | $1,054 | pick/heavy / — |
| 14/1 Outer holdings | tower 7.6×5×4.4 | 29×20×18 / 10,440 | 5,614 → 5,380 | clear 77.7%; dense 22.3% | 36 / 18,108 | 4500–5000 / pass | 61.2–68 | 83.4 | $2,472 | pick/heavy / — |
| 14/2 Inner compartment 1 | archive 5.78×3.5×3.26 | 23×15×14 / 4,830 | 2,010 → 1,893 | clear 42.9%; dense 14.8%; reinforced 42.2% | 12 / 10,972 | 1800–2100 / pass | 28.8–32 | 47.4 | $1,164 | breaker/thermal / — |
| 15/1 Outer holdings | archive 7.9×5×4.6 | 30×20×19 / 11,400 | 5,590 → 5,365 | clear 57.2%; reinforced 42.8% | 36 / 23,972 | 5000–5500 / pass | 54.1–59.8 | 77.3 | $2,267 | breaker/thermal / — |
| 15/2 Inner compartment 1 | seam 6×3.5×3.4 | 24×15×15 / 5,400 | 2,512 → 2,413 | clear 83.4%; dense 16.6% | 12 / 10,804 | 2250–2600 / pass | 26.6–29.4 | 34.4 | $1,113 | heavy/breaker / — |
| 15/3 Inner compartment 2 | parcel 4.27×2.5×2.48 | 18×12×12 / 2,592 | 1,008 → 936 | clear 100% | 12 / 5,608 | 850–1020 / pass | 14.3–15.8 | 21.4 | $597 | hand/pick / — |
| 16/1 Outer holdings | wings 8.1×5.2×4.8 | 30×21×19 / 11,970 | 5,800 → 5,575 | clear 18%; brittle 55.3%; reinforced 26.7% | 36 / 20,792 | 5400–5900 / pass | 68–74.8 | 58 | $3,013 | sledge/heavy / — |
| 16/2 Inner compartment 1 | tower 6.16×3.64×3.55 | 24×16×15 / 5,760 | 2,728 → 2,629 | clear 100% | 12 / 10,596 | 2450–2850 / pass | 32–35.2 | 28.8 | $1,418 | pick/heavy / — |
| 17/1 Outer holdings | seam 8.3×5.2×4.9 | 31×21×20 / 13,020 | 7,416 → 7,191 | clear 85.4%; dense 14.6% | 36 / 22,672 | 5900–6500 / pass | 59.8–65.5 | 81.4 | $2,785 | heavy/breaker / — |
| 17/2 Inner compartment 1 | archive 6.31×3.64×3.63 | 25×16×16 / 6,400 | 2,871 → 2,772 | clear 56.3%; reinforced 43.7% | 12 / 14,484 | 2600–3000 / pass | 29.4–32.2 | 26.6 | $1,368 | breaker/thermal / — |
| 17/3 Inner compartment 2 | parcel 4.48×2.6×2.65 | 18×12×12 / 2,592 | 1,008 → 936 | clear 100% | 12 / 5,576 | 850–1020 / pass | 15.8–17.3 | 13.8 | $733 | hand/pick / — |
| 18/1 Outer holdings | archive 8.5×5.4×5 | 32×22×20 / 14,080 | 6,744 → 6,519 | clear 42.1%; dense 28%; reinforced 30% | 36 / 26,948 | 6500–7300 / pass | 68.4–76.9 | 61.8 | $2,974 | breaker/thermal / — |
| 18/2 Inner compartment 1 | seam 6.46×3.78×3.7 | 25×16×16 / 6,400 | 3,156 → 3,057 | clear 59.5%; dense 40.5% | 12 / 12,316 | 2850–3300 / pass | 33.6–37.8 | 24.4 | $1,460 | heavy/breaker / — |
| 18/3 Evidence compartment | parcel 4.59×2.7×2.7 | 19×13×13 / 3,211 | 1,215 → 1,122 | clear 78.7%; dense 21.3% | 12 / 6,424 | 1020–1230 / pass | 18–20.3 | 17.3 | $783 | hand/pick / log |
| 19/1 Outer holdings | tower 8.2×5.1×4.8 | 31×20×19 / 11,780 | 6,525 → 6,300 | clear 50.4%; brittle 49.6% | 36 / 19,776 | 5800–6400 / pass | 90–100 | 65 | $5,434 | pick/heavy / — |
| 20/1 Outer holdings | seam 8.6×5.4×5 | 32×22×20 / 14,080 | 7,776 → 7,551 | clear 81.5%; dense 18.5% | 36 / 23,228 | 6500–7100 / pass | 68–74.8 | 80.8 | $3,991 | heavy/breaker / — |
| 20/2 Inner compartment 1 | archive 6.54×3.78×3.7 | 25×16×16 / 6,400 | 2,766 → 2,622 | clear 56.3%; reinforced 43.7% | 12 / 13,840 | 2450–2850 / pass | 32–35.2 | 34.3 | $1,878 | breaker/thermal / — |
| 21/1 Outer holdings | wings 8.9×5.6×5.1 | 33×22×20 / 14,520 | 7,288 → 7,063 | clear 16.1%; brittle 56.3%; reinforced 27.6% | 36 / 24,312 | 7100–7800 / pass | 74.8–81.6 | 61.9 | $4,287 | sledge/heavy / — |
| 21/2 Inner compartment 1 | tower 6.76×3.92×3.77 | 26×17×16 / 7,072 | 3,480 → 3,336 | clear 100% | 16 / 12,848 | 3100–3600 / pass | 35.2–38.4 | 32.5 | $2,017 | pick/heavy / — |
| 22/1 Outer holdings | archive 9.1×5.7×5.2 | 34×22×21 / 15,708 | 8,346 → 8,121 | clear 28.5%; reinforced 24.2%; service 47.3% | 45 / 29,580 | 7600–8300 / pass | 68.4–74.1 | 66.3 | $3,903 | breaker/thermal / — |
| 22/2 Inner compartment 1 | seam 6.92×3.99×3.85 | 27×17×16 / 7,344 | 3,756 → 3,612 | clear 41.7%; dense 10%; service 48.3% | 16 / 14,132 | 3400–3850 / pass | 33.6–36.4 | 31.4 | $1,917 | heavy/breaker / — |
| 22/3 Inner compartment 2 | archive 4.91×2.85×2.81 | 20×13×13 / 3,380 | 1,244 → 1,172 | clear 22.9%; reinforced 26.6%; service 50.5% | 12 / 7,608 | 1080–1290 / pass | 18–19.5 | 14.5 | $1,027 | thermal/breaker / — |
| 23/1 Outer holdings | slab 9.3×5.9×5.4 | 35×23×22 / 17,710 | 9,982 → 9,757 | clear 83.8%; dense 16.2% | 45 / 26,320 | 8100–8800 / pass | 85–91.8 | 73 | $5,026 | pick / — |
| 23/2 Inner compartment 1 | archive 7.07×4.13×4 | 27×17×17 / 7,803 | 3,559 → 3,415 | clear 51%; dense 16.1%; reinforced 32.9% | 16 / 16,900 | 3200–3650 / pass | 40–43.2 | 30.6 | $2,365 | breaker/thermal / — |
| 24/1 Outer holdings | archive 9.6×6×5.5 | 35×23×22 / 17,710 | 9,660 → 9,435 | clear 56.3%; reinforced 43.7% | 45 / 31,996 | 8800–9600 / pass | 79.8–85.5 | 56.5 | $4,585 | breaker/thermal / — |
| 24/2 Inner compartment 1 | seam 7.3×4.2×4.07 | 28×17×17 / 8,092 | 4,188 → 4,044 | clear 86.4%; dense 13.6% | 16 / 15,236 | 3800–4300 / pass | 39.2–42 | 26.6 | $2,252 | heavy/breaker / — |
| 24/3 Inner compartment 2 | archive 5.18×3×2.97 | 21×13×13 / 3,549 | 1,320 → 1,248 | clear 54.3%; reinforced 45.7% | 12 / 7,952 | 1150–1380 / pass | 21–22.5 | 13.6 | $1,206 | thermal/breaker / — |
| 25/1 Outer holdings | seam 9.8×6.2×5.6 | 36×24×22 / 19,008 | 11,704 → 11,479 | clear 83.9%; dense 16.1% | 45 / 29,724 | 9600–10600 / pass | 88.3–96.9 | 74.1 | $5,080 | heavy/breaker / — |
| 25/2 Inner compartment 1 | archive 7.45×4.34×4.14 | 28×18×17 / 8,568 | 4,020 → 3,876 | clear 53.1%; reinforced 46.9% | 24 / 17,820 | 3650–4150 / pass | 43.4–47.6 | 36.5 | $2,496 | breaker/thermal / — |
| 25/3 Evidence compartment | archive 5.29×3.1×3.02 | 21×14×14 / 4,116 | 1,630 → 1,531 | clear 23.6%; reinforced 21.2%; service 55.2% | 12 / 9,200 | 1400–1680 / pass | 23.3–25.5 | 18.4 | $1,337 | thermal/breaker / access |
| 26/1 Outer holdings | tower 9.2×5.7×5.2 | 34×22×21 / 15,708 | 9,146 → 8,921 | clear 50%; brittle 50% | 45 / 24,128 | 8000–8800 / pass | 105–115 | 77.8 | $9,239 | pick/heavy / — |
| 27/1 Outer holdings | wings 9.7×6×5.5 | 36×23×22 / 18,216 | 9,660 → 9,435 | clear 14.2%; brittle 56.8%; reinforced 29.1% | 45 / 28,640 | 9000–9900 / pass | 78.2–85 | 79.4 | $6,873 | sledge/heavy / — |
| 27/2 Inner compartment 1 | tower 7.37×4.2×4.07 | 28×17×17 / 8,092 | 4,134 → 3,990 | clear 100% | 16 / 14,276 | 3750–4250 / pass | 36.8–40 | 33.6 | $3,235 | pick/heavy / — |
| 28/1 Outer holdings | seam 10×6.2×5.6 | 37×24×22 / 19,536 | 11,984 → 11,759 | clear 46.3%; dense 10%; service 43.8% | 45 / 30,340 | 9900–10800 / pass | 85–91.8 | 78.3 | $7,538 | heavy/breaker / — |
| 28/2 Inner compartment 1 | archive 7.6×4.34×4.14 | 29×18×17 / 8,874 | 4,248 → 4,104 | clear 25.9%; reinforced 22.2%; service 51.9% | 24 / 19,108 | 3900–4400 / pass | 40–43.2 | 33.8 | $3,548 | breaker/thermal / — |
| 29/1 Outer holdings | archive 10.3×6.4×5.8 | 38×25×23 / 21,850 | 12,002 → 11,777 | clear 27.2%; reinforced 18.9%; service 53.9% | 45 / 40,228 | 10800–11800 / pass | 76.9–82.6 | 61.4 | $6,939 | thermal/breaker / — |
| 29/2 Inner compartment 1 | seam 7.83×4.48×4.29 | 30×18×18 / 9,720 | 5,260 → 5,116 | clear 34.8%; dense 9.8%; service 55.4% | 36 / 17,460 | 4850–5400 / pass | 37.8–40.6 | 34.6 | $3,408 | thermal/breaker / — |
| 29/3 Inner compartment 2 | archive 5.56×3.2×3.13 | 22×14×14 / 4,312 | 1,728 → 1,656 | clear 19%; reinforced 16.3%; service 64.7% | 12 / 8,812 | 1540–1800 / pass | 20.3–21.8 | 12.3 | $1,826 | thermal/breaker / — |
| 30/1 Outer holdings | slab 10.6×6.6×6 | 39×25×23 / 22,425 | 13,265 → 13,040 | clear 82.6%; dense 17.4% | 45 / 31,288 | 11800–12800 / pass | 85.5–91.2 | 79.6 | $7,620 | pick / — |
| 30/2 Inner compartment 1 | seam 8.06×4.62×4.44 | 30×19×18 / 10,260 | 5,604 → 5,460 | clear 75.5%; dense 24.5% | 36 / 18,164 | 5200–5750 / pass | 42–44.8 | 38.6 | $3,744 | heavy/breaker / — |
| 30/3 Inner compartment 2 | archive 5.72×3.3×3.24 | 23×14×14 / 4,508 | 1,850 → 1,778 | clear 19.6%; dense 6.4%; reinforced 18.8%; service 55.2% | 12 / 9,908 | 1650–1940 / pass | 22.5–24 | 12.1 | $2,005 | thermal/breaker / — |
| 31/1 Outer holdings | wings 11×7×6.4 | 40×27×25 / 27,000 | 15,316 → 15,091 | clear 19.3%; brittle 54.8%; reinforced 25.9% | 60 / 37,316 | 13200–14500 / pass | 94–99.7 | 63.9 | $8,426 | sledge/heavy / — |
| 31/2 Inner compartment 1 | archive 8.36×4.9×4.74 | 31×20×19 / 11,780 | 5,877 → 5,733 | clear 50.2%; reinforced 49.8% | 36 / 24,516 | 5450–6050 / pass | 46.2–49 | 37.3 | $4,139 | breaker/thermal / — |
| 31/3 Inner compartment 2 | archive 5.94×3.5×3.46 | 23×15×15 / 5,175 | 2,103 → 2,031 | clear 27.7%; reinforced 24.8%; service 47.6% | 12 / 10,992 | 1890–2190 / pass | 24.8–26.3 | 13.3 | $2,217 | thermal/breaker / — |
| 32/1 Outer braces | wings 11.5×7.2×6.6 | 42×27×25 / 28,350 | 15,988 → 15,592 | clear 18.7%; brittle 57.2%; reinforced 24.1% | 72 / 40,400 | 14800–16300 / pass | 60–75 | 73 | $5,500 | sledge/heavy / — |
| 32/2 Compression seam | seam 10.5×6.4×6 | 38×25×23 / 21,850 | 13,582 → 13,291 | clear 62.9%; dense 37.1% | 45 / 32,836 | 12800–14300 / pass | 60–75 | 54.5 | $4,840 | heavy/breaker / — |
| 32/3 Archive lattice | archive 10.8×6.8×6.2 | 40×26×24 / 24,960 | 16,050 → 15,576 | clear 61.6%; reinforced 38.4% | 60 / 37,372 | 13000–15000 / pass | 75–90 | 66.3 | $5,500 | breaker/heavy / — |
| 32/4 Service seal | archive 9.8×6×5.8 | 36×23×23 / 19,044 | 11,800 → 11,458 | reinforced 12.7%; service 87.3% | 45 / 29,596 | 10500–12300 / pass | 75–90 | 39.2 | $3,960 | thermal/breaker / — |
| 32/5 Ledger cradle | parcel 9.6×5.9×5.75 | 35×23×23 / 18,515 | 11,780 → 11,417 | clear 10.3%; dense 89.7% | 45 / 28,168 | 10800–11900 / pass | 60–90 | 53 | $2,200 | pick/hand/thermal / ledger |


## Portable artifacts and regeneration

- [qa-artifacts/major-report/data.json](qa-artifacts/major-report/data.json)
- [qa-artifacts/major-report/deliveries.csv](qa-artifacts/major-report/deliveries.csv)
- [qa-artifacts/major-report/phases.csv](qa-artifacts/major-report/phases.csv)
- [qa-artifacts/major-report/policies.csv](qa-artifacts/major-report/policies.csv)
- [qa-artifacts/major-report/tool-purchases.csv](qa-artifacts/major-report/tool-purchases.csv)
- [qa-artifacts/major-report/all-purchases.csv](qa-artifacts/major-report/all-purchases.csv)
- [qa-artifacts/major-report/condition-awards.csv](qa-artifacts/major-report/condition-awards.csv)
- [qa-artifacts/major-report/story-order.csv](qa-artifacts/major-report/story-order.csv)
- [qa-artifacts/major-report/physical-volume.svg](qa-artifacts/major-report/physical-volume.svg)
- [qa-artifacts/major-report/active-time.svg](qa-artifacts/major-report/active-time.svg)
- [qa-artifacts/major-report/money.svg](qa-artifacts/major-report/money.svg)
- [qa-artifacts/major-report/tool-purchases.svg](qa-artifacts/major-report/tool-purchases.svg)
- [qa-artifacts/major-report/condition.svg](qa-artifacts/major-report/condition.svg)

Run `node tests/write-major-report.mjs --inputs qa-artifacts/major-report-inputs.json`. Optional `--python PATH` selects a Python with Matplotlib. If needed, install the plotting dependency with `python -m pip install --target qa-artifacts/major-report-python -r tests/major-report-requirements.txt`; the plotting script reads that local package folder. Simulator policy names such as `power-first` normalize to the required POWER row; optional UPGRADER runs become an additional row. The generator recompiles current geometry into an isolated folder, reads explicit recorded runs, recomputes source freshness, writes portable data and standard Matplotlib SVG/PNG figures, and regenerates this Markdown. It does not launch gameplay or mark pending tests complete.
