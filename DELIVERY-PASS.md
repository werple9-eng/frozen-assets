# Frozen Assets — longer trees and delivery payoff

> **Revision 3 — September 9, 2026.** The 103-node tiers described below are superseded. The six maps now hold **70 fittings with no repeated descriptions**: tiers are capped at two per subject, every second tier adds a second real effect rather than restating the first, numeric steps are 8–10% instead of 4–5%, and every mechanical milestone keeps its previous price. Saves from revisions 1 and 2 migrate through `legacy-tree-v2.ts` and `tree-migration.ts` without losing any paid benefit, and mechanics are addressed by name through `MECHANIC_NODE` so re-ranking can never break a lookup again. The pacing figures in this record predate that change and must be re-simulated.

Implemented locally from brief `cc2569b7-19ce-40c3-8a61-1a0e9df24325`, September 8, 2026. This is the current implementation record; the earlier 60-node results in `UPGRADES-OVERHAUL.md` are historical.

## Progression and interaction

The six independent maps now contain exactly 103 upgrades: Hand Chisel 16, Ice Pick 17, Heavy Pick 17, Sledgehammer 17, Powered Breaker 17, Thermal Tool 19. Small multiplicative fittings lead into authored mechanics. Speed has a per-tool floor. Each purchased branch exposes its next steps progressively; distant nodes and connections stay hidden.

The Hand Chisel page is always present, including the real tutorial Hold to Chip purchase. Story reveals the other equipment pages; buying equipment is still a separate transaction. Existing engravings follow the meaning of their upgrades, with incised rank details for the new micro tiers and distinct milestone art. There are 60 original engraving subjects with tier variations, rather than 103 unrelated category symbols.

Pointer hover owns a mouse tooltip, keyboard focus owns keyboard inspection, and touch inspection requires an explicit Buy action. Leaving a node closes its hover panel in 110ms; moving onto the panel permits its purchase control. Mouse purchase does not pin inspection. Empty-map taps close touch details. Animated labels reserve their final layout and limit displacement to their control's available padding, including Save Slots.

Minor purchases squash and rebound, the incoming connection fills, then the next node wakes after 350ms. Independent purchases retain independent timelines. Closing, switching pages, and reopening do not replay acquisition. Numeric comparisons now show cumulative before/after values, including the prerequisites of a locked preview.

## Saves and actual tool effects

Tree revision 2 migrates the old 60-node IDs by meaning, fills prerequisite prefixes, and preserves any stronger paid numerical benefits as explicit carry factors. It preserves money, active ice, rewards, story progress, tools and old mechanics, including the old charged swing, momentum, sustained breaker boost and focused thermal boost. Migration is idempotent across subsequent reloads.

New effects operate in the actual model: local release, center force, weakened ice, depth, side control, support damage, charged force, bit steadiness, resonance, debris release, fuel/burn efficiency, wide heat, residual heat and echo. Alternative breaker bits and thermal nozzles use the new milestone IDs. The chisel still damages ice on its first update. Unsupported treasure still releases on the edited frame.

The lean Ice Pick has a narrow shaft and small adze. Heavy Pick has a broad forged wedge, larger collar, thicker shaft and reinforced grip. Both use authored contact origins. The tool frame maintains an upright handle through top, side and corner contacts, with bounded shortest-path rotation. Swing timing now separates anticipation, accelerated downswing, follow-through, recoil and settling. The breaker has bit compression and vibration; the thermal tool has a flexible hose response.

## Delivery Complete

Every full campaign delivery produces a full-screen settlement; individual compartments do not. The existing guided tutorial receipt remains part of its teaching sequence. The title's letters arrive individually, followed by rolling recovered funds, Tony's cut, and the larger net amount. Finds, best find/value, active bench time and the next available equipment or fitting goal follow.

The intro takes 2.4 seconds. Input is guarded for the first 800ms; the first confirmation during animation reveals the finished results, and another continues. Otherwise the screen waits indefinitely. Enter, Space, Escape and controller confirmation are supported. Calls wait behind settlement. Reloading a pending settlement restores its final results without replaying credits; continuing advances exactly once. Per-delivery counters reset after the tutorial and between full deliveries, not between compartments.

## Audio

The purchase family is synthesized locally: a mechanical clack, a quiet 480/620Hz rise, and a short ice tick. Minor, milestone and tool acquisition have different weight and duration, each with four variations. Delivery has a separate stamp and paper transient. The previous purchase latch is no longer layered into this family.

Three A/B/C candidates, the selected B sequence repeated 30 times, and a delivery stamp are generated under ignored `qa-artifacts/`. Waveform checks cover attack, peak, duration, tail and independent repetition. Candidate B has a quieter high-frequency component than A. **No human listening or subjective fatigue verdict is claimed.** The A/B/C and 30-repeat files remain available for listening review.

