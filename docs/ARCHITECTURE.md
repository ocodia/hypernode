# Hypernode - Architecture

## Goals

- keep the browser-native stack small
- keep feature logic readable and testable
- separate persistence, state, rendering, and interaction concerns
- preserve offline-first behavior

## Runtime Shape

Hypernode is a single-page, fully client-side canvas app.

- HTML layers render frames, nodes, focus UI, and selection controls
- SVG layers render committed edges, edge drafts, and edge overlay controls
- a single central store owns graph data, settings, selection, viewport state, transient UI state, and history
- rendering is subscriber-driven from the store

## Main Modules

### Entry

- `js/main.js`
  - loads saved graph/settings
  - creates the store and renderer
  - binds interactions
  - autosaves `{ name, settings, nodes, frames, edges }`

### State

- `js/state/store.js`
  - public store API used by the rest of the app
- `js/state/history.js`
  - bounded snapshot history for undo/redo
- `js/state/store-settings.js`
  - initial settings resolution and settings comparison helpers
- `js/state/store-mutations.js`
  - shared mutation wrapper for history, anchor sync, and notify
- `js/state/ui.js`
  - transient UI-state reset helpers

### Rendering

- `js/render/renderer.js`
  - orchestration only
- `js/render/theme-meta.js`
  - theme-color metadata config
- `js/render/modules/*`
  - viewport, frames, nodes, edges, and overlay UI rendering
- `js/render/markdown.js`
  - sanitized limited-markdown rendering

### Interaction

- `js/interaction/bindings.js`
  - interaction composition root
- `js/interaction/config.js`
  - keyboard shortcut catalog and toolbar shortcut metadata
- `js/interaction/binders/*`
  - event-registration shells by surface

### Persistence

- `js/persistence/storage.js`
  - localStorage load/save
- `js/persistence/file.js`
  - file open/save using the File System Access API when available

### Shared / Utils

- `js/shared/*`
  - anchor resolution, selection normalization, sizing, overlap, and math helpers
- `js/utils/*`
  - constants, graph sanitization/validation, placement logic, shortcut formatting/search, dialogs, ids

## Data Boundaries

Canonical persisted graph payload:

- `name`
- `settings`
- `nodes`
- `frames`
- `edges`

The canonical field rules live in [DATA_MODEL.md](/home/paul/Repos/hypernode/docs/DATA_MODEL.md).

## History And Undo

- history snapshots are capped at 100 entries
- settings mutations are included in undo/redo
- snapshots include `name`, `settings`, `nodes`, `frames`, `edges`, and `selection`
- transient interaction state is cleared on restore

## Notes For Contributors

- `docs/DATA_MODEL.md` is the source of truth for persisted settings enums/defaults
- `js/state/store.js` is the source of truth for the public store API
- `docs/REGRESSION_CHECKLIST.md` is the source of truth for manual interaction coverage
