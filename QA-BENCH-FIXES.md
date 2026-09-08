# September 7 — annotated bench fixes

## Follow-up: separate tool trees and immediate object release

- Replaced the category heading strip with seven tool tabs. Future tools display disabled question marks; eligible tools expose their purchase page. Each tool has its own named fittings, effects, prerequisites, purchases and remembered map view. Browsing a page does not equip that tool.
- Saves now store independent upgrade levels for every tool. Old shared upgrades migrate into independent copies for all tools so existing benefits are retained. Thermal fuel capacity remains tied to the thermal tool.
- Release checks now sample the actual rendered reward mesh against the same tetrahedral density surface used to draw ice. Empty coin corners and ring holes cannot create invisible restraints. Field changes trigger a release check in the same update instead of waiting for the periodic check; credit remains exactly once.
- Validation: 80 unit tests pass, including purchase isolation, save migration, actual-mesh contact, surface interpolation and same-update release. TypeScript and production build pass. The isolated browser `tool-pages` audit passes purchases on an unequipped tool, independent purchases, separate and remembered views, and four locked question-mark tabs. Browser warning/error log is empty. No player save was changed or game published.

## Earlier bench pass

- Recovery Files call history renders plain, complete text immediately. It no longer queues IntersectionObserver reveals, letter animation, or letter sounds. Live Tony dialogue is unchanged. Evidence retains `paper-place`.
- Removed batch/family sublabel, chapter hint, equipment heading, work/fuel hint, and visible zoom captions. Zoom retains its accessible name and keyboard input.
- Consolidated Files, equipped tool, tray centering, and Phone into one bottom dock; thermal fuel/nozzle controls remain available.
- Upgrade stat columns now have labels that follow map pan/zoom. The middle lane is labeled Tools. No upgrade effects, costs, prerequisites, or tool unlocks changed. Removed the inherited 65% width constraint from prerequisite button text.
- Desk props now share world Y=-0.5 as their contact plane at every workshop scale. Papers, vent, cloth, cable, crate and lamp are seated; crate sides/base and lamp foot provide visible support. Tool rack and evidence heights match their support surfaces.
- Release checks consider contact around a valuable, rather than counting an entire column of distant ice below it. Freed valuables sweep their footprint against the scalar field while falling, land on lower ice or the tray, and retain exactly-once credit. Tutorial exposure behavior stays intact.

Validation: 75 unit tests pass, including two new air-gap/fall/landing regressions; TypeScript, scoped lint and production build pass. The legacy ending check now allows its existing final 550ms presentation to finish rather than asserting at a fixed two-second boundary. In the isolated browser practice save, inspected the bench/dock and upgrade map, verified five archived phone messages have no text animation, and verified recovered evidence still uses `paper-place`. Final prerequisite button face measures 237px inside a 239px button. Browser error/warning log is empty. Player saves were not opened or edited; nothing was published.
