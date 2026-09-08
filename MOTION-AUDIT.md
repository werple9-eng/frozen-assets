# Frozen Assets — motion audit

September 7, 2026. Implemented and tested locally. This report covers the motion
pass; the earlier campaign and narrative reports retain their own scope.

## Motion language

Small interactions respond immediately, then finish with restrained elastic
motion. Purchases connect several small reactions. Heavy tools, new equipment,
chapters and the ending have progressively more weight. Input does not wait for
the presentation to finish.

The shared `Spring` retains velocity when retargeted, integrates in bounded
substeps, and settles exactly. Native reversible transitions handle screen
presence; DOM and Three.js presentation updates run outside React's render loop.
The map keeps direct manipulation and release inertia while programmatic moves
use springs. Pointer hit areas stay stationary while their visual faces move.

## Action-by-action review

- **Main menu open:** the recovery heading, three files and primary action enter
  with different timing. The workbench remains spatial context behind the menu.
  Checked in the browser at 1280 × 800 and 1280 × 720. The final height-aware
  layout keeps New Game fully visible at 720 px (button bottom: 604 px), and
  its pale pressed surface retains dark, readable text.
- **Save slot hover:** magnetic approach, spring face and independent type;
  selecting a file slightly expands it while the other files recede.
- **Save slot select:** title and action respond. Three real files are backed by
  independent saved recoveries. Native browser interaction verified creating
  file 1, returning to the selector and starting an independent file 2.
- **Delete confirmation:** a styled confirmation enters inside the selector.
  Clear and restore were both exercised through the actual buttons. A recovery
  copy survives clearing; failed storage writes preserve the last good catalog.
- **New game / continue:** the menu exits into the bench as the loaded ice is
  delivered. Loading an empty file cannot accidentally resume another file.
  First boot remains at the selector until the player chooses.
- **Phone message:** the physical handset vibrates and lights up; its projected
  screen position anchors the springing preview and the full phone screen.
  The speaker label settles before the message. The preview is bounded to one
  message, remains readable, then returns toward the phone.
- **Tony letters:** newly visible messages use individually tilted, bouncing
  glyphs, quiet cached letter sounds, and punctuation pauses. Whole words wrap
  together. Finished messages collapse into plain text nodes. Historical text
  does not rebuild hundreds of animated glyphs on every open. Read instantly
  remains available. The browser fixture observed 38 animated preview glyphs.
  A second message in the final build used 40 glyphs and retained whole words
  across line breaks.
- **Tutorial hint:** entrance, restrained emphasis, acknowledgement text, then
  compression and exit. Audit fix: presence now outlasts the entire CSS exit,
  avoiding a cut halfway through its follow-through.
- **Tool hit:** separate loaded pose, impulse and damped return for all seven
  tools. Hand chisel is tight, picks progressively wider, sledge broad and heavy,
  breaker vibrates under load, and thermal flow starts/stops through a spring.
  Actual strikes remove ice immediately. Audit fix: cooldown continues during
  idle time, so releasing the tool cannot leave the next click unresponsive.
- **Ice chip:** impact shading stays attached to the authoritative surface;
  local chips use pooled meshes. Larger unsupported fragments briefly wobble
  before falling. The ice assembly, tray and nearby workshop props recoil.
- **Embedded / revealed reward:** local strike proximity creates restrained
  internal movement. The first exposed camera sightline gives a small reveal
  reaction while supports may still hold the object.
- **Reward release:** the physical support state triggers breakaway and tumble.
  Presentation never changes the crediting or support rules.
- **Reward fall:** model gravity and fall states continue to drive position;
  material-dependent rotation provides secondary motion.
- **Reward impact:** coin, cash and gold have different bounce/deformation.
  Gold creates the stronger tray reaction. Each item produces one landing event.
- **Money popup:** a local upward burst, staggered characters, rebound, then
  float/fade. Nearby labels occupy separate lanes; at most 16 labels are retained.
- **Money counter:** the bench rolls toward the new balance at impact and reacts
  to the landing. Spending rolls down. Credit is saved immediately on release;
  menus use the real spendable balance, so presentation cannot lose money or
  prevent a valid purchase.
