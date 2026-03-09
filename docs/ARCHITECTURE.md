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
- `frames`
- graph metadata (`name`, `settings`)
- `selection`
- `viewport` (`panX`, `panY`, `zoom`)
- UI state (`edgeDraft`, `edgeTwangId`, `editingNodeId`, `isPanning`, `isDragging`, `isConnecting`, `importStatus`)
  - includes frame UI state (`editingFrameId`, `isDrawingFrame`, `frameDraft`)
  - includes resize interaction state (`isResizing`)
- undo/redo history

### Rendering (`js/render/renderer.js`)

Responsible for:

- rendering frame boxes/metadata/anchors/resize UI
- applying viewport transform
- rendering node cards, selected-node mini toolbar actions, and inline node editor UI
- rendering edges and selected-edge overlay controls
- rendering edge draft preview
- rendering import status toast

### Interaction (`js/interaction/bindings.js`)

Responsible for:

- pan and zoom interactions
- node selection/drag/edit lifecycle
- frame draw/selection/drag/resize/edit lifecycle
- selected-node mini toolbar actions (`Edit`, `Delete`)
- edge creation from node/frame anchors
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
  "kind": "text|image",
  "title": "Node title",
  "description": "",
  "x": 0,
  "y": 0,
  "frameId": "frame_id|null",
  "width": 210,
  "height": 96,
  "imageData": "data:image/png;base64,...",
  "imageAspectRatio": 1.777
}
```

`kind` defaults to `text`. `imageData` and `imageAspectRatio` are required when `kind` is `image`.

`width` and `height` are optional for text nodes and are present when explicitly resized. Image nodes persist explicit width/height for ratio-safe resizing.

### Frame

```json
{
  "id": "frame_id",
  "title": "Frame title",
  "description": "",
  "x": 0,
  "y": 0,
  "width": 320,
  "height": 200,
  "borderWidth": 1,
  "borderStyle": "solid|dashed|dotted"
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
  "frames": [],
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
