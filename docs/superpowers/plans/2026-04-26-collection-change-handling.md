# Collection Change Handling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close two gaps in manual shelf integrity — warn and clean up when a placed game is deleted, and intercept a dimension edit that would make a placed game no longer fit its Kallax cell.

**Architecture:** Both changes live entirely in the component layer (`CollectionView.tsx` and `GameCard.tsx`). The store is unchanged. `CollectionView` enriches its existing delete confirmation when the game has manual placements. `GameCard` intercepts `saveEdit` with a `fitsInCell` check and shows a second `ConfirmSheet` if the new dimensions break the fit.

**Tech Stack:** React 19, TypeScript, Zustand, Vite. No test runner is configured — verification steps use `npm run build` (TypeScript + Vite) and manual dev server testing.

---

## File Map

| File | Change |
|---|---|
| `src/components/collection/CollectionView.tsx` | Add placement-aware delete confirmation |
| `src/components/collection/CollectionView.module.css` | Add `.placementCallout` style |
| `src/components/collection/GameCard.tsx` | Add fit check + second ConfirmSheet |

---

## Task 1: Placement-aware delete in CollectionView

**Files:**
- Modify: `src/components/collection/CollectionView.tsx`
- Modify: `src/components/collection/CollectionView.module.css`

- [ ] **Step 1: Add store selectors for manual placements**

In `CollectionView.tsx`, add two new selectors immediately after the existing `deleteGame` selector (line 23):

```tsx
const deleteGame        = useGameStore(s => s.deleteGame);
const manualPlacements     = useGameStore(s => s.manualPlacements);
const removeManualPlacement = useGameStore(s => s.removeManualPlacement);
```

- [ ] **Step 2: Derive placements for the pending game**

After line 85 (`const pendingGame = …`), add:

```tsx
const pendingGamePlacements = pendingDeleteId
  ? manualPlacements.filter(p => p.gameId === pendingDeleteId)
  : [];
```

- [ ] **Step 3: Add callout CSS**

In `CollectionView.module.css`, append:

```css
.placementCallout {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.45;
  background: var(--danger-bg);
  border: 1px solid var(--danger);
  color: var(--danger);
}
```

- [ ] **Step 4: Enrich the ConfirmSheet message and confirm handler**

Replace the existing `<ConfirmSheet … />` block (lines 120–134) with:

```tsx
<ConfirmSheet
  open={!!pendingDeleteId}
  title="Remove game"
  message={<>
    Remove <strong>{pendingGame?.name}</strong> from your collection? This can't be undone.
    {pendingGamePlacements.length > 0 && (
      <div className={styles.placementCallout}>
        This game is placed on your manual shelf. Removing it will also clear that placement.
      </div>
    )}
  </>}
  confirmLabel="Remove"
  danger
  onConfirm={() => {
    if (!pendingDeleteId) return;
    const name = pendingGame?.name;
    pendingGamePlacements.forEach(p => removeManualPlacement(p.id));
    deleteGame(pendingDeleteId);
    setPendingDeleteId(null);
    if (name) toast(`Removed "${name}"`);
  }}
  onClose={() => setPendingDeleteId(null)}
/>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build
```

Expected: exits 0 with no type errors.

- [ ] **Step 6: Manual test — delete a game with no placement**

```bash
npm run dev
```

1. Add a game without any manual placement.
2. Click the delete (✕) button.
3. Confirm the sheet appears with only the standard message — no callout.
4. Confirm → game disappears from the collection.

- [ ] **Step 7: Manual test — delete a placed game**

1. Add a game with dimensions.
2. Go to the Manual tab, place the game in a cell.
3. Return to Collection tab, click delete on that game.
4. Confirm the sheet shows the danger callout about the manual shelf placement.
5. Confirm → game disappears from collection AND the cell in the Manual tab is now empty.

- [ ] **Step 8: Commit**

```bash
git add src/components/collection/CollectionView.tsx src/components/collection/CollectionView.module.css
git commit -m "feat: warn and clear manual placement when deleting a placed game"
```

---

## Task 2: Dimension-edit fit check in GameCard

**Files:**
- Modify: `src/components/collection/GameCard.tsx`

- [ ] **Step 1: Add imports**

In `GameCard.tsx`, add to the existing import block:

```tsx
import { ConfirmSheet } from '../shared/ConfirmSheet';
import { fitsInCell } from '../../lib/packing';
```

- [ ] **Step 2: Add store selector for removeManualPlacement**

In `GameCard.tsx`, after the existing `setPendingManualView` selector (line 26), add:

```tsx
const removeManualPlacement = useGameStore(s => s.removeManualPlacement);
```

- [ ] **Step 3: Add pendingFitWarning state**

After the existing `const [savedDims, …]` declaration (line 30), add:

```tsx
const [pendingFitWarning, setPendingFitWarning] = useState<{
  name: string;
  storedInside: boolean;
  wCm: string | null;
  hCm: string | null;
  dCm: string | null;
} | null>(null);
```

- [ ] **Step 4: Extract commitUpdate helper**

Add this function directly after the `applySuggestion` function (after line 139). It contains the shared logic for committing a validated save — used both by the normal save path and by the fit-warning confirm handler:

