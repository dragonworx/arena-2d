---
description: Mark the current layer as complete, commit changes, and advance to the next layer
---

# Finish Current Layer

1. **Read `docs/PROGRESS.md`** to identify the **Current Phase**.

2. **Run Quality Gates** (Auto-fix if possible):
   // turbo
   - Run `bun run lint:fix`
   // turbo
   - Run `bun run typecheck`
   // turbo
   - Run `bun test`

3. **Update `docs/PROGRESS.md`**:
   - Locate the **Current Phase** layer in `## Layer Checklist`.
   - Update its header icon to ✅.
   - Mark all its checklist items as completed (`[x]`).
   - Move the *entire* layer section from `## Layer Checklist` to the bottom of `## Completed Layers`.
   - Identify the **next** layer in `## Layer Checklist`.
   - Update `## Current Phase` to this new layer's title from the checklist.
   - Set `## Status` to `⏳ NOT STARTED`.

4. **Commit Changes**:
   - Run `git add .`
   - Run `git commit -m "feat: complete [Current Layer Name]"` (use the name of the layer you just finished).

5. **Notify User**:
   - Confirm the layer is complete and committed.
   - State the new Current Phase.