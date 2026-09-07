# Verification record

Tested on 7 September 2026 in the Codex in-app browser on Windows, using Node.js 24.15.0. The production game was served from the static export at localhost:4173. No human playtest was conducted.

## Passed checkpoints

- **Control:** pointer-driven surface hits, local cuts, click/hold and toggle controls, resized targeting, fixed camera, UI separation, immediate cancellation on release, pointer cancellation, pause, and simulated window blur. Focus/resume did not restart firing. The warmed production input probe observed its first rendered response after 8.4 ms; development/startup probes ranged from 20.6 to 56.6 ms while the build and interface were settling. These are local probes, not a laboratory latency measurement.
- **Melting and release:** local frost-color changes and receding geometry, repeatable support cuts, a shared cluster pedestal, gravity-driven landing, different coin/cash/gold impacts, and collection without blocking aiming. The visible raycast surface and restraints derive from one volume. Remaining ice also clips the collection slide; a blocked item settles into the tray locally rather than passing through solid ice.
- **Economy and continuation:** immediate once-only credits, first $35 heat purchase, owned-nozzle switching, bounded fuel, free refill on the same thaw, maximum upgrade levels, and no negative balances or economic dead end.
- **Ending:** an automated player completed all 20 authored batches from a fresh production save, recovered 82 valuables worth $13,260, purchased every upgrade, and finished with $7,595. The first complete run took 316.7 seconds including test setup. The player aims using the authoritative volume and is much more efficient than an uninformed human; this does not validate the requested 15–25 minute human pacing target.
- **Save/restart:** partial thaw and purchases survived reload, the completion screen survived reload, Continue Playing retained the balance/upgrades, canceling Restart preserved progress, and confirmed Restart restored the first block without old loot, particles, firing, or rewards.
- **Interface:** inspected at 1146×912, 900×720, and 560×820, plus the larger-text option. At narrow sizes the workshop moves below the game; at short desktop heights it scrolls independently. The narrow viewport had no horizontal document overflow.
- **Audio runtime:** a trusted UI interaction changed AudioContext to running; continuous loops remain active without restarting every frame; pause shuts off the torch; mute reached an output gain of zero. Suspended contexts no longer queue one-shots. Voices remained bounded during the observed run.

The complete production replay after the final physical cleanup also passed: 20 batches, 82 valuables, $13,260 recovered, all upgrades purchased, and $7,595 remaining. It took 302.4 seconds of unpaused game time, including interface checks. The collection endpoints visibly stopped before remaining ice, and the ice base rested against the tray.

## Automated checks

`npm test`: 16 passing tests. They cover exactly-once rewards and stale identities, atomic purchases and level caps, the first heat upgrade's measured 65% effect, fuel/refill invariants, pause and toggle cancellation, paused transitions, collection at empty fuel, partial saves, reload during landing, corrupt saves, nozzle ownership, restart cleanup, pedestal connectivity, recoverable layouts, all 20 state transitions and the ending, and finite surface geometry.

`npx tsc --noEmit` passes. `npm run build` succeeds and exports the game to `dist/client/`. Static production playback was inspected, not just compilation. The generated Cloudflare runtime was omitted for this static-only application after its Windows shutdown produced a libuv assertion; the static build now exits successfully.

## Game-feel critique and revisions

1. The original torch read end-on and hid its own mechanical shape. A more lateral offset makes the handle, nozzle, and flame origin readable while heat still uses the current pointer ray.
2. A revealed coin could feel fussy to release because a few small restraints remained. The last three brittle contact cells now fracture with the same authoritative geometry before the drop. Ordinary support cuts were replayed and credited once.
3. Surface changes needed a finer cadence. Mesh refresh increased from 24 to 40 Hz; render/input updates remain independent, and simulation subdivides slow frames instead of stretching fuel time.

Additional fixes removed a resize feedback loop, anchored the bottom ice surface at the tray, clipped collection against remaining ice, and prevented one-shot audio from accumulating before browser audio activation.

## Performance observations

At the normal viewport and pixel ratio 1, sampled active melting windows reported roughly 198–240 animation frames per second. The 95th-percentile frame interval was commonly 4.3–8.4 ms; a heavy vault sample had a 9.7 ms 99th percentile. The measured JavaScript update/render work reached about 9.8 ms at the 95th percentile in that sample. Startup and development recompilation can produce larger spikes. These are browser-loop measurements, not an external GPU capture or a guarantee on other hardware.

Observed geometry counts varied with content, roughly 67–96, and returned to 68 on restart. Particle count is capped at 48, fracture fragments at 18 per event, and one-shot audio voices at 12. No steadily increasing scene-object count, duplicated payout, stuck item, or stuck firing state was observed across the complete run.

## Limits and unverified behavior

- Original procedural geometry and synthesized prototype sound are used throughout. There is no recorded Foley, music, or third-party art.
- Sound routing, state, gain ramps, mute and voice lifetime were inspected. Subjective sound quality, long-session listening comfort, and normal-speed video playback were not audibly/visually reviewed through recording tools; no recording facility was used.
- Human enjoyment and 15–25 minute pacing remain unvalidated. The automated precision player's approximately five-minute completion is not a human playtest.
- Ice fracture and loot motion are intentionally bounded approximations, not full rigid-body or fluid simulations. A blocked collection slide uses a local settling fallback.
- Saves are device- and origin-local, not cloud-synced. Browser storage refusal degrades to a playable unsaved session.
- No physical phone/tablet, Safari, low-end integrated GPU, or 200% browser text-enlargement session was tested.
- The supplied starter toolchain still reports npm audit advisories. This release publishes only static assets and has no app server actions, upload handlers, or database. No claim of a comprehensive security audit is made.


A further fan-nozzle stress run completed 11 continuing-play batches after the ending (44 additional valuables), with ordinary fuel use and automatic collection. No new production runtime errors were observed; historical development HMR errors were confined to the earlier incomplete edits.
