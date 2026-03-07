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

- [x] Add broader interaction state classes (`is-dragging`, `is-connecting`) for richer cursor/UI feedback.
- [x] Surface keyboard shortcuts in the About modal.
- [x] Add ? button to toolbar showing 'About' information and instructions.
- [x] New nodes open in edit mode with `Untitled Node` title text pre-selected for immediate overwrite.

### P2 - Validation and Process

- [ ] Manual regression pass for:
  - node drag at zoom levels `0.35`, `1.0`, and `2.5`
  - panning on empty canvas after node/edge selection
  - edge create/reconnect flows under rapid pointer sequences
- [x] Add a lightweight regression checklist document for interaction safety.

### P3 - Theme and Visual Options

- [x] Dark mode

### P4 - File Workflow

- [x] Implement File System Access API support for graph documents:
  - open existing graph files
  - edit in-place and save back to the same file
  - create new graph documents
- [x] Replace toolbar `Import` / `Export` buttons with `Open` / `Save` actions aligned to the new file workflow.
- [x] Use graph name as the suggested filename on first save (`<graph-name>.json`).

### P5 - Settings and Graph Metadata

- [x] Add a toolbar `Settings` button that opens a settings panel/modal.
- [x] Add background style setting:
  - graph paper grid
  - dotted background
  - persist selected style per graph
- [x] Add edge anchor behavior setting:
  - auto-snap reconnects endpoint to nearest anchor
  - fixed-anchor keeps endpoint on the originally connected anchor
  - apply setting consistently for edge create and endpoint reconnect flows
- [x] Add graph naming:
  - editable graph name field in Settings
  - show graph name in the app title/header so users can confirm active graph
  - persist graph name in `localStorage` and graph file payload
- [ ] Add regression checks for settings persistence across:
  - reload
  - open/save/new graph flows
  - undo/redo interactions involving edge reconnection behavior

## Suggested Implementation Order

1. Finish interaction-state class polish (`is-dragging`, `is-connecting`).
2. Run a manual interaction regression pass.
3. Add regression checklist doc.
4. Implement dark mode.
5. Implement File System Access API open/save/new graph workflow and replace import/export UI actions.
6. Add Settings button and settings panel shell.
7. Implement background style options (graph paper/dots) with persistence.
8. Implement edge anchor behavior mode (auto-snap vs fixed original anchor).
9. Implement graph naming and surface it in app title/header.
10. Run settings-focused regression pass across persistence and file workflows.
