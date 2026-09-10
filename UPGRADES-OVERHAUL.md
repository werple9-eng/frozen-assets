# Frozen Assets — tool-tree overhaul

The current 103-node implementation, delivery screen, migration, sound and validation results are recorded in [DELIVERY-PASS.md](DELIVERY-PASS.md). The 60-node records below describe the preceding passes.

## Previous pass — original icons and growing branches, September 8

Source of truth: `344bd79d-8818-42d2-9191-747d738972b6/pasted-text.txt`, with the user's additional emphasis on small icons and purchase/reveal animation. Changes remain local. The pre-existing six-tool, 60-node mechanics and saved IDs are retained.

Each upgrade now has its own authored SVG engraving. Working parts use readable solid silhouettes; cut lines, ice, motion arcs, fracture marks, fan profiles and tank shapes communicate the actual effect. Seven motion families animate the engraved working part independently of the face. All 60 drawings were reviewed together at their actual 36px rendering size; they are original code-native artwork, with no icon library badges.

The six maps now have separately authored coordinates, rather than rotations of a shared radial formula. Hand Chisel is compact, Ice Pick balanced, Heavy Pick broad, Sledge swept outward, Breaker offset and mechanical, Thermal curved around the root. The normal 55px faces retain fixed 82px hit targets. Major diamonds use a 52px side (approximately 74px across).

Purchase choreography is explicit and interruptible: press scale .90, purchase overshoot 1.13 (major .88 / 1.14), branch fill, 260ms parent-to-node stroke following a 70ms start, then child reveal at 350ms from .70 scale. Child overshoot reaches 1.105 and settles to 1. Distant paths fade afterward. Independent purchases retain independent timelines. Closing/switching clears timers; reopening never replays acquisition. A dedicated outer entrance layer prevents the entrance animation from restarting when a purchase's classes are removed. Replacing the purchased SVG restarts its working-part animation even if it was already hovered.

Drag input now converts a node press into pan after 7px, suppresses the resulting pointer click, and leaves keyboard confirmation usable. Panning stops immediately on regrab. Keyboard/gamepad direction selects a connected graph neighbor; bumpers cycle owned tool pages. Tooltip placement scores four directions, avoids the selected node and nearby affordable nodes where possible, and clamps to the viewport. Pointer focus does not recenter the map underneath a press; keyboard focus keeps the selected node in the usable area. Map content is clipped beneath the navigation and above the bench button. Tooltip buttons use a single flat footer instead of nested frames.

### Current verification

- 91 automated tests pass, including branch growth scope/order, connected navigation, tooltip bounds, 60-node geometry, mechanical effects, independent purchases, migration, save restore, immediate chisel impacts and same-frame object release.
- TypeScript, targeted lint and the production build pass.
- Live growth audit passes: real money charged exactly once, progressing stroke, delayed child, measured spring, overlapping purchases, cleanup, no acquisition replay on reopen, and reduced motion. Samples showed path offset moving from 1 to 0 before the child appeared, then child scale .70 → 1.105 → 1.
- The actual browser node-drag check preserved the balance and did not purchase. Controller audit passes all 12 checks. Independent tool purchases and remembered views pass. Fullscreen map, continuous synchronized wheel/rail zoom, and reopened view checks pass.
- Fresh tutorial UI audit passes the first purchase, focus/return, second parcel, letter audio, player-paced calls, stable labels, Settings separation and archive bounds. This is an automated live player journey, not a new human playtest.
- Reference comparison used the retained contact sheets covering the 58.37s recording, plus the earlier full-size reference frames. The original Windows temporary MP4 is no longer at its attached path. This pass could not replay the video or reassess its audio/frame-by-frame timing. No copied artwork was used.
- Browser visuals were inspected at the available 1280×720 viewport. The requested viewport override did not change the rendered dimensions, so no new 960×540 visual pass is claimed; smaller-screen tooltip clamping is covered by deterministic tests.

### Nine-policy pacing rerun

