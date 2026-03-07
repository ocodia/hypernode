# TASKS

Last updated: 2026-03-07

## Completed So Far

- [x] Core app shell and canvas layout (`index.html`, `css/styles.css`)
- [x] Modular JavaScript architecture (`state`, `render`, `interaction`, `persistence`, `utils`)
- [x] Node creation (double-click canvas, Add Node button)
- [x] Inline node editing (title/description on node cards)
- [x] Node deletion (inline action + `Delete`/`Backspace`)
- [x] Edge creation (anchor-driven workflow with visual draft preview)
- [x] Edge endpoint reconnection (drag selected edge endpoints)
- [x] Edge deletion (overlay action + `Delete`/`Backspace`)
- [x] Canvas zoom (wheel zoom around cursor with limits)
- [x] Canvas pan (robust pointer lifecycle handling)
- [x] View reset
- [x] Undo/redo with bounded history
- [x] Local persistence (`localStorage`)
- [x] JSON import/export with validation
- [x] Import status toast feedback
- [x] `Escape` cancels edge draft mode and exits edit mode

## Remaining Work

### P1 - Interaction Quality

- [ ] Add broader interaction state classes (`is-dragging`, `is-connecting`) for richer cursor/UI feedback.
- [ ] Add optional keyboard shortcut hints in UI (discoverability polish).
- [ ] Add ? button to toolbar showing 'About' information and instructions.

### P2 - Validation and Process

- [ ] Manual regression pass for:
  - node drag at zoom levels `0.35`, `1.0`, and `2.5`
  - panning on empty canvas after node/edge selection
  - edge create/reconnect flows under rapid pointer sequences
- [ ] Add a lightweight regression checklist document for interaction safety.

### P3 - Theme and Visual Options

- [ ] Dark mode

## Suggested Implementation Order

1. Finish interaction-state class polish (`is-dragging`, `is-connecting`).
2. Run a manual interaction regression pass.
3. Add regression checklist doc.
4. Implement dark mode.