```tsx
function commitUpdate(name: string, storedInside: boolean, wCm: string | null, hCm: string | null, dCm: string | null) {
  updateGame(game.id, {
    name,
    type: form.type === 'expansion' ? 'expansion' : undefined,
    baseGameId: (form.type === 'expansion' && form.baseGameId) ? form.baseGameId : undefined,
    storedInside: storedInside || undefined,
    groupName: form.groupName.trim() || undefined,
    width: wCm, height: hCm, depth: dCm,
    unit: form.unit,
    minPlayers: form.minPlayers.trim() || undefined,
    maxPlayers: form.maxPlayers.trim() || undefined,
  });
  if (!storedInside && wCm && hCm && dCm && userId) {
    contributeDims(name, wCm, hCm, dCm, userId);
  }
  toast(`Updated "${name}"`);
  setEditing(false);
  setDimSuggestions([]);
  setActiveSugIdx(null);
  setSavedDims(null);
}
```

- [ ] **Step 5: Clear pendingFitWarning in openEdit and cancelEdit**

In `GameCard.tsx`, update `cancelEdit` and `openEdit` to clear the new state so it never bleeds into a subsequent edit session:

```tsx
function openEdit() {
  setForm({
    name: game.name,
    unit: eu,
    type: game.type === 'expansion' ? 'expansion' : 'base',
    baseGameId: game.baseGameId ?? '',
    storageMode: game.storedInside ? 'inside' : 'box',
    groupName: game.groupName ?? '',
    width: disp(game.width),
    height: disp(game.height),
    depth: disp(game.depth),
    minPlayers: game.minPlayers ?? '',
    maxPlayers: game.maxPlayers ?? '',
  });
  setDimSuggestions([]);
  setActiveSugIdx(null);
  setSavedDims(null);
  setPendingFitWarning(null);
  fetchDimSuggestions(game.name).then(setDimSuggestions);
  setEditing(true);
}

function cancelEdit() {
  setEditing(false);
  setDimSuggestions([]);
  setActiveSugIdx(null);
  setSavedDims(null);
  setPendingFitWarning(null);
}
```

- [ ] **Step 6: Replace saveEdit with fit-checking version**

Replace the entire `saveEdit` function (lines 92–118) with:

```tsx
function saveEdit() {
  const name = form.name.trim();
  if (!name) return;
  const storedInside = form.type === 'expansion' && !!form.baseGameId && form.storageMode === 'inside';
  const wCm = storedInside ? null : toCm(form.width, form.unit);
  const hCm = storedInside ? null : toCm(form.height, form.unit);
  const dCm = storedInside ? null : toCm(form.depth, form.unit);

  const placement = manualPlacements.find(p => p.gameId === game.id);
  if (placement && wCm && hCm && dCm) {
    const testGame = { ...game, width: wCm, height: hCm, depth: dCm };
    if (!fitsInCell(testGame)) {
      setPendingFitWarning({ name, storedInside, wCm, hCm, dCm });
      return;
    }
  }

  commitUpdate(name, storedInside, wCm, hCm, dCm);
}
```

- [ ] **Step 7: Add the fit-warning ConfirmSheet to the edit-mode JSX**

In the edit-mode return block (the second `return` at the bottom of the component), add the following `<ConfirmSheet>` immediately before the closing `</div>` of `<div className={styles.editBody}>` (just before line 406 `</div>`):

```tsx
<ConfirmSheet
  open={!!pendingFitWarning}
  title="Game no longer fits"
  message={<>
    The new dimensions for <strong>{game.name}</strong> are too large to fit in a Kallax cell.
    Saving will remove it from your manual shelf — you can reassign it later.
  </>}
  confirmLabel="Save & remove from shelf"
  onConfirm={() => {
    if (!pendingFitWarning) return;
    const { name, storedInside, wCm, hCm, dCm } = pendingFitWarning;
    const placement = manualPlacements.find(p => p.gameId === game.id);
    if (placement) removeManualPlacement(placement.id);
    commitUpdate(name, storedInside, wCm, hCm, dCm);
    setPendingFitWarning(null);
  }}
  onClose={() => setPendingFitWarning(null)}
/>
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npm run build
```

Expected: exits 0 with no type errors.

- [ ] **Step 9: Manual test — edit dimensions that still fit**

```bash
npm run dev
```

1. Place a game manually (it must have dimensions that fit a Kallax cell).
2. Edit that game and adjust dimensions slightly — keep them within Kallax limits (< 33 cm in any relevant axis).
3. Save.
4. Expected: save completes normally, no extra dialog appears, game remains on the manual shelf.

- [ ] **Step 10: Manual test — edit dimensions so game no longer fits**

1. Using the same placed game, edit its dimensions to something clearly too large (e.g., W: 99, H: 99, D: 99 cm).
2. Click Save.
3. Expected: the "Game no longer fits" sheet appears.
4. Click **Keep old dimensions** (Cancel) → sheet closes, form retains the large values (user can fix them), game remains on manual shelf.
5. Repeat step 2, this time click **Save & remove from shelf**.
6. Expected: save completes, dimensions are updated, game no longer appears in the Manual tab cell.

- [ ] **Step 11: Manual test — edit dimensions on an unplaced game**

1. Edit a game that has dimensions but is NOT placed in the manual layout.
2. Change dimensions to something too large (e.g., 99 × 99 × 99 cm).
3. Save.
4. Expected: save completes immediately with no fit-warning dialog — the check only triggers for placed games.

- [ ] **Step 12: Commit**

```bash
git add src/components/collection/GameCard.tsx
git commit -m "feat: intercept dimension edit when new size breaks manual shelf fit"
```
