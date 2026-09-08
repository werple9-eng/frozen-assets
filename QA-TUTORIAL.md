# Frozen Assets — directed opening review

Reviewed locally on 2026-09-07. This is the first-time experience correction pass, retaining the five-chapter campaign, existing recovery files, progression, and normal support physics. Nothing was published or uploaded.

## Review 1 — tutorial and game design

Followed the actual opening through arrival, first clicks, both coin landings, gross/commission/net settlement, the earned-money purchase, hold practice, assignment board, Tony's final messages, and the first normal Chapter 1 parcel. The tutorial introduces one action at a time; unrelated bench controls appear later.

Issues found and fixed:

- The first parcel initially broke too quickly under a normal tool radius. Tuned the two small physical fields independently, keeping ice values bounded at 1. The first claim now needs deliberate clicks; the second exercises sustained work.
- A second-parcel cash find could look exposed yet remain stuck at roughly 59.5% shell exposure. Set the tutorial threshold to 58%, within the requested 55–70% range, while retaining the top-clearance condition and clearing the actual fall corridor. Normal campaign release rules are unchanged.
- The first reward could leave its confirmation waiting after a reload between credit and tray impact. Restore that landing once, without granting money or charging commission again.
- Leaving the upgrade map early could strand the instruction. An unpurchased return restores **Open Upgrades**; a purchased return loads the hold-practice parcel.
- Automated aiming could stare through a cut hole without moving. The isolated live test helper now tries visible rim rays; it still uses real renderer targeting and actual chipping.

Measured live stages, using the default dialogue cadence and actual render/input/model paths:

- Start to first strike: 32.54 seconds.
- First strike to first reward: 5.98 seconds.
- First strike to first parcel settlement: 25.22 seconds.
- Start to the first Upgrades cue: 62.15 seconds.
- Second parcel: 50.54 seconds of actual held work; 55.45 seconds including its introduction before the board.

The deterministic model run also meets the 25–45-second first-parcel and 30–60-second hold-practice bounds. It finishes with $175 gross, $20 commission, the $28 fitted spring, and $127 balance. It advances dialogue immediately and is not a human pacing measurement.

**Pacing acceptance remains open:** no independent first-time player has demonstrated the requested 6–8-minute total, or the 3–5-minute expert total. Active portions of the guided automated session were closer to 2–3 minutes; menu inspection and unattended QA pauses cannot honestly be counted as play time. No artificial delay was added to pad the duration. Human observation is needed to assess searching, aiming, reading, and upgrade decision time before calling the overall duration target met.

## Review 2 — motion, interface, audio and art

Inspected the workshop and screens against the supplied reference principles, with large targets, physical menus, kinetic lettering, and clear resting text. Reviewed normal and reduced motion, keyboard opening without hover, larger text, narrow layouts, phone scrolling, and tool contact.

Issues found and fixed:

- Tony was too peripheral. The live panel now occupies 72% of desktop width, capped at 1100px, with a spring entrance, independently animated glyphs, and a separate confirm target.
- Fast reveal could produce obsolete letter audio. Revealing a line now cancels pending letters silently. Every normally emitted letter/digit gets its own quiet wood/plastic tick; punctuation and spaces do not.
- History could animate a backlog. Visibility now controls its two-section typing budget; sections leaving view finish silently, and reopening gives visible content a fresh entrance.
- Completion disappeared before its final letters had a readable settled beat. Extended the word sequence to 2.1 seconds and delayed the enabled exit until 3.05 seconds; the board itself has an interruptible exit rather than a hard cut.
- The short-screen tutorial style hid Tony's name. Kept the speaker header visible and tightened the card instead.
- The phone's return action remained at the top edge. Moved it into a reserved bottom row with centered display lettering.
- Settings could cover the last preferences with its exit, overflow sideways, and extend beyond a tablet viewport. Reserved separate header/exit rows, confined scrolling to the preferences, removed horizontal overflow, and corrected its height.
- A narrow tutorial screen let Tony cover the upgrade price. Reduced the card and panel spacing while retaining readable text and all purchase/return targets. Also corrected the small-screen station mark and board exit arrow.
- The completion word's off-screen exit could enlarge the page's overflow area. Confined that choreography to a fixed viewport overlay.
- The pick could float above the strike surface or blink while a held ray crossed a cut hole. Reworked the physical pivot and shallow contact offset, kept it visible through the swing, and retained real depth testing. Added a curved forged pick head and a smaller beveled starter chisel.

