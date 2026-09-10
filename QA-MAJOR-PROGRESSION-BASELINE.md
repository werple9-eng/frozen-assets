# Frozen Assets — development baseline before major progression overhaul

Captured 2026-09-09T05:26:14.848Z. This records the current dirty local workspace, not GitHub. Source, compiled model, status, diff, and previous simulation artifacts are frozen in ignored `qa-artifacts/major-baseline-source`. No player save was read or changed.

## Snapshot

- Branch: `codex/frozen-assets`; commit: `d9cd9936a6d13d0c6a926a5a009a65a1af9e3caf`.
- Save version 4; campaign revision 1; layout version 2; tree revision2.
- 95 tests pass; build passes. Logs: `qa-artifacts/major-baseline-tests.log`, `qa-artifacts/major-baseline-build.log`.
- 32 deliveries, 103 nodes, six physical tools. Hold to Chip/grip is a hand/chisel alias.
- The working tree already contains the 103-node overhaul, semantic tree migration, tool art, full-screen delivery payoff, and input fixes. Preserve these changes.

## Current tools

| Tool | Price | Reveal delivery | Nodes |
|---|---:|---:|---:|
|Hand chisel|$0|1|16|
|Ice pick|$650|5|17|
|Heavy pick|$2800|10|17|
|Sledgehammer|$8000|17|17|
|Powered breaker|$17500|24|17|
|Thermal tool|$20000|28|19|

## Campaign fields and payouts

Sizes are actual generated isosurface AABBs after loot pockets, in world units (width × height × depth). Each row represents one physical phase. All phases use the same 23 × 14 × 15 topology. Meaningful solid threshold is >0.5. Full scalar-array bounds and uncarved counts are included in the JSON. Payout is authored gross, before Tony's commission; total net is measured per policy below.

The existing source has no authored active-clear target per delivery. The expected-time column explicitly records that absence; adopting the new brief's timings as the old baseline would fabricate a comparison. Mixed experience seconds include modeled reading, decisions and settlement. Active seconds below come from the separate instrumented frozen-model replay.

