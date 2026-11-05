# T03 — Model GUI - Harvest Control Page

**Planning update — 2026-11-05:** Later user-input/design-and-integration work, after T05 and T06; exact priority pending. The PM discussion has happened at project-flow level, but the latest ticket-specific design and input changes have not yet been supplied here. Do not implement the old notes by default.

**Status:** Discuss with PM before implementation. No implementation started.

## PM instruction

> Let's talk before you start this task, as the page has changed.

The supplied screenshot and notes are **old references**. Obtain the latest design and requirements before implementing them.

## Our understanding

This is the input page where users configure a Harvest Control Rule (HCR), before submitting an experiment. The red curve defines the permitted fishing rate for different biomass levels.

The illustrated “hockey stick” has three parts:

- Below **Biomass limit**: fishing rate is zero.
- Between **Biomass limit** and **Biomass base**: the rate increases along the slope.
- At/above **Biomass base**: the rate stays at the configured **Fishing mortality**.

Example from the screenshot: limit **364 tonnes**, base **1,457 tonnes**, fishing mortality **0.622 per year**. These configure the rule; they are not necessarily current measured biomass.

## Changes described in the old notes

| Area | Requested behaviour |
| --- | --- |
| Introduction | Replace the text with updated wording; latest copy needed |
| Terminology | Replace “F max” with “Fishing mortality” in the UI |
| Hover | Show Total Allowable Catch (TAC) calculation for the hovered point on the red line |
| TAC calculation | As specified by the ticket: `TAC = Biomass × Fishing mortality`; screenshot rounds `1457 × 0.622` to approximately `906 tonnes` |
| X-axis | Biomass in tonnes for the entire Northwestern Mediterranean; scale according to Biomass base so the curve's slope and plateau remain visible |
| Y-axis | Fishing mortality, per year; scale according to the selected species' configured value and allow values above 1.00 |
| Table | Notes say “3 columns,” but screenshot shows group name plus 3 parameter columns; clarify |
| Headers | Biomass limit (tonnes), Biomass base (tonnes), Fishing mortality (per year) |

The UI terminology change does not automatically imply renaming backend protocol fields. Confirm the mapping during integration.

## Defining questions

1. What is the latest agreed layout/copy, and which old notes still apply, including the table columns?
2. How should users edit the species parameters—table, draggable graph, or both—and where do defaults/allowed ranges come from?
3. What are the agreed axis-scaling and TAC tooltip rules, including units, rounding, and values above 1.00?

## Tasks — not started

- [ ] Discuss the changed page with PM and obtain the current design/copy.
- [ ] Confirm table structure, editing/hover behaviour, defaults, units, and validation rules.
- [ ] Locate the current HCR implementation and compare it with the approved design.
- [ ] Update terminology, introductory text, and table headers according to the approved scope.
- [ ] Adapt biomass and fishing-mortality axis scaling without capping mortality at 1.00.
- [ ] Add the agreed TAC tooltip using the fishing rate at the hovered point.
- [ ] Keep table values, species/group selection, and the curve consistent using the agreed interactions.
- [ ] Verify units, threshold behaviour, mortality above 1.00, rounding, and responsive layout.

## Done when

The page matches the **latest PM-approved design**, with correctly labelled/scaled axes, the agreed table and editing behaviour, and the agreed TAC calculation on hover. Final acceptance criteria depend on the discussion above.
