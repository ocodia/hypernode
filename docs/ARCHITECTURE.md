# Hypernode - Architecture

## Architecture Goals

- simple modules
- maintainable code
- offline operation
- browser-native stack

## Technology Stack

- HTML
- CSS
- JavaScript ES modules
- SVG (edge rendering and edge controls)
- `localStorage` for persistence

No backend services are used.

## Rendering Model

Hybrid rendering:

- Nodes: HTML elements in `#nodes-layer`
- Frames: HTML elements in `#frames-layer` (background container layer)
- Edges: SVG paths in `#edges-group`
- Edge controls (selected edge endpoints/delete control): SVG overlay in `#edge-overlay-group`
- Edge draft preview: SVG in `#edge-draft-group`

All layers share the same viewport transform.

## Project Structure

```text
css/
  styles.css
docs/
js/
  main.js
  shared/
  interaction/
    bindings.js
    binders/
  persistence/
    file.js
    storage.js
  render/
    renderer.js
    modules/
  state/
    store.js
    history.js
    ui.js
  utils/
    constants.js
    graph.js
    id.js
index.html
```

## Core Modules

### State (`js/state/store.js`)

Stores:

- `nodes`, `edges`
- `frames`
- graph metadata (`name`, `settings`)
- `selection`
- `viewport` (`panX`, `panY`, `zoom`)
- UI state (`edgeDraft`, `edgeTwangId`, `editingNodeId`, `isPanning`, `isDragging`, `isConnecting`, `importStatus`)
  - includes frame UI state (`editingFrameId`, `isDrawingFrame`, `frameDraft`)
  - includes resize interaction state (`isResizing`)
- undo/redo history

Delegates pure concerns to focused helpers:

- `js/state/history.js` for snapshots and history stack bookkeeping
- `js/state/ui.js` for transient UI resets
- `js/shared/*` for selection/entity math reused outside the store

### Rendering (`js/render/renderer.js`)

Responsible for orchestrating focused render modules:

- `modules/viewport.js` for viewport/background transforms
- `modules/frames.js` for frame markup
- `modules/nodes.js` for node markup
- `modules/edges.js` for committed/draft edge SVG
- `modules/ui.js` for overlays, metadata, and toast UI

### Interaction (`js/interaction/bindings.js`)

Responsible for coordinating shared interaction state and delegating listener registration to feature binders:

- `binders/canvas.js` for canvas navigation and frame-draw entry
- `binders/nodes.js` for node and selection-control events
- `binders/frames.js` for frame events
- `binders/edges.js` for edge hit/endpoint events
- `binders/toolbar.js` and `binders/keyboard.js` for chrome actions and shortcuts

### Persistence (`js/persistence`)

- `storage.js`: load/save graph in `localStorage`
- `file.js`: import/export validated graph JSON files

### Utilities (`js/utils`)

- constants
- graph sanitization/validation
- id generation

### Shared Domain Helpers (`js/shared`)

- math helpers
- entity sizing, lookup, and overlap helpers
- anchor resolution helpers
- selection normalization/comparison helpers

## Data Model

The canonical persisted graph format, field rules, and validation constraints are documented in [DATA_MODEL.md](/c:/Users/Paul/source/repos/hypernode/docs/DATA_MODEL.md).

At a high level, the graph payload contains:

- `name`
- `settings`
  - `backgroundStyle`
  - `anchorsMode`
  - `arrowheads`
  - `arrowheadSizeStep`
  - `nodeColorDefault`
- `nodes`
- `frames`
- `edges`

## State Management

The app uses a single central store with explicit mutation methods and subscriber-based rendering.

History snapshots are bounded (past stack capped at 100).

## Import/Export and Storage

- Autosave writes `{ name, settings, nodes, frames, edges }` to `localStorage`.
- Startup loads saved graph if valid.
- Import validates the full graph payload before replace.
- Export writes formatted JSON file.
- Theme preference is stored separately from graph JSON and graph autosave.

## Constraints

- No framework dependency.
- Keep top-level entry modules thin and feature-specific code in focused submodules.
- Prefer clear direct logic over abstraction-heavy patterns.