- **Upgrades open:** the map comes into focus with its context and navigation
  staggered around it. Pointer drag preserves inertia. Locate, next item, zoom,
  keyboard panning and offscreen focus glide. Audit fix: tool-card focus no
  longer teleports the map.
- **Node hover / press:** stable targets, magnetic faces, independent letter
  response, press compression and release overshoot. Locked/disabled controls
  retain restrained feedback and clear availability styling.
- **Node purchase:** compression, stamp/pop, label response, frost/ring, currency
  reaction and child awakening. Model cost/prerequisite checks remain atomic.
- **Connection activation:** the signal draws from the purchased parent toward
  its child. Browser sampling observed normalized dash offset travel from 1 to
  0, the actual purchase, money deduction and the child's awakened class.
- **Tool unlock:** newly owned rack equipment is placed with a spring and a
  dedicated kinetic tool title. Existing rack equipment remains in place and
  reacts to nearby impacts. The cue does not block control.
- **Block complete:** material rewards finish their landings, settlement type
  lands, and the next delivery takes over. Compound phases still use the same
  guarded campaign transition and once-only credit rules.
- **New block delivery:** ice arrives above the tray, drops, compresses and
  settles with dust, tray recoil, sound and workshop reaction. Audit fix:
  physical scale now tunes drop height, return stiffness, landing force and
  debris count, making later volumes heavier. The same content transform drives
  ice, rewards, hit testing and collection coordinates.
- **Chapter transition:** a short kinetic title and underline carry the chapter
  change while workshop equipment and the new delivery provide context. One
  active milestone replaces stale cues rather than queuing them.
- **Pause:** fast, compact spring entry and short exit. Firing and rotation
  cancel immediately. Resume requires fresh work input.
- **Settings:** a calmer lateral drawer, staggered rows and moving switch
  controls. Changes apply immediately; the panel can close while settling.
- **Game end:** a weighted recovery receipt, stamped heading and animated totals.
  The real finale fixture reached 32 completed blocks and 316 recovered items.
  The epilogue gate was exercised manually, followed by the Recovery Contracts
  button: batch 33 was playable with the campaign completed and an 8% commission.

## Interruption and accessibility checks

The normal-motion browser fixture repeatedly opened phone, switched to Upgrades
and Settings, and closed screens at roughly 28–32 ms intervals for 14 cycles.
It finished with zero remaining dialogs, at most one interactive dialog,
finite button transforms, zero live message glyphs, no firing and active play.
The separate Reduced Motion fixture passed the same invariants for six cycles.

Reduced Motion respects both the game preference and the OS preference. Large
travel, rotation, bounce and delayed lettering become quick fades, small changes
and direct state feedback. It preserves button, purchase, delivery and message
feedback. It does not add a wait before accepting input.

Browser input checks passed immediate press response, release, pointer cancel,
blur, pause, and no automatic firing on focus/resume. The sampled first response
was 15.6 ms. Rotation checks passed empty-tray gesture selection, momentum,
bounded tilt, UI/blur cancellation, no fuel/money/ice changes from rotation,
and correct hits on a rotated surface. Coordinate round-trip error was
2.56 × 10^-15 or less. Standard-controller checks passed phone, Upgrades,
focus movement, map pan/zoom, back and tool cycling. These use the real input
loop with a synthetic standard gamepad, not a claim about physical devices.

## Physics and effect evidence

The seven-tool browser run observed real ice removal with every tool. Measured
hand rotation ranges were approximately 0.092 rad (hand), 0.159 (grip), 0.446
(pick), 0.713 (heavy), 1.281 (sledge) and 0.080 (breaker). Thermal uses flow
rather than a broad hand swing; its shutdown tail was still 0.114 after 220 ms.
All seven stopped correctly.

The three-material reward fixture observed embedded, freed, landed, collecting
and collected states, three local impact popups and exactly three credits.
It peaked at 23 active particles against the 48-particle ceiling. The revealed
reaction is a presentation substate, not an additional serialized loot state.