The simulator now includes Control-first and records balances/blocks at reveal and purchase, affordable choices at campaign snapshots, branch purchases, tool usage, and average node intervals. It changes a heat mode or breaker bit only when the desired selection changes; repeatedly reselecting them would incorrectly cancel sustained operation.

Completion minutes: Saver 90.09; Upgrader 89.97; Mixed 90.34; Cheapest-first 89.97; Power-first 88.91; Speed-first 91.20; Control-first 91.29; Technique-first 91.40; Inefficient 108.46. Every run finished with 51 nodes, leaving nine for postgame. Longest normal tool save was 817 seconds (13.62 minutes). Longest interval without an affordable reachable purchase was 361 seconds (6.02 minutes). Normal average node interval was 104–108 seconds, somewhat faster than the aspirational 2–4 minute cadence because later cheap catch-up purchases cluster together; the inefficient policy averaged 124 seconds.

Mixed revealed/purchased tools at: Pick 10.43/14.45, Heavy 22.11/28.90, Sledge 35.73/44.48, Breaker 54.86/61.08, Thermal 64.35/74.95 minutes. Thermal remains a few minutes early relative to the suggested window. Upgrader's saving behavior brings Thermal acquisition later. Prices and gameplay modifiers were not changed merely to force exact timestamps.

Equal-money comparison now covers all four priorities, six tools and two real claim compartments per tool (48 cases). Each priority spent exactly $152,150 across the fixtures. Total clear seconds: Power 911.80; Speed 997.90; Control 880.90; Technique 896.85. Spread relative to fastest: 13.28%; all cases completed. Control wins this representative mix, while different tool/shape pairings favor other investments. Equal-price selection keeps maximum preferred-branch ownership and chooses distinct tied loadouts, rather than silently comparing the same build twice.

### Five review passes

1. **Progression:** Retained the brief's meaningful 8/10/10/10/10/12-node structure and permanent ownership. Four immediate branch choices, one dim step and one unknown step preserve planning without dumping other tools' maps.
2. **Economy:** Added the missing ninth policy and four-priority equal-spend comparison; fixed mode switching in the simulator. Recorded the timing/interval limits above rather than representing simulations as human timings.
3. **Tool identity:** Reviewed the 60 effects against the brief and gave each icon a tool-specific physical subject and action. Existing mechanics, alternative bits, charged swings and thermal residual behavior remain covered by tests.
4. **UI/reference:** Replaced repeated category badges, authored six different map silhouettes, fixed node-origin drags, tooltip placement/frames, connected navigation, growth timing and entrance replay. Visually checked all engravings and live map states.
5. **Player journey:** Re-ran the live tutorial, first upgrade, controller, map and purchase audits on disposable practice saves. Normal campaign simulation remains approximately 90 minutes. Human first-play pacing and direct video playback remain external validation limits.

Reproduce with `npm test`, `npx tsc --noEmit`, `npm run build`, `node tests/run-progression.mjs`, and `node tests/compare-branches.mjs`. At `?qa=1`, `test_polish_interactions` with `scenario: "growth"` measures the actual DOM animation sequence. Reports under `qa-artifacts/` are ignored local test output.

## Previous implementation record

The following records the earlier baseline work from brief b3097f6d-9452-4db8-b578-0cd2f80eeae7. It was subsequently committed as `d9cd993`; measurements below are historical and the current results above supersede them.

## Implementation