## Measured pacing

Nine deterministic full-campaign runs used earned money and ordinary model updates with targeting against the generated ice surface. They include the real tutorial and modeled dialogue overhead; they are not human playthrough timings.

- Saver: 86.97 minutes, 68 nodes.
- Upgrader: 89.03 minutes, 71 nodes.
- Mixed: 88.41 minutes, 70 nodes.
- Cheapest-first: 89.01 minutes, 78 nodes.
- Power-first: 88.17 minutes, 68 nodes.
- Speed-first: 88.05 minutes, 68 nodes.
- Control-first: 85.73 minutes, 67 nodes.
- Technique-first: 89.46 minutes, 65 nodes.
- Inefficient aim/latest-tool policy: 98.28 minutes, 66 nodes.

Normal average purchase intervals are 68–83 seconds. The longest measured stretch without any affordable reachable fitting or equipment purchase is 155 seconds. This opportunity measure includes useful older-tool branches; choosing to save instead can produce longer actual purchase gaps. Cheapest-first deliberately fills inexpensive retired-tool branches and exceeds the typical ownership target. Upgrader finishes one node above its approximate 70-node target. Every policy leaves substantial postgame progression.

Tool prices remain $650 / $2,800 / $8,000 / $17,500 / $20,000 after the free chisel. Small first-tier fittings are inexpensive; later tiers rise with delivery earnings. Prices were adjusted after simulations rather than keeping the initial percentage suggestions rigidly, with some late capstones priced for postgame. To keep the smaller increments from extending the campaign, non-tutorial baseline strike force and footprint were recalibrated; ice health was not inflated.

The equal-spend comparison exercises four distinct legal branch priorities, six tools and two real compartments per tool: all 48 fixtures complete. Each priority spends exactly $167,850 across its fixtures. Total clear times are Power 738.15s, Speed 780.80s, Control 765.55s, Technique 790.15s, a 7.04% spread from fastest to slowest. Individual shapes favor different investments.

## Three review and fix passes

1. **Progression and input:** Replaced the tutorial-only upgrade card with the actual chisel map; separated tooltip ownership; fixed hidden-node CSS overriding the HTML hidden attribute. The first 103-node simulation took 108.66 minutes with 88 purchases. Recalibrated baseline work and later costs rather than increasing ice health or reducing equipment prices.
2. **State and physical presentation:** Reload testing exposed recovered-find counters being incremented twice; removed that restore-time increment. Tool-art review found detached grip ribs on the lean pick; moved the ribs onto each tool's grip. Updated breaker mode buttons still pointing at the previous unlock IDs and verified stable top/side/corner frames.
3. **Payoff and final interaction:** Fixed counters rolling from their final mounted value, reset delivery timing/counts after the tutorial, excluded paused/call time, and corrected keyboard inspection retaining a stale hover. Also removed mouse-focus ownership from the tooltip's Buy button. Re-ran campaign, migration, layout, tutorial, branch reveal and purchase checks on the integrated build.

## Verification and reproduction

95 automated tests pass, covering migration across every old branch prefix, independent purchases, actual field effects, cadence, contact/release, full campaign completion, settlement reload/credit safety, stable orientation and audio buffers. TypeScript, lint and the production static build pass.

Live isolated browser audits passed the actual tutorial purchase and return path, separate tool pages and remembered views, and purchase/path/child animation sequencing including overlapping purchases and reduced motion. Animated-label containment and tooltip checks passed at 1280×720, 1280×800, 1920×1080 and 2560×1440, using a visible browser and explicitly sized same-origin review frames for the larger sizes. Normal and large UI settings were exercised. These are DOM bounds checks plus visual review, not four physical display tests.

Final interaction checks also passed touch inspection without spending, explicit touch purchase, empty-map dismissal, mouse purchase without pinned inspection, and all 12 controller navigation checks. All seven internal tool variants moved and removed real ice in the live motion audit. Its obsolete fixed aim point was replaced with a profile-relative target before accepting those measurements. All 16 pick/chisel contact poses passed with depth testing enabled. The finished delivery screen was visually inspected, waited for input, and returned to the bench on Continue. The final pick grips were re-rendered alongside their same-scale silhouettes after the rib fix.

Run `npm test`, `npx tsc --noEmit`, `npm run build`, then `node tests/run-progression.mjs` and `node tests/compare-branches.mjs`. `npm start` serves `http://localhost:4173/`. The `?qa=1` practice bench uses disposable memory state. Its WebMCP audits include `test_overhaul_ui`, `test_polish_interactions`, `test_tutorial_ui`, `test_controller_navigation`, and `test_motion_choreography`; `practice_delivery` opens a representative payoff fixture. Normal player saves were not reset or used as test fixtures.
