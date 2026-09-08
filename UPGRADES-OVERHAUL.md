# Frozen Assets — tool-tree overhaul

Implemented locally from brief b3097f6d-9452-4db8-b578-0cd2f80eeae7 and the accompanying recording. Nothing was published, uploaded, or committed. Earlier QA documents describe historical versions.

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