| Delivery / name | Ch. | Phase/profile | World dimensions | Grid | Samples | Solid | Loot | Gross | Expected active s | Mixed active s / delivery | Mixed experience s / delivery |
|---|---:|---|---|---|---:|---:|---:|---:|---|---:|---:|
|1. First claim|1|1/3 parcel|4.02 × 2.32 × 2.60|23×14×15|4830|1665|2|$20|Not authored|17.55|30|
|1. First claim|1|2/3 parcel|4.02 × 2.32 × 2.60|23×14×15|4830|1665|2|$20|Not authored|—|—|
|1. First claim|1|3/3 slab|4.02 × 1.69 × 2.60|23×14×15|4830|1104|2|$20|Not authored|—|—|
|2. Petty cash|1|1/3 parcel|5.92 × 3.41 × 3.83|23×14×15|4830|1656|3|$65|Not authored|65.05|74|
|2. Petty cash|1|2/3 slab|5.92 × 2.48 × 3.83|23×14×15|4830|1095|3|$65|Not authored|—|—|
|2. Petty cash|1|3/3 slab|5.92 × 2.48 × 3.83|23×14×15|4830|1095|3|$65|Not authored|—|—|
|3. Personal effects|1|1/3 slab|7.81 × 3.28 × 5.05|23×14×15|4830|1113|3|$65|Not authored|81.05|103|
|3. Personal effects|1|2/3 parcel|7.81 × 4.50 × 5.05|23×14×15|4830|1674|3|$65|Not authored|—|—|
|3. Personal effects|1|3/3 tower|5.05 × 4.50 × 5.05|23×14×15|4830|1080|3|$65|Not authored|—|—|
|4. Counter deposit|1|1/3 tower|6.28 × 5.59 × 6.28|23×14×15|4830|1081|4|$110|Not authored|114|123|
|4. Counter deposit|1|2/3 slab|9.70 × 4.08 × 6.28|23×14×15|4830|1114|4|$110|Not authored|—|—|
|4. Counter deposit|1|3/3 tower|6.28 × 5.59 × 6.28|23×14×15|4830|1081|4|$110|Not authored|—|—|
|5. Wrong account|1|1/3 archive|11.60 × 6.68 × 7.50|23×14×15|4830|1575|4|$110|Not authored|133.9|162|
|5. Wrong account|1|2/3 slab|11.60 × 4.87 × 7.50|23×14×15|4830|1114|4|$110|Not authored|—|—|
|5. Wrong account|1|3/3 tower|7.50 × 6.68 × 7.50|23×14×15|4830|1081|5|$110|Not authored|—|—|
|6. Pooled custody|2|1/3 slab|11.83 × 4.97 × 7.66|23×14×15|4830|1113|5|$165|Not authored|167.9|186|
|6. Pooled custody|2|2/3 slab|11.83 × 4.97 × 7.66|23×14×15|4830|1113|5|$165|Not authored|—|—|
|6. Pooled custody|2|3/3 seam|11.83 × 6.82 × 7.66|23×14×15|4830|1608|5|$165|Not authored|—|—|
|7. Maintenance lot|2|1/3 seam|12.30 × 7.09 × 7.96|23×14×15|4830|1608|5|$200|Not authored|110.25|130|
|7. Maintenance lot|2|2/3 slab|12.30 × 5.17 × 7.96|23×14×15|4830|1113|5|$200|Not authored|—|—|
|7. Maintenance lot|2|3/3 tower|7.96 × 7.09 × 7.96|23×14×15|4830|1080|5|$200|Not authored|—|—|
|8. Estate effects|2|1/3 wings|12.54 × 7.22 × 8.12|23×14×15|4830|784|5|$210|Not authored|71.4|81|
|8. Estate effects|2|2/3 slab|12.54 × 5.27 × 8.12|23×14×15|4830|1113|5|$210|Not authored|—|—|
|8. Estate effects|2|3/3 seam|12.54 × 7.22 × 8.12|23×14×15|4830|1608|6|$210|Not authored|—|—|
|9. Mixed identifiers|2|1/3 tower|8.42 × 7.50 × 8.42|23×14×15|4830|1083|6|$300|Not authored|97.85|119|
|9. Mixed identifiers|2|2/3 slab|13.02 × 5.47 × 8.42|23×14×15|4830|1116|6|$300|Not authored|—|—|
|9. Mixed identifiers|2|3/3 tower|8.42 × 7.50 × 8.42|23×14×15|4830|1083|6|$300|Not authored|—|—|
|10. Sealed cash|2|1/3 archive|13.37 × 7.70 × 8.65|23×14×15|4830|1577|6|$315|Not authored|92.25|108|
|10. Sealed cash|2|2/3 slab|13.37 × 5.62 × 8.65|23×14×15|4830|1116|6|$315|Not authored|—|—|
|10. Sealed cash|2|3/3 seam|13.37 × 7.70 × 8.65|23×14×15|4830|1611|6|$315|Not authored|—|—|
|11. Internal review|2|1/3 seam|13.72 × 7.91 × 8.88|23×14×15|4830|1611|6|$360|Not authored|93|112|
|11. Internal review|2|2/3 wings|13.72 × 7.91 × 8.88|23×14×15|4830|787|6|$360|Not authored|—|—|
|11. Internal review|2|3/3 seam|13.72 × 7.91 × 8.88|23×14×15|4830|1611|7|$360|Not authored|—|—|
|12. Inventory variance|3|1/3 slab|14.20 × 5.96 × 9.19|23×14×15|4830|1116|6|$820|Not authored|101.8|127|
|12. Inventory variance|3|2/3 wings|14.20 × 8.18 × 9.19|23×14×15|4830|787|6|$820|Not authored|—|—|
|12. Inventory variance|3|3/3 archive|14.20 × 8.18 × 9.19|23×14×15|4830|1577|6|$820|Not authored|—|—|
|13. Emergency access|3|1/3 wings|14.79 × 8.52 × 9.57|23×14×15|4830|786|7|$920|Not authored|72.35|94|
|13. Emergency access|3|2/3 wings|14.79 × 8.52 × 9.57|23×14×15|4830|786|7|$920|Not authored|—|—|
|13. Emergency access|3|3/3 seam|14.79 × 8.52 × 9.57|23×14×15|4830|1610|7|$920|Not authored|—|—|
|14. Bearer instruments|3|1/3 tower|9.80 × 8.72 × 9.80|23×14×15|4830|1082|7|$950|Not authored|85.6|95|
|14. Bearer instruments|3|2/3 wings|15.14 × 8.72 × 9.80|23×14×15|4830|786|7|$950|Not authored|—|—|
|14. Bearer instruments|3|3/3 archive|15.14 × 8.72 × 9.80|23×14×15|4830|1576|7|$950|Not authored|—|—|
|15. Exception inventory|3|1/3 archive|15.62 × 9.00 × 10.11|23×14×15|4830|1576|7|$1020|Not authored|85.2|95|
|15. Exception inventory|3|2/3 wings|15.62 × 9.00 × 10.11|23×14×15|4830|786|7|$1020|Not authored|—|—|
|15. Exception inventory|3|3/3 seam|15.62 × 9.00 × 10.11|23×14×15|4830|1610|7|$1020|Not authored|—|—|
|16. Brittle annex|3|1/3 wings|15.97 × 9.20 × 10.34|23×14×15|4830|785|8|$1205|Not authored|86.85|97|
|16. Brittle annex|3|2/3 wings|15.97 × 9.20 × 10.34|23×14×15|4830|785|8|$1205|Not authored|—|—|
|16. Brittle annex|3|3/3 archive|15.97 × 9.20 × 10.34|23×14×15|4830|1575|8|$1205|Not authored|—|—|
|17. Withheld release|3|1/3 seam|16.57 × 9.54 × 10.72|23×14×15|4830|1609|8|$1285|Not authored|186.15|204|
|17. Withheld release|3|2/3 wings|16.57 × 9.54 × 10.72|23×14×15|4830|785|8|$1285|Not authored|—|—|
|17. Withheld release|3|3/3 seam|16.57 × 9.54 × 10.72|23×14×15|4830|1609|8|$1285|Not authored|—|—|
|18. Exception 7C|3|1/3 archive|17.16 × 9.88 × 11.10|23×14×15|4830|1575|8|$1365|Not authored|199.05|225|
|18. Exception 7C|3|2/3 wings|17.16 × 9.88 × 11.10|23×14×15|4830|785|8|$1365|Not authored|—|—|
|18. Exception 7C|3|3/3 archive|17.16 × 9.88 × 11.10|23×14×15|4830|1575|9|$1365|Not authored|—|—|
|19. Downstairs equipment|4|1/3 tower|11.48 × 10.22 × 11.48|23×14×15|4830|1081|8|$1505|Not authored|216.25|235|
|19. Downstairs equipment|4|2/3 archive|17.75 × 10.22 × 11.48|23×14×15|4830|1575|8|$1505|Not authored|—|—|
|19. Downstairs equipment|4|3/3 wings|17.75 × 10.22 × 11.48|23×14×15|4830|785|8|$1505|Not authored|—|—|
|20. Service channel|4|1/3 seam|20.50 × 12.69 × 11.87|23×14×15|4830|2202|9|$2100|Not authored|169.9|192|
|20. Service channel|4|2/3 archive|20.50 × 12.69 × 11.87|23×14×15|4830|2174|9|$2100|Not authored|—|—|
|20. Service channel|4|3/3 tower|11.87 × 12.69 × 11.87|23×14×15|4830|1322|9|$2100|Not authored|—|—|
|21. Preservation machinery|4|1/3 wings|18.70 × 10.77 × 12.10|23×14×15|4830|784|9|$2205|Not authored|92.15|102|
|21. Preservation machinery|4|2/3 archive|18.70 × 10.77 × 12.10|23×14×15|4830|1574|9|$2205|Not authored|—|—|
|21. Preservation machinery|4|3/3 wings|18.70 × 10.77 × 12.10|23×14×15|4830|784|9|$2205|Not authored|—|—|
|22. Thermal service|4|1/3 archive|19.17 × 11.04 × 12.40|23×14×15|4830|1574|9|$2385|Not authored|137.95|148|
|22. Thermal service|4|2/3 archive|19.17 × 11.04 × 12.40|23×14×15|4830|1574|9|$2385|Not authored|—|—|
|22. Thermal service|4|3/3 tower|12.40 × 11.04 × 12.40|23×14×15|4830|1080|9|$2385|Not authored|—|—|
|23. Unreleased holdings|4|1/3 slab|19.76 × 8.30 × 12.79|23×14×15|4830|1112|10|$2715|Not authored|102.45|114|
|23. Unreleased holdings|4|2/3 archive|19.76 × 11.38 × 12.79|23×14×15|4830|1573|10|$2715|Not authored|—|—|
|23. Unreleased holdings|4|3/3 wings|19.76 × 11.38 × 12.79|23×14×15|4830|783|10|$2715|Not authored|—|—|
|24. Liability archive|4|1/3 seam|20.11 × 11.59 × 13.02|23×14×15|4830|1607|10|$2895|Not authored|187.85|208|
|24. Liability archive|4|2/3 archive|20.11 × 11.59 × 13.02|23×14×15|4830|1573|10|$2895|Not authored|—|—|
|24. Liability archive|4|3/3 tower|13.02 × 11.59 × 13.02|23×14×15|4830|1079|10|$2895|Not authored|—|—|
|25. The remaining route|4|1/2 archive|20.71 × 11.93 × 13.40|23×14×15|4830|1573|10|$4520|Not authored|69.95|92|
|25. The remaining route|4|2/2 archive|20.71 × 11.93 × 13.40|23×14×15|4830|1573|11|$4520|Not authored|—|—|
|26. Sublevel B intake|5|1/2 tower|13.78 × 12.27 × 13.78|23×14×15|4830|1079|10|$4880|Not authored|158.7|193|
|26. Sublevel B intake|5|2/2 seam|21.30 × 12.27 × 13.78|23×14×15|4830|1607|10|$4880|Not authored|—|—|
|27. Prestige custody|5|1/2 wings|21.89 × 12.61 × 14.16|23×14×15|4830|782|11|$5320|Not authored|168.05|180|
|27. Prestige custody|5|2/2 seam|21.89 × 12.61 × 14.16|23×14×15|4830|1606|11|$5320|Not authored|—|—|
|28. Manual clearance|5|1/2 seam|22.48 × 12.95 × 14.55|23×14×15|4830|1606|11|$5520|Not authored|265.6|284|
|28. Manual clearance|5|2/2 seam|22.48 × 12.95 × 14.55|23×14×15|4830|1606|11|$5520|Not authored|—|—|
|29. Master records|5|1/2 archive|23.07 × 13.29 × 14.93|23×14×15|4830|1571|12|$6900|Not authored|288.65|295|
|29. Master records|5|2/2 seam|23.07 × 13.29 × 14.93|23×14×15|4830|1605|12|$6900|Not authored|—|—|
|30. Last holdings|5|1/2 slab|23.66 × 9.94 × 15.31|23×14×15|4830|1110|12|$7220|Not authored|342.95|374|
|30. Last holdings|5|2/2 seam|23.66 × 13.63 × 15.31|23×14×15|4830|1605|12|$7220|Not authored|—|—|
|31. Archive antechamber|5|1/2 wings|24.26 × 13.97 × 15.70|23×14×15|4830|781|12|$7780|Not authored|258.7|269|
|31. Archive antechamber|5|2/2 seam|24.26 × 13.97 × 15.70|23×14×15|4830|1605|12|$7780|Not authored|—|—|
|32. The Vault|5|1/3 wings|25.44 × 14.65 × 16.46|23×14×15|4830|788|5|$5840|Not authored|268.5|321|
|32. The Vault|5|2/3 seam|25.44 × 14.65 × 16.46|23×14×15|4830|1612|5|$5840|Not authored|—|—|
|32. The Vault|5|3/3 archive|25.44 × 14.65 × 16.46|23×14×15|4830|1579|5|$5560|Not authored|—|—|