- Six independent tool maps: Hand Chisel (8 nodes), Ice Pick (10), Heavy Pick (10), Sledgehammer (10), Powered Breaker (10), Thermal Tool (12). All 60 nodes have gameplay effects. Hold to Chip belongs to the chisel; the internal grip identifier remains for compatibility.
- Upgrades opens directly into the full-screen map. Compact tool tabs sit above the title, undiscovered tools show question marks, and each family has its own radial arrangement, purchases, reveal state, and saved pan/zoom.
- Original tool silhouettes and branch marks, muted force/speed/control/technique colors, thin connections, progressive discovery, and adjacent clamped details. Ordinary faces are 55 map pixels with 82-pixel hit targets; default zoom produces approximately 48-pixel faces and 72-pixel targets. Major nodes are diamonds. Purchased nodes no longer inherit oversized background boxes.
- Controlled pan inertia, immediate cancellation on grab, shared smooth wheel/rail zoom, and spatial keyboard/controller navigation. Bumpers switch pages. Hidden maps do not animate, and map movement does not rerender React every frame.
- Story reveals equipment. Available, ready-once, and acquired presentations use the actual 3D models. Inspection shows price, balance, and the amount still needed. A separate paid purchase adds the tool to the physical rack.
- Chisel damage starts immediately without the added anticipation delay. Camera height changes from 17 to 14.7 while retaining its target and visible ice top.

Effects operate on the actual ice field: impact, tempo, contact depth, area, center force, damaged ice, visible ice, supports, and detachment. Mechanics include held chisel work, pick rhythm and split hits, heavy-pick breakthrough/spall, charged sledge strikes, breaker sustained pressure/resonance and switchable bits, thermal fan control, free rest refilling, residual heat, and a one-shot heat echo. Gradual pointer travel also triggers the echo; it cannot form a repeating damage chain. Campaign thermal base heat was strengthened so the tool is useful before purchasing upgrades.

The campaign retains 32 deliveries and five chapters. Fresh claims contain 89 distinct compartments across parcel, slab, tower, wings, seam, and archive shapes. There are no real-time equipment gates or scalar HP inflation. The mixed simulator switches back to heavy pick, sledge, and breaker for their useful roles.

Legacy upgrades map into corresponding nodes while retaining previous numerical benefits. Balance, rewards, selected equipment, completed story, and chipped ice survive. An old active claim retains layout version 1 until the next delivery; new claims use version 2. Notice history, nodes, bit selection, and per-tool views persist. Unsupported-object release still uses the generated surface and clears the fall corridor in the same update.

## Measured economy

Centralized equipment prices: Chisel $0; Ice Pick $650; Heavy Pick $2,800; Sledgehammer $8,000; Powered Breaker $17,500; Thermal Tool $20,000.

Median net earnings per completed claim across the six story stages are $172, $528, $2,429, $5,796, $8,648.50, and $13,285. The tutorial's $190 net is excluded. Node budget anchors are $175, $550, $1,900, $4,200, $6,500, and $13,000. These are calibration values, not mislabeled measurements: middle-stage anchors are discounted to keep fittings reachable while saving. Final prices depart from the brief's initial suggested ratios after testing actual earned-money purchases and compartment durations.

Eight complete fresh-campaign simulations, including the tutorial and authored calls:

- Saver: **90.04 minutes**, 51 nodes, $6,346 remaining.
- Upgrader: **90.01 minutes**, 51 nodes, $6,346 remaining.
- Mixed: **90.27 minutes**, 51 nodes, $6,346 remaining.
- Cheapest-first: **90.01 minutes**, 51 nodes, $6,346 remaining.
- Power-first: **88.83 minutes**, 51 nodes, $1,146 remaining.
- Speed-first: **91.16 minutes**, 51 nodes, $1,146 remaining.
- Technique-first: **91.36 minutes**, 51 nodes, $6,346 remaining.
- Inefficient but reasonable: **108.07 minutes**, 51 nodes, $6,521 remaining.

Each earned $171,605 gross and $158,121 net. Mixed equipment reveal / purchase / saving times, in minutes:

- Ice Pick: 10.43 / 14.45 / 4.02.
- Heavy Pick: 22.11 / 28.90 / 6.79.
- Sledgehammer: 35.73 / 44.48 / 8.76.
- Powered Breaker: 54.86 / 61.08 / 6.23.
- Thermal Tool: 64.35 / 74.88 / 10.53.

