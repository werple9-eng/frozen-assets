# Third pass — local QA record

September 2026. Local only; no source upload, publishing, remote asset dependency, or regular-save reset.

## Reference study and design decisions

Decoded all 1,433 frames of the supplied 47.9-second video. Reviewed the full visual timeline as 383 sequential observations at 0.125-second intervals, including opening navigation, tree inspection/zoom, bills, shelves, collection book, gameplay, and closing pause. This was a frame-sequence study, not a claim of real-time audiovisual playback. The audio track has not received a human listening review.

The reference keeps navigation small, changes the physical surface with menu context, and reserves its strongest motion for gameplay. This pass uses a close steel recovery tray, a stamped torch assembly drawing, plain top navigation, and a separate preferences drawer. The tree represents actual fittings; its paths encode the same prerequisites that the model enforces. There is no invented currency, automation branch, or decorative progression system.

## Implemented

- Ice and treasure use a world scale of 2.9, up from 1.7 in the second pass: about 71% larger in each physical dimension. Tray scale is 2.05. Heat radii, gravity, fragment sizes and velocities, ray conversion, collection bounds, and camera fitting follow the enlarged coordinates.
- Close orthographic framing preserves the whole rotating assembly without wide-angle distortion. At 1280×720, the first ice block covers roughly twice the image area of the previous composition.
- Primary press on ice starts a melt stroke. Primary press in empty/tray space starts a weighted inspection drag. Classification stays fixed throughout that stroke; UI crossing, cancellation, blur, and menus stop input. Q/E, C, right-drag, Space-drag, and Alt-drag remain alternate controls.
- Ten real fitting nodes across heat, fuel, fan, and afterheat branches. Purchased, available, and prerequisite-locked states differ in markings, borders, fill and contrast. A selected detail shows effect, price, and prerequisite. Purchases guard the exact node level, so a stale click cannot buy a different fitting.
- Skill Tree and Settings are distinct screens. Settings contains audio and comfort preferences only. Pause contains restart, save status and the control guide.
- Compact gameplay HUD; no permanent upgrade prompt or locked nozzle control. The first rotation hint disappears after a demonstrated drag. Currency feedback stays bounded.
- Reusable woodblock UI sounds; three material-buffer variants each for ice chips/cracks, tray, paper, coins, and gold. Small pitch variation, cooldowns, gain ramps and voice limits. Surface effects follow the real field and vanish with removed material. Hidden documents stop rendering/simulation work.

## Functional checks

- 21 model/geometry/rotation tests passed, including sequential skill prerequisites, stale selections, atomic spending, old-save defaults, preference round-trip, and all twenty authored batches.
- TypeScript check passed. Targeted lint passed for the game model, scene, audio, WebMCP adapter, skill definitions and both gameplay UI files.
- Actual canvas checks passed for primary tray drag, no fuel use during rotation, ice press/drag separation, right-drag momentum, bounded tilt, UI isolation, dragging into UI, pointer release/cancel, blur and fresh-input requirements after pause. The transformed hit round-trip error was about 2e-15. First observed input-test frame arrived in 25.4ms; this is an observation, not a latency guarantee.
- Real UI purchase from earned funds: $105 → $70, Brass Jet fitted, Hot Core available, higher heat fittings still locked. Selecting Crucible Jet correctly showed its Pressure Jet prerequisite and disabled purchase.
- Full real-frame replay completed batches 1–20 with tray yaw approximately 2.72 radians and bounded tilt. 82 valuables, $13,260 recovered, all ten fittings, $7,595 remaining. Observed gameplay clock: 351.6 seconds including QA interruptions. This automated replay is not a first-player pacing test.
- Continue retained funds and fittings. Fan-nozzle replay continued through 17 additional complete batches and one recovery in the next batch: 151 cumulative valuables and $21,600 cumulative recovery value before stopping.
- Restart cancellation preserved the final vault. Confirmed restart on a disposable practice bench returned to batch 1, $0, full fuel, starting field, zero particles and original comfort preferences.
- Regular save read-only audits before and after: version 3, batch index 1, $245, five recoveries. Money, upgrades, progression, scalar-field thaw, and credited-item identities all matched exactly.

## Layout, motion and resource checks

- Checked 1280×720 and 1329×912 desktop views, 560×820, and 390×844, including larger text. No horizontal page overflow. Desktop tree footer remained inside the viewport; narrow menus scroll within their own surface.
- Rapid Skill Tree ↔ Settings changes settled to one dialog, correct active navigation, opacity 1 and the correct full-viewport bounds. Locked node inspection and Settings navigation remained usable.
- Found and fixed a Tailwind centering transform conflict by using an unstyled dialog surface. Fixed excess desktop graph height so the tree and return control fit together. Settings spacing now fits common desktop height.
- Largest vault inspected from the front and after a real primary drag to yaw −2.04 radians / tilt +8°. Ice, valuables and tray stayed in view, with fuel and ice unchanged during inspection.
- Active final-vault sample: about 182 FPS, frame p95 12.5ms, p99 12.6ms, maximum 20.8ms; no >50ms frames in that 900-frame window. Other settled windows were around 240 FPS. Measurements come from browser frame intervals on this machine, not a GPU capture or a performance guarantee. Material/geometry counts varied with visible loot and tool allocation; particles returned to zero and the voice bound held.
- The Vinext CLI intermittently asserted during forced native shutdown on Windows after a successful export. The local build script now invokes the same Vite builder and Vinext static-prerender API and lets Node exit naturally. Candidate and final runs exited 0. Existing framework chunk-size and ineffective-dynamic-import warnings remain non-fatal.

## Final visual audit

Compared the completed bench, tree and preferences drawer against the reference timeline. The gameplay object remains dominant; navigation is compact; the tree uses torch-specific fittings, engraved paths and purchase stamps; Settings uses a different, quieter composition. No pricing cards, glowing constellation, generic particle stars, or separate upgrade controls remain in the normal view. The reference's collection/bills systems were not copied into this game.

The scene remains a stylized procedural prototype. Human assessment of sound, long-session comfort and first-player pacing, plus physical touch-device/low-end-GPU testing, remains outside these automated checks.

Local evidence is in ignored `qa-artifacts/`: `third-pass-gameplay.png`, `third-pass-vault.png`, `third-pass-skill-tree.png`, `third-pass-settings.png`, `third-pass-complete.png`, and the six reference-sequence contact sheets. The distributable local static files are packaged in `Frozen-Assets-local.zip`.
