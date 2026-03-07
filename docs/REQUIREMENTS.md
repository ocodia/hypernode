# Hypernode - Requirements

## Functional Requirements

### Canvas and Viewport

FR-1  
The system must provide an interactive graph canvas.

FR-2  
Users must be able to pan the canvas on empty-space drag.

FR-3  
Users must be able to zoom the canvas with bounded min/max levels.

FR-4  
Users must be able to reset the viewport to default pan/zoom.

### Node Management

FR-5  
Users must be able to create nodes.

FR-6  
New nodes must appear at the intended canvas location (or fixed toolbar spawn point in graph space).

FR-7  
Each node must contain:

- id
- title
- optional description
- x coordinate
- y coordinate

FR-8  
Users must be able to drag nodes.

FR-9  
Users must be able to edit node title and description inline.

FR-10  
Deleting a node must remove connected edges.

### Edge Management

FR-11  
Users must be able to create edges between nodes.

FR-12  
Edges must remain attached visually when nodes move.

FR-13  
Users must be able to select and delete edges.

FR-14  
Users must be able to reconnect edge endpoints to a different node.

FR-15  
Invalid edge states must be prevented (missing nodes, self-edges, duplicate directed edges).

### Persistence and Files

FR-16  
Graphs must autosave to browser storage.

FR-17  
Saved graphs must load on app startup when valid.

FR-18  
Users must be able to export graph JSON.

FR-19  
Users must be able to import graph JSON.

FR-20  
Import must validate payload before replacing current graph.

FR-21  
Import/export operations should provide visible status feedback.

### Undo/Redo and Keyboard

FR-22  
Users must be able to undo actions.

FR-23  
Users must be able to redo actions.

FR-24  
Delete keyboard shortcuts must remove selected node/edge.

FR-25  
Escape must exit current lightweight interaction states (edge draft or inline edit) and otherwise clear selection.

## Non Functional Requirements

### Performance

NFR-1  
Common interactions (pan/zoom/drag) must feel smooth on modern hardware.

NFR-2  
Edge updates during node movement must remain visually stable.

### Offline Operation

NFR-3  
Core editing features must function without internet access.

NFR-4  
No external API dependency is allowed for core operation.

### Browser Support

NFR-5  
The application must target modern Chromium, Firefox, and Safari-class browsers.

### Data Format and Safety

NFR-6  
Graph persistence and import/export formats must use JSON with `{ nodes, edges }`.

NFR-7  
All graph data processing must occur client-side.

### Accessibility

NFR-8  
Interactive controls must provide visible focus states.

NFR-9  
Core editing actions should be keyboard-accessible where practical.
