# Whole-game cargo release verification

Verified locally on September 9, 2026. No player saves were changed or reset.

## Fix

Campaign release now follows face-connected air through the scalar field, including underside openings and passages around corners. An exposed, contact-free object no longer needs a straight sightline through one of the old visibility probes. The existing exact rendered-mesh contact check still prevents release while ice touches the object. Unopened authored parcels remain captive.

The air search is bounded by the field size and cached once per geometry revision for all cargo. Release and credit happen on the edited frame; gravity and the normal collection animation follow. The tutorial retains the contact-based release fix from the preceding change.

## Results

- **6,768 geometry cases:** 376 cargo placements across 81 phases, covering all 32 campaign deliveries and ten postgame contracts. Six axis directions, eight diagonal directions and four bent passages per object. All passed; 4,678 cases had no direct sightline through the old exposure probes.
- **6,768 browser mesh cases:** the same corpus checked against actual authored reward meshes, totaling 1,965,932 contact samples across the items. No clear-but-stuck or premature-release failures. Includes economic cargo and every evidence model.
- **966 tool cases:** every campaign phase, all six tools, base and fully upgraded, including both thermal modes and hold/release input for the charged sledge. 56,363 real model update checks; all passed. These use a synthetic grounded final-contact pillar, not a claimed parcel playthrough.
- **276 save/frame-rate cases:** all 69 campaign phases at 20, 30, 60 and 144 FPS. Immediate release, gravity, mid-flight reload, completed collection and repeated reload without duplicate money all passed. The final Ledger's intentional three-second tray presentation is included.
- **One complete campaign simulation:** the mixed purchase/tool policy completed all 32 deliveries and 69 phases using normal model tools, earned purchases and story progression. No failure. This is a deterministic headless simulation, not a manual playthrough or a human-duration measurement.
- **Active browser performance:** a fresh six-second breaker window on the 28,350-sample Vault outer-braces field removed 631 solid samples with no frame errors. Frame interval p95 was 8.4 ms; CPU work p95 was 4.5 ms on this machine. This single window is not a universal performance guarantee.
- **Full suite:** 251 tests passed. TypeScript, changed-file lint and the local production build passed.

The geometry matrices intentionally edit real density as synthetic fixtures; the tool matrix and full campaign simulation independently exercise normal tool behavior. Browser checks run only in the isolated `?qa=1` bench and restore its checkpoint afterward.

## Reproduction

Run `npm test`. Detailed local output is in `qa-artifacts/release-stress.json`, `release-tool-stress.json`, `release-reload-stress.json`, and `release-whole-game-tests.log`. Run `node tests/run-major-policies.mjs --policy=mixed` for the full campaign simulation. In the isolated browser bench, `test_release_stress` starts the mesh matrix and `inspect_release_stress` returns its result.

The earlier major-overhaul balance report predates these release changes. Its old timing and economy measurements should not be treated as measurements of this build; this pass verifies release correctness, not progression retuning.