The longest saving period across all policies is **13.67 minutes**. The longest active interval without an affordable node or equipment purchase is **361 seconds (6.02 minutes)**. Acquiring equipment ends this interval even if spending leaves no cash for its first node. Voluntarily saving despite affordable nodes is measured separately: the mixed policy's longest actual purchase gap is 7.43 minutes, and the inefficient saver reaches 13.10. Mixed and upgrade-heavy policies purchase fittings while saving. Nine nodes remain for postgame.

Equal-spend branch comparison covers six tools, three priorities, and two compartment profiles per tool: 36 fixtures, with each strategy spending exactly $140,050 across the set. Force takes 965.55 seconds, speed 986.10, and technique 905.00. The slowest is **8.96%** behind the fastest. Individual tool/shape matchups differ.

These are deterministic surface-targeting simulations, not human first-play timings. They use ordinary GameModel updates, raycast the generated surface, purchase with earned money, and read every call panel with modeled overhead. They do not grant money or skip claims. Reading totals 4.96 minutes, including the 2.19-minute tutorial. The inefficient policy refreshes its aim less often and sticks with its latest tool. Upgrader and cheapest-first converge on the same purchases here; branch-first policies and the equal-spend comparison exercise different choices.

Calibration limits: the stress policy exceeds the softer 105-minute range but stays below the 110-minute ceiling. Mixed discovers/buys Thermal a few minutes earlier than the approximate target; buying more fittings moves acquisition to 78.8 minutes. Human reading, aiming, exploration, and subjective feel still need first-play observation. These runs cannot guarantee every human campaign lasts 75–95 minutes.

## Validation

- **88 unit tests pass**: all 60 definitions, legal completion, prerequisites, purchase isolation, per-tool serialization, migration, old active-claim geometry, immediate chisel contact, charged strikes, actual field modifiers, heat echo, and same-update release.
- TypeScript checking, targeted lint, and the production static build pass.
- Live isolated browser audits pass: direct Upgrades/Settings, full-screen map, smooth synchronized zoom, remembered views, locked names, separate purchases, and buying another tool's fitting without changing equipped equipment.
- Tutorial UI audit passes: letter sounds, silent reveal, player-paced calls, stable labels, real Hold to Chip purchase for $25, $37 remainder, focus return, and second parcel. A complete tutorial run also reloads every checkpoint and finishes.
- Controller audit passes all 12 checks, including spatial selection, bumpers, pan, zoom, confirm, phone, tool cycling, and Back to Bench.
- The reported repeating call advances once and closes. Button lettering settles without another hover.
- Camera bounds remain finite and reachable at minimum, midpoint, and maximum zoom. The lower view was inspected with the top visible.
- Read-only migration audit passes for all three current version-4 save slots: slot 1 has $121,494 and 440 recoveries, slot 2 has $1,343 and 39 recoveries, and slot 3 retains its $0 induction checkpoint. Balance, owned tools, nodes, legacy upgrades, reward credits, chipped field, and progression are preserved in each. The older version-3 backup also passes ($6,705 and 134 recoveries). Fixtures used the isolated `?qa=1` bench; no player recovery was reset or played.
- Tool inspection, actual purchase, balance subtraction, acquired presentation, and its map were exercised live. Tooltips were checked within 960×540; default node size and transparent outer hit targets were measured in the browser.

The 58.37-second reference was reviewed through sequential one-second contact sheets covering the full recording, then full-size frames at 10, 35, and 50 seconds were compared again. This is frame-based visual review, not a claim of frame-perfect playback or audio comparison. It informed compact asymmetrical clusters, negative space, small icons, thin paths, nearby details, restrained navigation, and the right zoom rail. Artwork remains original.

## Reproduce

Run `npm test`, `npx tsc --noEmit`, and `npm run build`. After tests compile the model, run `node tests/run-progression.mjs` and `node tests/compare-branches.mjs`. Per-claim timing, balances at purchase, notices, purchases, and all eight summaries are written to ignored `qa-artifacts/`. `npm start` serves `http://localhost:4173/`; `?qa=1` opens a disposable practice bench.
