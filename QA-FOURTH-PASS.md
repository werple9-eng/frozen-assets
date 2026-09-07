# Fourth pass — tactile controls and expanded progression

Kept local. No source upload, publishing, or changes to the normal browser save during testing.

## Design and interaction

Revisited the complete 0–47.89 second reference visual sequence using the six previously decoded contact sheets. The study covers navigation, tree opening and exploration, other menus, gameplay, and the return to pause. This was a frame-sequence study, not a claim of listening to the reference audio.

The new interface uses larger central navigation, 72px desktop navigation targets, a small dot cursor, magnetic visual faces, per-letter springs, deep press squash, menu overshoot, and distinct purchase / connection / milestone reactions. The outer hit target stays fixed. A pointer displacement over 7px cancels a button purchase. Reduced motion disables the spring and entrance effects. Buttons and tree nodes share an interaction language; Settings remains a separate preference screen.

The skill tree is an 1840 × 2580 map with 42 upgrades across the existing heat, fuel, afterheat, and fan mechanics. Empty-space dragging uses bounded inertia, keyboard arrows pan, and zoom is constrained to 65–115%. Start and Next upgrade provide recovery/navigation anchors. Details sit outside the desktop panning area and below it on narrow screens.

Total tree cost is $50,895: heat $12,370, fuel $13,700, afterheat $10,545, fan $14,280. Three opening upgrades cost $25–30, with the fan unlock at $120. Larger milestones introduce sustained focus, thermal pulses, batch fuel top-ups, resting fuel recovery, improved fan penetration, and a wider afterheat echo. Base gameplay remains playable without any required upgrade path.

Old version-3 saves receive an explicit one-time progression migration: old heat levels map to 0/4/7/10/12, fuel to 0/3/6/9, afterheat to 0/3/6, and fan to 0/1. Existing heat, capacity, afterheat strength, money, credited finds, and scalar-field thaw are preserved. New saves mark progression revision 2.

## Audio

Evaluated installed jsfxr 1.4.1 and its sample-generation API. Used it offline to generate three 34–41ms filtered noise latch sounds, totaling approximately 10KB. No arcade presets are played. These samples are decoded once and layered into purchases; existing damped woodblock resonances remain the main hover/press voice. Hover has a 140ms global cooldown and subtle pitch/gain variation. Low-priority sounds leave voice capacity for purchase feedback. Tree dragging is silent.

Sound files generated and loaded without reported browser errors. The sound design has not received a human listening evaluation in this automated pass.

## Validation

- 25 automated tests passed; TypeScript check and targeted lint passed; final static production build passed.
- Tests cover actual 14% first heat-step removal, exact spending and stale-node protection, all upgrade bounds, save migration without repeated conversion, real milestone effects, pause behavior, and bounded tree inertia.
- Browser: direct purchase with earned funds changed $280 to $255 and activated Heat 2. Dragging 42px within the same Heat 1 button left $280 unchanged.
- Browser: empty-map drag moved the map with a short coast, settled, and left money unchanged. Keyboard panning, zoom controls, Start, and Next upgrade worked.
- Browser: five repeated Settings/Skill Tree switches ended with exactly one dialog and the correct active navigation.
- Browser: navigation face reached 1.065× scale while the 171 × 72px hit box remained stable. Letter offsets varied from 0 to approximately -6px according to pointer proximity. Reduced motion produced `transform: none`.
- Responsive checks at 1280 × 720 and 390 × 844: no horizontal page overflow; narrow Back control measured 350 × 58px and remained visible. Desktop Settings shows all controls and Back without scrolling. On narrow screens Settings scrolls normally.
- Normal save audit: money $245, batch index 1, five recoveries; balance, equipment migration, thaw, and credited identities all preserved. This audit only reads the regular save.
- Automated ordinary recovery completed all 20 batches, 82 valuables, and $13,260 earned. At the ending, 30 of 42 steps were owned; the original version exhausted its ten upgrades during this run. Continued normally through batch 64, reaching 256 recoveries and $35,010 earned with 38 upgrades. No rewards or money were granted by the test player.
- Sampled active long-run performance on this machine: roughly 238fps, p95 frame interval 4.3ms, 900-frame window with zero frames over 50ms, and bounded particle/voice counts. This is not a lower-end-device guarantee.
- Final gameplay safeguards all passed: release/blur/cancel stop firing, resume requires fresh input, primary empty-space drag rotates without fuel use, ice strokes do not rotate, UI crossing cancels rotation, tilt is bounded, and transformed ray targeting remains accurate.
- Fresh final-build browser error log was empty.

Fixed during QA: client/server cursor initialization mismatch; an inspector covering the fan branch; a desktop Settings layout pushing Back below the viewport; accidental node clicks following a drag; and stale menu state after an agent-controlled resume.

Human first-play duration, prolonged comfort, and subjective sound/animation quality remain tuning judgments. The automated player aims precisely and is much faster than a typical first-time player.

Screenshot: `qa-artifacts/fourth-pass-tree.png`. Production output: `dist/client/`.
