# Narrative restraint and economy revision 2 — September 13, 2026

**This is an implementation checkpoint, not acceptance of the whole replacement brief.** Narrative restraint, save migration and the new cargo catalog are implemented and tested. The 105–130 minute Mixed pacing target and 45–60% Mixed node ownership target are still failing. The reference-driven Upgrades redesign has not been implemented because its required original video is missing. See `QA-REFERENCE-TREE-VISUAL.md` for the static study and remaining reference review.

## Implemented

- Seven Tony calls including the postgame coda, and three Mercer calls outside the existing 17-panel tutorial. The supplied short scripts replace the corresponding campaign dialogue. Routine tool, delivery, chapter, praise and teaching barks no longer enter the phone queue.
- Explicit narrative delivery modes distinguish calls, evidence, tool presentations and silence. Retired IDs remain valid for historical save/archive data.
- Scheduled Tony calls require eight active-play minutes since the previous Tony call. Other non-Vault calls use a two-minute cooldown and a calm-state check. Proactively dialing a queued call remains possible; this is intentionally distinct from automatic ringing.
- Three ring cycles then a steady pending light. No pending-call vignette or bounce. Current physical work continues; answering pauses it. Keyboard/controller confirmation supports the pending state. Menu interruptions cannot restart the same audible ring cycle.
- Tool availability no longer depends on a retired equipment phone call. Tools use maintenance-surplus requisition presentations, including the short handwritten Sledge note.
- The pre-Vault dispatch waits for Tony's final delivery call. Mercer’s final offer precedes the ledger acknowledgement; the ledger call waives the entire current Vault commission before final settlement. The postgame quiet beat starts when completion actually occurs.
- Economy revision 2 uses authored catalog bases. Coin $15, cash $55 and small gold $150; a pristine small gold bar pays $180. Sixteen distinct cargo types range through rolls, packs, silver, jewelry, watches, rare-coin cases, bonds, gems and bullion. The same item does not silently become more expensive in a later delivery.
- Physical manifests cover all 32 deliveries with the requested chapter count ranges. The Vault contains 16 ordinary valuables across five phases. Tutorial parcels contain two finds each. Contracts use a deterministic mixed catalog.
- New miniature meshes include bands, bezels, links, clasps, seals and material changes. Their rendered geometry stays inside its authored contact envelope. No new ice hardness multiplier, reduced tool force or artificial waiting was introduced to pad playtime.
- Existing wallets, paid reward identities, upgrades, tools and collection credits survive migration. Unpaid legacy cargo adopts reduced values. Existing layout-3 cargo retains its geometry and identities until the next delivery, which adopts revision 2. Old credited receipts retain their original values.

## Defects corrected during this pass

1. Retired equipment announcements still blocked tool availability. Removed that dependency while retaining delivery and purchase requirements.
2. Higher-priority ledger dialogue could overtake Mercer's final offer. Added the acknowledgement prerequisite.
3. A delayed older commission decision could restore a fee already waived by the ledger. Commission effects now only reduce the applicable cut and preserve the accounting identity.
4. Legacy uncredited condition data could retain an old high base or forged final value. Restore recomputes future value from the revised base while preserving paid amounts.
5. Pending calls were omitted from controller/keyboard confirmation and the QA call-completion helper. Both now handle ringing and pending states.
6. Repeated menu interruptions restarted the ring timer. Audible cycles now follow the saved call clock with one start per cycle.
7. Quiet time before campaign completion could shorten the postgame pause. Completion resets that quiet beat.
8. The local-save audit assumed every save had an uncompressed density array. It now also checks version-5 compressed fields and reports migration diagnostics per slot.
9. The simulator double-counted delivery 31 around the new pre-Vault dispatch gate and still checked the old duration target. Both are corrected. Campaign duration now excludes tutorial time; tutorial-inclusive time is reported separately.
10. The browser tutorial audit still expected six practice finds, the old wallet total and the retired introductory campaign call. It now uses the current authored values and custody-tag call. Hardware gamepad input is isolated during this keyboard/mouse audit so it cannot move focus mid-check.
11. Scene-lifetime geometry comparison sampled a variable number of newly uploaded chunks during an in-flight peel. Comparable allocation counts now come from the fully built fixture, while separate disposal checks still cover both in-flight and drained peels.

## Verification

- `npm test`: **272 passed, 0 failed, 0 skipped**. Coverage includes narrative ordering, ring/pending reload, old-save money preservation, all tutorial checkpoints, commission refunds, physical release and new valuable geometry.
- `npx tsc --noEmit`: passed. Production static build: passed. Lint of the changed TypeScript/TSX/MJS files: passed. Repository-wide lint still reports existing issues in unrelated generated UI components; it is not claimed clean.
- New-value mesh test: **313 modeled catalog items, 5,634 release passages, 2,232,943 mesh samples, 16 types, zero failures**.
- Live browser rendered-mesh stress: **319 total items, 81 phases, 5,742 release cases, 2,307,336 samples, zero failures**. This includes story meshes and ten contract deliveries. These are deliberate geometric cut fixtures, not manual playthroughs.
- Browser tutorial sequence: completed with reload at 32 checkpoints; 44 physical strikes; $100 gross, $11 commission, $25 fitting purchase, $64 remaining. Modeled physical work alone was 17.25 seconds; this is not tutorial reading/play duration.
- Browser tutorial UI audit: passed. Hold to Chip receives focus, buys for $25, returns focus to the bench button, and loads the two-item practice parcel. All eight text-speed/large-text combinations stayed contained. The 60-letter cue produced 60 letter sounds, silent skip remained silent, and dialogue stayed player-paced.
- The physical phone was observed in `pending` state at saved `ringSeconds: 12.6` with gameplay still `playing` and no render error.
- Scene lifetime: **20/20** creation/render/disposal cycles passed, including listener removal, stopped RAF, removed canvas, released context, and cleared phase shells. Comparable warmed geometry and texture counts stayed bounded; parent-scene resource counts were unchanged.
- Graphics regression: all **24** combinations of four presets, three zoom settings and two cycles passed. Comfort settings removed ambient dust/mist. This checks budgets and framing behavior, not a promised frame rate on other hardware.
- Read-only audit of all three actual local saves preserved wallets ($121,494, $1,814, $62), tools, nodes and credits. Slot 2 and slot 3 also preserved their active ice. **Slot 1 is a much older layout with cargo outside current bounds; the existing geometry migration regenerates its active parcel while preserving all paid identities and progression.** The audit did not write any player slot.