## Policy baseline

These are the preserved current 103-node simulator results. They use real model updates and raycast the generated mesh, with modeled reading/decision overhead. They are not measured human playthroughs. The old policy runner does not capture per-delivery active time, so only the mixed replay below adds that metric.

| Policy | Campaign min | Net earned | Final money | Nodes | Final delivery experience s | Final delivery active s |
|---|---:|---:|---:|---:|---:|---:|
|saver|86.97|$158121|$1496|68|319|Not authored / pending|
|upgrader|89.03|$158121|$2796|71|328|Not authored / pending|
|mixed|88.41|$158121|$5871|70|321|268.5|
|cheapest-first|89.01|$158121|$2296|78|320|Not authored / pending|
|power-first|88.17|$158121|$821|68|328|Not authored / pending|
|speed-first|88.05|$158121|$821|68|329|Not authored / pending|
|control-first|85.73|$158121|$5521|67|327|Not authored / pending|
|technique-first|89.46|$158121|$571|65|325|Not authored / pending|
|inefficient|98.28|$158121|$6346|66|524|Not authored / pending|

### Tool purchases by policy

| Policy | Tool | Delivery | Minute | Money before | Money after | Nodes |
|---|---|---:|---:|---:|---:|---:|
|saver|pick|6|13.00|$651|$1|12|
|saver|heavy|12|23.18|$3071|$271|22|
|saver|sledge|19|38.27|$8360|$360|35|
|saver|breaker|26|54.97|$17813|$313|48|
|saver|thermal|29|68.68|$20355|$355|57|
|upgrader|pick|7|14.25|$689|$39|13|
|upgrader|heavy|12|24.88|$2978|$178|25|
|upgrader|sledge|20|43.78|$8121|$121|39|
|upgrader|breaker|27|60.48|$17764|$264|53|
|upgrader|thermal|29|72.68|$20680|$680|59|
|mixed|pick|7|14.32|$689|$39|13|
|mixed|heavy|12|24.13|$2857|$57|24|
|mixed|sledge|20|42.70|$8399|$399|38|
|mixed|breaker|26|57.83|$17953|$453|51|
|mixed|thermal|30|72.82|$20859|$859|60|
|cheapest-first|pick|7|14.25|$689|$39|13|
|cheapest-first|heavy|12|24.48|$2892|$92|25|
|cheapest-first|sledge|20|43.22|$8224|$224|43|
|cheapest-first|breaker|26|59.53|$18270|$770|58|
|cheapest-first|thermal|30|73.37|$20959|$959|67|
|power-first|pick|7|14.92|$689|$39|13|
|power-first|heavy|12|24.88|$3007|$207|23|
|power-first|sledge|19|39.95|$8087|$87|36|
|power-first|breaker|26|57.02|$17738|$238|49|
|power-first|thermal|29|72.48|$20905|$905|56|
|speed-first|pick|7|14.25|$689|$39|13|
|speed-first|heavy|12|23.98|$3007|$207|23|
|speed-first|sledge|19|38.82|$8087|$87|36|
|speed-first|breaker|26|55.38|$17738|$238|49|
|speed-first|thermal|29|71.45|$20905|$905|56|
|control-first|pick|6|12.10|$653|$3|11|
|control-first|heavy|12|23.02|$2896|$96|22|
|control-first|sledge|19|38.20|$8185|$185|35|
|control-first|breaker|26|54.65|$17638|$138|48|
|control-first|thermal|30|70.55|$20822|$822|57|
|technique-first|pick|7|14.32|$685|$35|12|
|technique-first|heavy|12|24.23|$2810|$10|21|
|technique-first|sledge|19|41.75|$8184|$184|34|
|technique-first|breaker|25|56.92|$17708|$208|47|
|technique-first|thermal|29|72.30|$20267|$267|56|
|inefficient|pick|6|12.40|$651|$1|12|
|inefficient|heavy|12|24.35|$2824|$24|22|
|inefficient|sledge|19|40.22|$8512|$512|35|
|inefficient|breaker|26|54.60|$17813|$313|48|
|inefficient|thermal|29|68.25|$20022|$22|56|