The final weighted-delivery checks sampled peak heights of 2.892 world units
for the first claim and 4.952 for the vault. Both settled within the 1.5-second
sample; the corresponding pools retained 6 and 16 reused particles. The
largest coordinate round-trip error was 1.34 × 10^-15. The vault sample measured
4.3 ms frame p95 and 1.4 ms scene-work p95. Controller navigation was rechecked
after the final focus-glide change and every navigation assertion passed.

Frequently used particle meshes and geometry are pooled. Letter audio is capped
at eight concurrent voices; active messages cancel their scheduling on removal.
The existing unlimited hover-entry sound policy is preserved independently.
Only hovered/focused buttons expand into live letter spans. This removed more
than a thousand unnecessary dormant map glyph elements during profiling.

## Performance observations and limits

Measurements came from this desktop's local production build, pixel ratio 1.
They are short browser samples, not a benchmark of minimum-spec hardware.

- At 1280 × 800, the optimized rapid-menu run measured 12.5 ms frame p95,
  16.8 ms p99, 50 ms maximum and no frames strictly above 50 ms. Scene work p95
  was 1.4 ms. The pre-optimization run had reached a 75 ms cold transition.
- At 1280 × 720, the Reduced Motion stress sample measured 4.3 ms p95,
  20.7 ms p99 and one 58.4 ms cold frame. Lower motion does not eliminate
  first-time menu construction costs.
- The phone sample measured 4.3 ms frame p95 and 1.2 ms scene-work p95.
  Settled postgame play measured about 240 frames/s on this display with
  4.3 ms p95 and no frames over 50 ms in its retained sample window.
- Occluded/background runs that dropped to roughly 1 frame/s were excluded
  from foreground performance claims. The audit wait helper now has a bounded
  wall-clock fallback so browser throttling cannot leave a test running forever.

Occasional cold menu hitches remain. These observations support smooth normal
play on the tested desktop; they do not prove a universal 60 FPS floor. Existing
build warnings about the large Three.js/game chunk and Vinext mixed static/
dynamic imports remain nonfatal. Fracture presentation uses procedural pooled
fragments and the scalar-field support model, not a general rigid-body solver.
Subjective feel and sound balance still benefit from a human playtest.

## Save safety and validation

All destructive browser scenarios ran at `localhost:4173/?qa=1` with memory
storage. The ordinary browser save was inspected read-only: its imported
version-3 recovery retained batch 30, $4,690, 118 recovered items and equipment
levels. The original `frozen-assets-v3` key is not overwritten by the new slot
system; its first import becomes file 1 in `frozen-assets-slots-v1`.

Validation commands:

```sh
npm test
npx tsc --noEmit
npx oxlint app/page.tsx components/game/motion.tsx components/game/tactile.tsx components/game/save-menu.tsx components/game/phone.tsx components/game/skill-tree.tsx lib/game/motion.ts lib/game/motion-audit.ts lib/game/save-slots.ts lib/game/model.ts lib/game/scene.ts lib/game/workshop.ts lib/game/audio.ts lib/game/webmcp.ts tests/motion.test.ts tests/run.mjs
npm run build
git diff --check
```

The suite has 51 passing tests, including spring stability at 30/60/144/240 Hz,
rapid retargeting, long frame gaps, reduced motion, save import/isolation/
clear/restore, storage failure rollback, release-versus-impact money and tool
cooldown return. Type checking, targeted lint and production build passed.
The final browser console check had no errors.

The repeatable WebMCP motion tool is registered only on the isolated localhost
practice bench. Scenarios: `ui`, `phone`, `delivery`, `tools`, `rewards`, and
`purchase`; an optional `reduced` flag runs the scenario with the preference
enabled. Fixtures restore the practice recovery afterward. Their authored
setups validate transitions, not natural campaign duration or difficulty.

Captures are `qa-artifacts/motion-main-menu.png`,
`qa-artifacts/motion-notification.png` (preview during an arrival), and
`qa-artifacts/motion-ending.png`. Everything stays local; no source, save or
Git metadata was uploaded and no site was published.
