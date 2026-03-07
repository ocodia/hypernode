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
  interaction/bindings.js
  persistence/file.js
  persistence/storage.js
  render/renderer.js
  state/store.js
  utils/constants.js
  utils/graph.js
  utils/id.js
index.html
```

## Core Modules

### State (`js/state/store.js`)

Stores:

- `nodes`, `edges`
- graph metadata (`name`, `settings`)
- `selection`
- `viewport` (`panX`, `panY`, `zoom`)
- UI state (`edgeDraft`, `edgeTwangId`, `editingNodeId`, `isPanning`, `isDragging`, `isConnecting`, `importStatus`)
- undo/redo history

### Rendering (`js/render/renderer.js`)

Responsible for:

- applying viewport transform
- rendering node cards and inline node editor UI
- rendering edges and selected-edge overlay controls
- rendering edge draft preview
- rendering import status toast

### Interaction (`js/interaction/bindings.js`)

Responsible for:

- pan and zoom interactions
- node selection/drag/edit lifecycle
- edge creation from node anchors
- edge endpoint reconnect workflow
- keyboard shortcuts
- toolbar actions

### Persistence (`js/persistence`)

- `storage.js`: load/save graph in `localStorage`
- `file.js`: import/export validated graph JSON files

### Utilities (`js/utils`)

- constants
- graph sanitization/validation
- id generation

## Data Model

### Node

```json
{
  "id": "node_id",
  "title": "Node title",
  "description": "",
  "x": 0,
  "y": 0
}
```

### Edge

```json
{
  "id": "edge_id",
  "from": "node_id",
  "to": "node_id",
  "fromAnchor": "left|right|top|bottom|null",
  "toAnchor": "left|right|top|bottom|null"
}
```

### Graph

```json
{
  "name": "Graph name",
  "settings": {
    "backgroundStyle": "dots|graph-paper",
    "anchorsMode": "auto|exact",
    "arrowheads": "shown|hidden",
    "arrowheadSizeStep": 0
  },
  "nodes": [],
  "edges": []
}
```

## State Management

The app uses a single central store with explicit mutation methods and subscriber-based rendering.

History snapshots are bounded (past stack capped at 100).

## Import/Export and Storage

- Autosave writes `{ name, settings, nodes, edges }` to `localStorage`.
- Startup loads saved graph if valid.
- Import validates payload before replace.
- Export writes formatted JSON file.

## Constraints

- No framework dependency.
- Keep modules focused.
- Prefer clear direct logic over abstraction-heavy patterns.
