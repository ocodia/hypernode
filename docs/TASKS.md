# TASKS

Last updated: 2026-03-06

## Completed So Far

- [x] Core app shell and canvas layout implemented (`index.html`, `css/styles.css`)
- [x] Modular JavaScript architecture in place (`state`, `render`, `interaction`, `persistence`, `utils`)
- [x] Node creation implemented (double-click canvas, Add Node button)
- [x] Node editing implemented (title/description via inspector)
- [x] Node deletion implemented (button + Delete/Backspace shortcuts)
- [x] Edge creation implemented (handle-based source/target workflow)
- [x] Edge deletion implemented (inspector + Delete/Backspace shortcuts)
- [x] Canvas zoom implemented (wheel zoom around cursor with limits)
- [x] View reset implemented
- [x] Undo/redo implemented with bounded history
- [x] Local persistence implemented (`localStorage` save/load)
- [x] JSON import/export implemented with validation

## Remaining Work

### P0 - Fix Broken Core Interactions

- [x] Fix node drag runaway bug (nodes can "fly off" screen)
  - Implemented immutable drag start coordinates (`nodeStartX`, `nodeStartY`) so movement is always computed from pointer origin.

- [x] Stabilize panning behavior
  - Added robust pointer lifecycle handling (`pointerup`, `pointercancel`, `lostpointercapture`) with defensive capture cleanup.
  - Added explicit panning UI state (`ui.isPanning`) for consistent cursor behavior.

- [x] Improve edge creation usability
  - Increased edge handle hit target size.
  - Added node-body click targeting while edge draft mode is active (no longer handle-to-handle only).
  - Added connection-mode node highlighting.

### P1 - Interaction Quality Improvements

- [x] Add visual edge-draft preview while selecting a target node.
- [ ] Allow `Escape` to always cancel edge-draft mode.
- [x] Prevent accidental pan start while beginning a node interaction.
- [ ] Add interaction state classes (dragging/panning/connecting) for cursor and UI feedback.

### P2 - Testing and Validation

- [ ] Manual test pass for:
  - node drag at zoom levels 0.35, 1.0, and 2.5
  - panning on empty canvas and after selecting nodes
  - edge creation under normal and rapid click sequences
- [ ] Add lightweight regression checklist in docs to prevent interaction regressions.

## Suggested Implementation Order

1. Validate interaction fixes with a manual regression pass.
2. Add dedicated interaction state classes for dragging/connecting polish.
3. Run full manual interaction regression pass again after polish.
