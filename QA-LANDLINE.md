# Frozen Assets — landline and directed-opening correction

Reviewed 7 September 2026. Local build only; no source, save, or Git metadata was uploaded. Browser work used the disposable `?qa=1` bench. Existing player saves were not reset.

## Pass 1 — tutorial and narrative

The opening now establishes Bellwether, Preservation, Tony's arrangement, and his 12% cut before introducing work. The 17 tutorial panels and the supplied campaign dialogue are preserved verbatim in `lib/game/authored-dialogue.ts`; tests check their inclusion in the active campaign script. Live calls are distinct from Recovery Files. Each panel waits for the player, and each work stage has a separate CURRENT TASK prompt.

The first parcel is 45% of the normal first parcel's linear footprint. Its two coins gross $70; cumulative commission rounds to $8, leaving $62. HOLD TO CHIP costs $28 and is always affordable. The second parcel is 68% of normal, with a thicker shell and six finds. Both use the same strengthened tutorial impact tuning. Campaign equipment keeps its normal power afterward.

Measured with normal scene rays and damage:

- First parcel: 11 strikes, first reward on strike 3, $62 net. `qa-artifacts/landline-first-live.json`.
- Second parcel: 39.22 seconds of active holding, 110 strikes, all six finds collected. Its gross $145 brings tutorial gross to $215 and fees to $25, leaving $162 after the upgrade. `qa-artifacts/landline-second-live.json`.
- The deterministic model probe clears the first parcel in 11 strikes and rewards on strike 4. The second takes about 29.35 seconds of active holding. The difference from the real scene comes from visible-surface aiming and missed rays; the probe does not grant damage, money, or rewards.

The COMPLETE stamp, five chapter cards, return to a ringing landline, exact final two panels, and Chapter 1 title were checked in the browser. Revision 2 checkpoints preserve ringing/dialogue/task mode, current panel, credited rewards, upgrade purchase and board stamp. Loading the previous two-item practice parcel preserves that parcel's geometry, contents and balance.

The requested 25–45 second first parcel and 6–8 minute full first-time experience remain human-playtest targets. Tool-call delays and analysis pauses are excluded from timing claims. No artificial waiting was added to manufacture those durations.

## Pass 2 — interface, motion and art

The live panel is large and bottom-centered, with a prominent TONY label and centered Next control. Default typing is 50 ms per character, with punctuation pauses. Slow, Normal, Fast and Instant are available. Skipping reveals silently; another confirmation advances. Words and glyphs reserve their final layout throughout animation, avoiding the previous line reflow and faded initial labels.

Upgrades opens directly to the skill tree. The guided purchase focuses HOLD TO CHIP, prevents leaving during its acknowledgement, then focuses Back to Bench. Settings opens independently. Recovery Files uses a full-width archive with wrapped tabs, readable text and a reserved footer; future panels in an active call stay out of its history.

The landline has a rounded body, 12 physical keys, cradle, lifted handset, speaker grilles, amber line lamp, coiled cord and paired mechanical ring. The physical keypad, keyboard digits, on-screen dial and controller use the same feedback path. A separate manila folder opens Recovery Files. Phone and folder placement was adjusted to clear the work area. The final dial layout centers its digits and contains Hang up within the panel.

The cursor is a thin hollow circle, contracting on actual ice contact. The tray is wider and shallower. Collection sweeps find an open route around remaining ice to a front collection lane; when none exists, the bounded local slide remains collision-limited. The tool shaft receives a solid-volume clearance check while normal depth testing remains enabled. The room has cold-air wisps, drifting particles, papers, a file crate, practical light, vent and workshop clutter.

At 1536×864, the first tutorial parcel measured 48% of viewport width and height; the first normal parcel measured approximately 51% width and 72% height. The camera fits the original delivered solid and does not zoom into its shrinking remains. Tall geometry is constrained by height to retain the tray and tools: batch 18 measured 34% width / 72% height, and the final vault 58% / 82%. Those are intentional exceptions to the requested middle/late width ranges, not claims that every width target is met.

## Pass 3 — engineering and regression checks

- `npm test`: **66 passed, zero failed**. Includes authored script coverage, call save/restore, speaker handoff, call work gating, every tutorial checkpoint reload, commission and purchase rules, migration and solid-volume sampling.
- `npx tsc --noEmit`: passed.
- `npx oxlint app/page.tsx components/game lib/game tests/*.test.ts`: passed. Whole-scaffold lint had unrelated errors before this correction; this is a game-scoped result.
- `npm run build`: passed; the existing local production preview serves `dist/client` on port 4173.
- Browser UI audit passed at **1280×720 and 1536×864**: all four text speeds, normal/large text, reduced-motion variants, stable line height, glyph bounds, silent skip, persistent calls, purchase/return focus, direct menus, archive overflow and animated button bounds. A 60-letter panel produced exactly 60 letter ticks. Final results: `qa-artifacts/landline-ui-final.json` and `landline-ui-1536.json`.
- Physical handset pickup, physical Dial 7 feedback, keyboard hang-up and physical folder access passed. The opening phone position was checked again after its final move.
- Standard controller input passed phone pickup, default Dial 7 focus, confirmation, keypad focus movement, hang-up, Upgrades focus, map pan/zoom, Back and tool cycling. `qa-artifacts/landline-controller.json`.
- Controller confirmation read the remaining final campaign calls, including the unknown-line epilogue, then started Recovery Contracts. `qa-artifacts/landline-ending-controller.json`. The ending fixture fast-forwards earlier recoveries explicitly; it is not a campaign-duration playtest.
- Single-strike/hold response, release, blur, focus regain, pointer cancellation, pause and resume passed. `qa-artifacts/landline-input.json`. The input audit counts a completed chisel strike as a successful press even after firing stops.
- Rotation, empty-tray drag, UI isolation, tilt bounds, transformed ray targeting, retained money/ice/fuel and hover audio passed. Ray round-trip error was about `1.1e-16`. `qa-artifacts/landline-rotation.json`.
- Sixteen hand-chisel and pick contact poses passed across top/side/near/far surfaces and both tilt limits, with depth testing enabled. `qa-artifacts/landline-contacts.json`.
- Rapidly interrupted archive, Upgrades and Settings transitions ended with zero dialogs, no firing and finite transforms; at most one interactive dialog existed. `qa-artifacts/landline-rapid-ui.json`.
- Tutorial fixture tools are registered only with `?qa=1`; the normal local game does not expose tutorial reset/jump controls.

The 1536×864 viewport approximates the usable CSS dimensions of 1920×1080 at 125% scaling. Actual Windows DPI switching and physical controller hardware were not exercised. Subjective sound, tactile feel and first-time reading/decision pace still need human playtesting.

Screenshots retained locally: `landline-board.png`, `landline-chapter-title.png`, `landline-live-call.png`, and `landline-archive.png` in `qa-artifacts/`.