The workshop now has restrained depth fog, 36 dust points, a vent, cable and cloth details, maintenance/recovery papers, and a slowly varying room layer. Impact amplitude and recoil increased approximately 15% and 12%, respectively. These are authored changes, not objective measures of perceived richness or sound quality.

Live audio/input checks: all 11 letters in “Click the ice.” sounded once; instant reveal added zero letter voices and did not skip the line; disabling dialogue sounds produced zero letter voices. The instruction persisted. Keyboard opening focused the purchase, the real purchase succeeded, return focus was restored, and a virtual standard controller chipped and stopped on release. Subjective listening and physical controller hardware remain human checks.

## Review 3 — software and performance

- **59 automated tests pass**, including the tutorial sequence, compatibility with existing recoveries, settings persistence, valid checkpoints, reloads at every authored phase, first-impact restoration, once-only purchase/stamp, and accounting.
- TypeScript check passes: `npx tsc --noEmit`.
- Game-scope lint passes: `npx oxlint app/page.tsx components/game lib/game tests`. Whole-repository lint retains unrelated scaffold violations in `components/ui` and `hooks`; this pass does not claim those are resolved.
- Production build passes: `npm run build`. Vinext reports existing ineffective dynamic-import notices.
- **16/16 contact poses pass**: starter chisel and pick across front, left/right rotation, both vertical tilt limits, near/far edges and side targets. Sampled geometry stays at a shallow contact depth (approximately −0.008 to −0.011 world units); all checked materials retain depth testing and the tool stays visible throughout each swing. Contact fixtures use an intact parcel and presentation impulses to isolate alignment from destruction of the target itself.
- Rapid menu churn passes in normal and reduced motion: zero dialogs remain, at most one active dialog, no stuck work input, finite transforms, and zero stranded live glyphs.
- A 768×720 local sample during menu churn recorded 12.5ms normal-motion p95 frame time and 8.3ms reduced-motion p95, with 129 geometries and no lingering audio voices. This describes this host and sample, not a minimum-spec performance guarantee.
- Live history scrolling with 22 lines never exceeded two typing sections. Closing/reopening menus left no continuing backlog.
- Final purchase layout checked at 1280×720, 768×720, and 400×720; the card, price, instruction and bottom exit have separate visible bounds. Settings and phone history retain a reserved exit while their content scrolls. The browser reported no warnings or errors.

The debug controls are registered only for `localhost`/`127.0.0.1` with `?qa=1` and operate on the isolated memory backend. The player's regular recovery catalog was not reset or replaced. Build artifacts and detailed screenshots/JSON/logs are kept locally in ignored `qa-artifacts/`.

## Repeatable local checks

Run `npm test`, `npx tsc --noEmit`, and `npm run build`. Open the isolated practice URL and choose **New game**. Its WebMCP checks are:

- `test_tutorial_sequence` with `reload: false`, then `reload: true`: bounded complete sequence and checkpoint/accounting parity.
- `test_tutorial_ui`: rendered dialogue sound counts, reveal semantics, instruction persistence, purchase/focus/return, and virtual controller work/release.
- `test_tool_contacts`: all 16 physical contact poses.
- `test_motion_choreography` with `scenario: "ui"`, separately with `reduced: false` and `reduced: true`: interrupted transitions and cleanup.

Use the visible tutorial inspector to replay a line, jump to steps 0–13, load either micro parcel, release a reward, replay the board/stamp, finish induction, or reset its completion. These fixtures are for diagnosis; their granted setup state is not evidence of an earned playthrough. The live timing/accounting measurements above came from the real two-parcel run.
