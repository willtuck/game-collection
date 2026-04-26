# Collection Change Handling

**Date:** 2026-04-26
**Status:** Approved

## Problem

When a game is deleted or its dimensions are edited, the manual shelf layout can be left in an inconsistent state. Specifically:

- `deleteGame` does not clean up `manualPlacements`, leaving dangling references.
- `updateGame` does not check whether new dimensions still physically fit in an assigned cell.

The auto layout (live packing algorithm) needs no changes — it recalculates on demand from the current collection. Saved layouts are not a primary concern.

## Scope

Two targeted fixes at the component layer. No store changes.

---

## Change 1: Delete a placed game

**File:** `src/components/collection/CollectionView.tsx`

The existing delete confirmation already uses `pendingDeleteId` and `ConfirmSheet`. The change enriches that flow when the game has manual placements.

**Logic:**

1. When `pendingDeleteId` is set, check `manualPlacements` for any entry where `gameId === pendingDeleteId`.
2. If a placement exists, render the `ConfirmSheet` with an additional inline callout:
   > *"This game is placed on your manual shelf. Removing it will also clear that placement."*
   The callout uses danger styling (`--danger-bg`, `--danger` border/text).
3. On confirm: call `deleteGame(id)` **and** `removeManualPlacement(placement.id)` for each matching placement.
4. If no placement exists: existing behavior unchanged.

**No new components.** The callout is a conditional `<div>` inside the existing `message` prop.

---

## Change 2: Dimension edit causes game to no longer fit

**File:** `src/components/collection/GameCard.tsx`

The existing `handleSave` computes new cm dimensions and calls `updateGame`. The change intercepts this when the game is already manually placed and the new dimensions fail `fitsInCell`.

**Logic:**

1. In `handleSave`, before calling `updateGame`, compute `newDims` in cm (same conversion logic already in use).
2. Check if the game has a manual placement: `manualPlacements.find(p => p.gameId === game.id)`.
3. If placed, run `fitsInCell({ ...game, width: wCm, height: hCm, depth: dCm })` from `src/lib/packing.ts`.
4. If `fitsInCell` returns `false`:
   - Do **not** call `updateGame` yet.
   - Set local state `pendingFitWarning: true` (store the computed `wCm/hCm/dCm` alongside it).
   - Render a `ConfirmSheet` with title *"Game no longer fits"* and message:
     > *"The new dimensions for **[name]** are too large to fit in a Kallax cell. Saving these dimensions will remove it from your manual shelf. You can reassign it later."*
   - Cancel label: `"Keep old dimensions"` — does nothing, closes sheet.
   - Confirm label: `"Save & remove from shelf"` — calls `updateGame` with the pending dims, then `removeManualPlacement` for the matching placement.
   - Uses warning styling (`--warn-bg`, `--warn-border`, `--warn` text) — not danger, since this is a consequence of an edit, not a deletion.
5. If `fitsInCell` returns `true`, or the game has no placement: proceed with `updateGame` as today.

**New local state needed:** `pendingFitWarning: { wCm: string|null, hCm: string|null, dCm: string|null } | null`

---

## What does not change

- **Store (`useGameStore`)** — no new actions. `deleteGame` and `updateGame` stay as-is. Cleanup is handled at the call site in components.
- **Pill states** — `manualStoreBtn` / `manualStoredBtn` in `GameCard` already reflect placement status reactively. They update automatically once placements are cleaned up.
- **Auto layout** — recalculates live from current games. No drift handling needed.
- **Saved layouts / `collectionSnapshot`** — out of scope; not a primary user workflow.

---

## Eligibility rule (existing, unchanged)

Only games with all three dimensions filled in are eligible for placement (auto or manual). This filtering already exists in both the packing algorithm and the `GameCard` UI. No changes needed.
