# Frozen Assets — campaign editorial review

Internal development record, 7 September 2026. These are five explicit self-reviews of the implemented content and rules, followed by a harsh editorial pass. They are not independent reviewer opinions or a claim that a commercial release is finished.

## Pass 1 — Ludonarrative fit

Reviewed each major beat against its physical trigger and tool behavior.

- Opening: one small block, individual chisel clicks, a physical handset, immediate control. The setup states the 12% arrangement without blocking play.
- First improvement: the free ratchet grip uses a return spring and actually repeats strikes. Rewrote the wrist instruction to a specific equipment acquisition.
- Pooled custody: increasingly large silhouettes, separate account identifiers on the retained tag, a heavy pick with slower, deeper strikes, and an optional silver ring.
- Audit: the bank's automated warning and Tony's “Don't.” share a phone beat. The internal label and exception log provide separate pieces of physical evidence. The rate becomes 8% for subsequent shipments.
- Sublevel: the powered breaker and thermal maintenance wand work differently. The workshop gains a tool rack, crate, industrial cabinet, lamp and retained evidence. Layered lots require new openings rather than higher scalar HP.
- Vault: three different physical layouts, all owned tools remain selectable, ledger retained, final settlement charges 0%. Contracts require the last phone message.

Fixed three mismatches: early fitting descriptions talked only about thermal tools; the supposedly optional ring prevented completion; the final transfer dialogue revoked a badge that had already died. Physical fitting effects and text now agree, the ring can be left behind, and the final line refers to remaining access.

## Pass 2 — Pacing

Progression/intensity map used for the review:

- Blocks 1–5: low intensity → click-to-hold improvement → proper pick → tag. Quiet points: first settlement, tool acquisition, tag landing. The opening messages are available immediately, with no exposition screen.
- Blocks 6–11: medium intensity → heavy pick → compound account lots → internal label. The ring is optional. Short bursts of structural collapse provide relief between deeper recoveries.
- Blocks 12–18: medium/high → sledge → mixed inventory → exception archive. Bank warning, signatures and the exception log are spaced across the chapter. The log and commission cut form one short connected event.
- Blocks 19–25: high, with brief broad-collapse recoveries → breaker → thermal → maintenance route. Compartment transitions and settlements provide quiet time; Tony does not open a modal.
- Blocks 26–32: high → narrower route → master records → three-part vault. The ledger lands, remains for three seconds, then the short resolution and time-jump epilogue become available.

The first broad-tool simulation was too short (45 minutes). Added eight compound deliveries with different outer/inner layouts and divided their reward values across compartments to avoid doubling the economy. The final simulations are recorded in `QA-CAMPAIGN.md`; they exclude reading, aim search and menu exploration. No minimum-duration gates or HP inflation were added. Chapter-specific human timing remains unverified, especially the compact opening and Audit chapter.

Removed notification competition: active strikes, rotation, falling rewards and upgrade pauses hold the queue. The next quiet point releases the highest-priority event. Opening the phone voluntarily flushes pending content. History is sorted by trigger chronology, so prioritization cannot scramble the plot.

## Pass 3 — Character

Read Tony's full sequence without gameplay. The beginning is a transaction: he routes assets and takes a cut. The foreign tag challenges his assumption that this is a harmless side income. The father's ring makes custody personal without changing the protagonist or adding a speech. The exception log changes what he knows; reducing his cut makes that change material. Maintenance routing, revoked access and the final transfer demonstrate escalating risk. Copies and his cleared desk establish the consequence. The unknown number is a return to work, not another conspiracy.

All Tony lines have stable keys and remain under 20 words. No emoji, exclamation marks, stock cold-cash jokes, named protagonist or player dialogue choices were introduced.

## Pass 4 — Mystery and reveal

Information order is explicit: foreign account tag → pooled holds → mixed identifiers → internal review label → dated exception approvals → management's release decision → master ledger linking accounts, inventory and original signatures. The tag does not expose the entire cover-up. The label establishes knowledge; the log establishes that management continued the process; the ledger provides the complete record needed for copies.

The ledger wording was too redundant, so “The approvals are in there too” became “Original signatures. Not the scanned copies.” The exception object's dated entries make the difference between mistake, discovery and continued preservation inspectable. The ending is guarded by actual ledger recovery, and the epilogue cannot unlock contracts early. An ignored phone never loses mandatory history.

## Pass 5 — Commercial PC / Steam experience

The campaign now has a beginning, escalation, ending and coherent replay premise. A Chapter 1 demo boundary is exported without a store link, using the full game's schema. Platform ownership is separated from the game; no Steamworks or fake cloud service was added.

Tested the layouts at 1920×1080 and 1280×800. Major tool and fitting nodes have independent inspection/focus states. Keyboard and simulated standard-gamepad navigation work through the actual UI loop. Fixed frame-rate-dependent stick motion, offscreen tool focus, map zoom and controller slider adjustment. Reduced motion suppresses the handset vibration; visual notification and persistent text carry the same information as audio.

Commercial concerns remain: a small external playtest is needed to establish first-run duration and whether the middle chapters sustain curiosity. The current procedural workshop art and reward presentation are an expanded game foundation, not a claim of final shipping art. Physical Xbox, PlayStation and Steam Deck hardware, desktop packaging, achievements and cloud integration have not been certified.

## Harsh editorial review

Self-assessment after fixes, out of 10: premise 9; Tony 8; pacing 6; mystery 7; dialogue 8; gameplay/story integration 8; ending 8; environmental storytelling 6; postgame transition 8. Pacing and environmental storytelling are the weaker commercial areas; these scores are judgments, not measured audience response.

Three weakest Tony lines and implemented rewrites:

1. “Put this on the handle. Saves your wrist.” → “Found a return spring. It was written off.” More specific to Tony's job and the actual grip.
2. “Keep the service equipment.” → “Nobody downstairs is asking for the equipment back.” Implies the operation's state without sounding like a tutorial.
3. “The approvals are in there too.” → “Original signatures. Not the scanned copies.” Gives the final archive a reason to matter.

Three potentially intrusive messages and fixes:

1. First reward: notification waits until the landing/strike activity ends. It never opens the phone.
2. Tag reveal: the evidence is retained at release for save safety, but its notification waits while the object falls. The player chooses when to inspect it.
3. Final ledger: the four-line reaction has priority above old barks, the ledger lingers, and the resolution remains in the handset. There is no forced dialogue sequence over the final strike.

Three story/mechanics disagreements and fixes: the ring was mandatory in the completion predicate; early upgrades advertised heat while the player held a chisel; final dialogue referred to badge access already lost. All three were corrected in the implementation and the ring has a regression test.

Most predictable reveal: management kept the freeze running. Preserved the user's story; strengthened the distinction between evidence of an error and a signed decision to continue it instead of inventing a twist.

Most confusing reveal: what the Freeze Ledger adds to the exception log. Added affected accounts, retained inventory and original signatures to the evidence chain and dialogue.

Weakest chapter ending: the Internal Hold label previously arrived like ordinary loot. It now has a red physical identity, a non-sale inspection, and sits inside the inner compartment of the chapter-ending shipment.

Strongest moment: Tony's zero cut on the vault followed by “The copies arrived first.” His change is expressed by the economy and an understated consequence.

No added timer forces the mystery to match a scripted minute. The 100–140 minute human target remains a validation goal; automated completion alone is insufficient evidence.