## Economy simulations: current source, all nine policies

Command: `node tests/run-major-policies.mjs --all`.

All nine reports use the same frozen compile from **2026-09-14T06:01:24.242Z**. Every recorded source hash matched the working source when checked after the runs. All nine completed all 32 deliveries. Every run passed gross/net/fee reconciliation, wallet reconciliation, unique award IDs, unique delivery IDs and removal-count balance.

The bot uses real surface rays, real tool cadence and damage, real prices and real earned money. It has detailed knowledge of cargo locations. Reading at 180 words/minute, short inspections and menu actions are explicit estimated overhead. It proactively checks queued calls, so its call timestamps are not evidence for automatic notification spacing. No human first-time duration or GPU performance claim is inferred from these runs.

Campaign modeled duration / active work / final nodes out of 70 / remaining wallet:

- Saver: **35.79 min / 13.69 min / 51 nodes / $10,060**.
- Mixed: **35.92 min / 13.31 min / 53 nodes / $3,658**.
- Upgrader: **35.91 min / 13.18 min / 54 nodes / $8,303**.
- Cheapest first: **35.61 min / 12.80 min / 55 nodes / $3,300**.
- Power first: **33.12 min / 13.12 min / 38 nodes / $22,757**.
- Speed first: **33.21 min / 13.58 min / 35 nodes / $24,762**.
- Control first: **36.11 min / 15.15 min / 37 nodes / $2,880**.
- Technique first: **34.19 min / 13.91 min / 34 nodes / $15,999**.
- Inefficient: **37.07 min / 15.41 min / 51 nodes / $6,350**.

The maximum observed active time with no affordable eligible opportunity was **19 seconds** across this cohort. Maximum active intervals between purchases ranged from **85.85 to 145.15 seconds**. There was no modeled 18-minute currency wall. Opportunities arrive too quickly for the intended slower overall campaign, however; avoiding a wall alone is not pacing acceptance.

Mixed major purchases, with modeled campaign minute excluding tutorial and wallet before → after:

- Ice Pick: delivery **6**, minute **4.49**, **$2,535 → $285**, price $2,250. Delivery window 6–7: met.
- Heavy Pick: delivery **11**, minute **10.26**, **$6,243 → $243**, price $6,000. Delivery window 12–14: **early**.
- Sledge: delivery **18**, minute **17.48**, **$20,144 → $144**, price $20,000. Delivery window 19–21: **early**.
- Breaker: delivery **25**, minute **24.87**, **$33,102 → $102**, price $33,000. Delivery window 25–27: met.
- Thermal: delivery **29**, minute **29.74**, **$42,582 → $82**, price $42,500. Delivery window 29–30: met.

Mixed gross was $210,587 including tutorial; net $192,643. Catalog base payout across the campaign was $179,710 and condition bonuses $30,777. The focused policies demonstrate distinct affordable builds, but Mixed still buys **75.71%** of nodes, exceeding the requested **45–60%**. Its **35.92-minute** estimate is far below **105–130 minutes**. Neither target is passed, and the estimate was not padded with extra reading or idle time.

## Narrative schedule review

The separate automatic-notification test uses an explicitly synthetic four-minute delivery clock. It validates events and scheduling, not the campaign duration target. It produces Tony at deliveries 5, 8, 18, 25, before dispatching 32, after ledger recovery, and after completion; Mercer at 11, 27 and the inner Vault. Non-Vault gaps obey the cooldowns. Additional boundary tests exercise exactly eight minutes, busy-state deferral, interrupted rings, restored pending calls and a full post-ending quiet beat.

## Remaining work before acceptance

1. **Balance:** rework the physical delivery duration and purchase rhythm, then rerun the cohort and conduct a timed human-style pass. The current reward/price changes alone have not produced the requested campaign length. A direction question has been sent about longer, more involved deliveries versus retaining the current excavation pace. Do not mark this solved by changing the estimator's overhead assumptions.
2. **Reference prerequisite:** reattach the original `20260908-0019-54.2416907.mp4`. The brief explicitly requires watching its tree sequence at normal speed and frame by frame before implementation. Preserved stills support static measurements only.
3. **Upgrades:** implement the six authored silhouettes, custom icon family review, node proportions, curves, tooltip, right rail and purchase/reveal/pan choreography after that review. No claim of reference-matching motion is made in this checkpoint.
4. **Final visual and motivation passes:** the full six-tree icon export, side-by-side motion comparison and consecutive-delivery first-time motivation review remain outstanding. The physical cargo and regression checks above do not replace them.

Generated detailed reports remain reproducible under `qa-artifacts/major-*.json`, `qa-artifacts/narrative-schedule.json` and `qa-artifacts/valuable-art-stress.json`. Tests use only the disposable `?qa=1` bench; ordinary player saves were not reset or played. The preview remains local.