## Performance baseline

Headless CPU profile: 75 iterations per representative field, first 15 discarded; alternates intact geometry and a deterministic removed central lane. Mesh rebuild includes the current whole-field surface extraction, Three.js BufferGeometry allocation, normals and bounds. Every temporary geometry is disposed. Connectivity is the actual global detach method. These numbers do not substitute for browser frame/GPU profiling.

| Field | Delivery / phase | Grid | Samples | Triangles (intact) | Full mesh mean / p95 ms | Connectivity mean / p95 ms | Frame p50/p95/max | Renderer geometries/textures/programs |
|---|---|---|---:|---:|---|---|---|---|
|EARLY|1/1|23×14×15|4830|7096|5.329/7.509|0.059/0.124|Pending browser profile|Pending browser profile|
|MID|16/1|23×14×15|4830|5060|3.16/4.508|0.033/0.058|Pending browser profile|Pending browser profile|
|CURRENT LARGEST|32/1|23×14×15|4830|5000|2.973/4.341|0.029/0.041|Pending browser profile|Pending browser profile|

## Baseline findings and limits

- All fields have 4,830 scalar samples. World spacing increases from 0.237 at delivery 1 to 1.496 at delivery 32. Physical scale currently increases sample separation rather than field detail.
- Surface extraction always rebuilds one full field; there are no extraction chunks.
- Loot pockets use center-point containment. Small evidence may intersect represented ice cells despite an apparently empty sample-center pocket.
- The legacy final special case is `round === TUNE.finalRound - 1`, with finalRound 20: zero-based round 19 (delivery 20). This is the exact off-by-one/index context behind the brief's block 19 concern.
- Current layout removes a final layer with `if (i >=24) layers.pop()`. The final delivery remains three phases.
- The Ring is optional; final zero commission is selected by delivery index. Current queued story/call infrastructure should be retained while these policies change.
- Save v4 stores decimal float arrays, validated against the fixed field length.
- Historical QA documents contain results from older layouts; the frozen JSON and DELIVERY-PASS.md are the current 103-node baseline.
- Browser frame times, renderer memory/program counts, and heavy-interaction profiling are intentionally pending the root agent's browser pass. No GPU, frame pacing, human-play or subjective audio success is inferred from these CPU/simulator measurements.

Machine-readable data, exact phase bounds, per-policy delivery times, and source SHA-256 hashes: `qa-artifacts/major-baseline.json`.

## Instrumented mixed replay

The unchanged frozen mixed simulator reproduced the original delivery times, purchases and final ledger exactly: **88.41 minutes**, **70 nodes**, **$5871** remaining. Active ice work is **76.48 minutes** (4588.85s), not the new specification's desired45–55 minutes. Final delivery is **268.5s active**, versus 321s including modeled calls/transitions.

Active ice counts playing model updates while embedded rewards remain, including legitimate windup/recovery/aim work. It excludes tutorial, calls, menu decisions, settlement and post-release collection waiting. A separate stricter held-tool/contact metric totals 4562.35s and is available per phase in the JSON.

Hardware: 12th Gen Intel(R) Core(TM) i5-12400F; 12 logical CPUs; win32 10.0.26200, x64; Node v24.15.0. These CPU timings were captured on the current development machine and remain subject to OS/background load.
