# Reference tree study — September 13, 2026

Status: **static study only; animation review and implementation blocked on the original video.**

The replacement brief, sections 50–51, explicitly requires normal-speed playback followed by frame-by-frame review **before touching Upgrades**. The original `20260908-0019-54.2416907.mp4` is no longer present at the supplied ScreenSketch recordings path. A replacement attachment was requested. The preserved JPEG contact sheets and PNG frames are useful visual evidence, but they cannot establish original playback cadence or audio. No new Upgrades layout, icon, or animation implementation has been made in this pass.

## Available evidence

- `qa-artifacts/reference/recompare-35.png`: 1918 × 1078 reference capture with the stamina tooltip visible.
- `qa-artifacts/reference/recompare-10.png` and `recompare-50.png`: additional preserved captures.
- `qa-artifacts/reference-sequence-1.jpg` through `reference-sequence-6.jpg`: sampled contact sheets, not the original recording. The first sheet includes a menu-to-tree transition around the printed 2.6-second timestamp and subsequent hover/drag states.
- `qa-artifacts/reference/overview-01.jpg` through `overview-03.jpg`: earlier overview sheets.

## Static estimates from recompare-35

These are pixel estimates from the displayed frame, not inferred DOM measurements. Allow roughly ±3 pixels for individual boundaries and ±10 pixels for larger extents.

- Normal node outer frame: approximately 59–61 px square, or 3.1% of viewport width / 5.6% of height. Corners are lightly rounded. The icon occupies roughly 30–35 px with substantial internal breathing room.
- Enlarged root: this frame does not identify a separate root reliably. Do not infer a root diameter from a hovered node.
- Neighbor centers: roughly 100 px on orthogonal steps, 141 px on the common diagonal steps. The visible graph spans about x=593–1055 and y=177–739. Broad space around that graph is part of the composition.
- Branch lengths: about 100 px horizontal and 141 px diagonal, center to center. Visible line lengths are shorter because their ends disappear beneath node frames.
- Connections: approximately 2–3 px at this captured scale. Available/owned paths are warm gold; locked paths are muted gray. Lines remain subordinate to the node art.
- Tooltip: about x=391, y=352, width=542, height=282. Its dark body is legible against the warm background. This is much larger than the replacement brief's explicit adapted width of 250–310 px; the new brief takes precedence.
- Top selector: labels occupy approximately y=47–78; the selected underline is near y=86–91. This is about 5.8% of the frame height for the label center.
- Zoom rail: approximately x=1878, or 40 px from the right edge. Track endpoints are about y=415 and y=646, with a dark backing from y=402–660. The captured handle is roughly 35 × 9 px. The replacement brief deliberately changes this to an unboxed 1 px rail and an 8–12 px visual knob.
- Idle graph scale: no numeric camera scale is recoverable from a PNG. Use node size and graph occupancy above as the comparison anchors; do not call an arbitrary implementation zoom “reference scale.”
- Background: almost black warm brown, roughly #1a120b through #24170e over the central field, with darker edges. This estimate is visual. The replacement brief instead asks for the cooler #161817–#1c2021 family and only a 3–5% radial lift.
- Idle icon density: approximately 15 visible nodes in this crop, with no permanent explanatory sentences, prices, or rank labels surrounding them.

## Motion measurements still required from video

Hover scale, purchase overshoot, path-growth duration, child reveal delay, transition duration, drag-release coast and cursor behavior remain **unmeasured**. The contact sheets demonstrate different states, but sampled state differences are not a reliable substitute for the original timeline. Do not promote the specification's target values below to observed reference measurements.

## Explicit adaptation targets from the brief

- Root 72–84 px visual / 96 px hit area. Normal nodes 42–50 px visual / 68–76 px hit area; milestones 54–64 px. Hover only the face to 1.09, keeping a stable hit area.
- Tool art 26–34 px inside 48–56 px targets. Top offset 24–34 px at 1080p; inter-target spacing 18–30 px. Locked tools remain question marks.
- Original 32 × 32 artwork, safe area 4–28, stroke 2–2.4. Review every icon at 24 px. Use distinct milestone art and family-consistent rank notches.
- Muted rust #a76359, ochre #b89350, steel #5f8393 and teal #5d867a. Dark inset faces, thin physical frames; no ambient neon glow.
- Authored cubic paths with no crossings. Locked lines 1–1.25 px / 18–28% opacity; available 1.3–1.6 / 45–60%; owned 1.6–2 / 70–90%. Endpoints terminate underneath frames.
- Purchase scale .90 → 1.13 → .98 → 1. Path growth 180–260 ms, followed by child .72 → 1.08 → 1 over 240–340 ms, with a delayed icon reveal. No confetti.
- Tooltip 250–310 px wide, 18–28 px from the node. Prefer right then left; clamp vertically. Name 16–19 px, body 13–15, comparison 12–14, price 16–18. Enter 120–180 ms, leave 80–120 ms, then unmount. Never pin the hover panel.
- Node centers 110–180 px apart, major steps 160–230. Six individually authored silhouettes: compact chisel, diagonal pick, vertical heavy pick, lateral sledge, mechanical breaker and flowing thermal.
- Show owned nodes and the available frontier, with one dim rank beyond. No full future-node dump.
- Pan coast 180–400 ms based on release velocity. Re-grab cancels momentum immediately. Pointer-anchored zoom .45–1.6, default .85–.95, with damped displayed scale.
- Right rail 32–54 px from the edge, height 30–42vh; 1 px visual track, 8–12 px knob inside a 28–34 px target. No housing.
- Funds 24–32 px, unboxed. Quiet bottom-centered return control. Opening root → paths → frontier in 350–500 ms; closing recedes over 250–400 ms.

## Remaining acceptance work

1. Reattach and review the original video at normal speed, then measure its relevant transitions frame by frame.
2. Implement and tune all six maps against these observations and the explicit adaptations.
3. Capture all six trees at 100% and export an icon sheet at 24 px. Inspect individual icons, path tangencies and branch spacing.
4. Compare reference/game frames side by side, including hover, purchase, child reveal, pan release and zoom.
5. Record which visual/motion defects were corrected between review passes. Static estimates above are preparatory notes, not acceptance sign-off.
