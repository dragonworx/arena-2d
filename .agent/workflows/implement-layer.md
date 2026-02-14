---
description: Implement the next layer of CanvasUI following the phase-gate process
---

# Implement Current Layer

## Pre-Flight

1. Read `PROGRESS.md` to determine the **Current Phase** and its **Status**.
   - If status is `⏳ NOT STARTED`, begin work.
   - If status is `🔨 IN PROGRESS`, resume from the first unchecked sub-item.
   - If status is `🔍 AWAITING REVIEW`, **stop** — do not proceed without human approval.
   - If status is `✅ APPROVED`, move the layer to Completed, advance Current Phase to the next layer, and begin.

2. Read the matching section of `PRD.md` for deliverables and acceptance criteria.

3. Read the matching section(s) of `SPEC.md` for the detailed specification.

4. Update `PROGRESS.md`: set Status to `🔨 IN PROGRESS`.

## Execution

5. Implement each sub-item in order. After completing a sub-item:
   - Check it off in `PROGRESS.md` (`[x]`).
   - Mark the next sub-item as in-progress (`[/]`) if continuing.

6. Write unit tests covering all acceptance criteria listed in `PRD.md`.

7. Create or update the demo panel for this layer in `demo/`.

## Verification

// turbo
8. Run `bun run typecheck` and confirm there are no type errors.

// turbo
9. Run `bun run lint` and confirm there are no lint errors. If there are auto-fixable errors, run `bun run lint:fix` and re-check.

// turbo
10. Run `bun test` and confirm all tests pass.

// turbo
11. Run `bun run build` and confirm the bundle compiles.

// turbo
12. Run `bun run dev` and visually verify the demo panel in the browser (functional browser test for the demo features added in this layer).

## Gate

13. Update `PROGRESS.md`:
    - Set Status to `🔍 AWAITING REVIEW`.
    - Record test count (e.g., "Tests: 12/12 passing").
    - Move sub-items from "In Progress" to show all checked.

14. **Stop and present a summary to the human:**
    - What was built (files created/modified).
    - Test results.
    - How to inspect the demo panel.
    - Any ambiguities or deviations encountered.

15. **Do NOT proceed to the next layer** until the human sets Status to `✅ APPROVED`.
