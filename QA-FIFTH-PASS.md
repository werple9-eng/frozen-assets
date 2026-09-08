# Fifth polish pass — local build

September 7, 2026. Existing game, economy, progression and save format retained.

- Navigation targets: 94px high with 40px text on desktop. Main actions: 80–82px. Upgrade cards: 320×260 and 360×290 map units, compared with 210×157 previously. Default map scale remains 80%.
- Four branches and all 42 upgrades retained. Full-card bounds drive orthogonal connection ports, shared opening trunk and 150px row gaps. Pairwise card and segment/card intersection tests pass. The inspector and toolbar occupy space outside the clipped map viewport.
- Stable outer hit areas; magnetic surfaces, 1.085 hover scale, 0.96×0.87 press squash, spring release and up to 11px individual letter lift. Reduced motion remains supported.
- Hover bypasses both cooldown and gameplay voice budget. Browser tests after a real audio-unlocking click: all 40 immediate audio requests and all 40 alternating pointer entries played. Internal pointer movement did not retrigger. Non-hover effects retain their separate budget.
- Player-facing terminology is Upgrades. Settings remains separate. Desktop settings use two columns; smaller screens scroll instead of shrinking the controls.
- Nine deterministic reward silhouettes: minted coin, hexagonal token, ring token, cash bundle, sealed envelope, rolled bond, ingot, watch and gem-set ring. Existing reward IDs, values, release bounds and saves remain compatible.
- Each landing emits its own feedback event, local kinetic value text, per-character stagger, material audio, local debris and settling motion. Nearby labels use separate vertical lanes. Credit remains immediate on release and exactly once.
- Live browser testing caught a reused-vector issue in popup projection; screen coordinates are now captured as scalars before the React updater runs.
- Corrected live impact observed: +$140 with five animated characters at viewport x747–824, y498–534, directly over a landed envelope. Screenshot saved. Final normal-heat autoplay reached batch 5 with 16 recoveries and $1,430 earned; console remained clear. Final regular-save audit matched the initial audit exactly.

Validation: 27 model/layout tests pass; TypeScript and targeted source/test lint pass; production static build passes. Browser input/rotation safeguards pass, including no firing from tray rotation or UI drags. A real earned-money purchase reduced $35 to $10 and fitted Heat 1. Browser console error log was empty.

Visual checks: desktop 1280×720, wide desktop, and 390×844 mobile. Mobile has no horizontal overflow; node, inspector, map controls and return button remain separated. Settings controls are deliberately large and the page scrolls when necessary. Screenshots are in qa-artifacts/fifth-pass-*.png.

Regular-save read-only audit: valid version 3, round index 29, 118 recoveries, $4,690; money, credits, thaw and all upgrades preserved. All gameplay testing used the isolated practice bench. No upload or publication.

These checks verify behavior and layout, not a guarantee of subjective studio-quality art or sound. Hover audio follows the browser's normal requirement for an initial user gesture.
