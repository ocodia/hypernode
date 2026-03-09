# Hypernode - User Stories

## Purpose

This document captures version-1 user behavior slices with clear acceptance criteria.

## Epic 1 - Canvas Navigation

### US-1: Pan the canvas

As a user, I want to pan so I can navigate larger graphs.

Acceptance criteria:

- Panning is available on empty canvas drag.
- Panning updates viewport only, not node coordinates.
- Panning feels smooth and keeps nodes/edges aligned.

### US-2: Zoom the canvas

As a user, I want to zoom in/out for comfortable editing at different scales.

Acceptance criteria:

- Wheel/trackpad zoom is supported.
- Zoom level is bounded by configured min/max.
- Zooming keeps node/edge alignment.

### US-3: Reset view

As a user, I want a reset action to return to a known viewport.

Acceptance criteria:

- Reset restores default pan/zoom.
- Graph data remains unchanged.

## Epic 2 - Nodes

### US-4: Create nodes quickly

As a user, I want to create nodes fast from canvas or toolbar.

Acceptance criteria:

- Double-click canvas creates a node at pointer graph position.
- Toolbar action creates a node at default graph position.
- New node is immediately visible and selected.

### US-5: Drag nodes

As a user, I want to drag nodes to organize layout.

Acceptance criteria:

- Drag updates node position smoothly.
- Connected edges stay attached visually.
- Move operations are undoable.
- Dragging does not unintentionally trigger panning.

### US-6: Edit node content inline

As a user, I want to edit title/description without leaving the canvas.

Acceptance criteria:

- Node can enter inline edit mode from the selected-node mini toolbar.
- Node updates in real time as title/description inputs change.
- Empty title resolves to default title.
- Edit mode can be canceled with Escape.

### US-7: Delete nodes

As a user, I want to remove unwanted nodes.

Acceptance criteria:

- Selected node can be deleted via keyboard.
- Selected node mini toolbar provides a delete action.
- Connected edges are removed automatically.
- Deletion is undoable.

### US-18: Resize nodes from corners

As a user, I want to resize selected nodes so I can fit content and tune layout density.

Acceptance criteria:

- Selected nodes show four corner resize handles.
- Handles are hidden when node is not selected or is in edit mode.
- Dragging a corner resizes from that corner and is zoom-aware.
- Node size is clamped to minimum readable dimensions.
- Resize operations are undoable and redoable.

## Epic 3 - Edges

### US-8: Create edges between nodes

As a user, I want to connect nodes to represent relationships.

Acceptance criteria:

- Edge creation starts from node anchor points.
- Draft edge preview appears during target selection.
- Valid completion creates edge immediately.
- Invalid states (self-edge, missing node, duplicate direction) are prevented.
- Creation is undoable.

### US-9: Select and delete edges

As a user, I want to manage existing edges.

Acceptance criteria:

- Clicking an edge selects it.
- Selected edge has clear visual emphasis.
- Selected edge can be deleted via keyboard or overlay delete control.
- Deletion is undoable.

### US-10: Reconnect edge endpoints

As a user, I want to retarget an existing edge endpoint.

Acceptance criteria:

- Selected edge shows draggable endpoints.
- Dragging endpoint to valid node reconnects edge.
- Invalid reconnects are rejected safely.
- Reconnect is undoable.

## Epic 4 - Persistence and Files

### US-11: Autosave graph

As a user, I want work saved automatically.

Acceptance criteria:

- Graph changes autosave locally.
- Autosave does not require internet.

### US-12: Restore graph on reopen

As a user, I want previous work restored when I return.

Acceptance criteria:

- Startup loads valid saved graph.
- Invalid/corrupted saved data falls back to empty graph without crash.

### US-13: Export graph JSON

As a user, I want to back up/share graph data.

Acceptance criteria:

- Export action downloads valid JSON with nodes and edges.
- Export occurs fully client-side.

### US-14: Import graph JSON safely

As a user, I want to restore/import prior graph files.

Acceptance criteria:

- Import validates payload before apply.
- Valid import replaces current graph.
- Invalid import preserves current graph.
- User receives visible success/failure feedback.

## Epic 5 - Productivity and Safety

### US-15: Undo and redo

As a user, I want to recover from mistakes quickly.

Acceptance criteria:

- Undo/redo available via toolbar and keyboard.
- Core actions are covered (node create/move/edit/delete, edge create/reconnect/delete, import replace).

### US-16: Escape behavior

As a user, I want Escape to back out of temporary interaction states.

Acceptance criteria:

- Escape exits inline node edit mode.
- Escape cancels active edge draft/reconnect mode.
- Escape cancels active node resize mode.
- Escape clears selection when no mode is active.

### US-17: Keyboard delete behavior

As a user, I want keyboard delete to remove selected items.

Acceptance criteria:

- Delete/Backspace removes selected node or selected edge.
- Shortcuts do not hijack active text-input editing.

## Epic 6 - Frames

### US-19: Draw frames

As a user, I want to draw a frame so I can group related nodes spatially.

Acceptance criteria:

- Toolbar frame mode allows drag-to-draw frame rectangles.
- Releasing after a valid drag creates and selects a frame.
- Escape cancels active frame draw mode.

### US-20: Embed nodes in frames

As a user, I want to drag nodes into and out of frames so grouping is fluid.

Acceptance criteria:

- Node membership is resolved on drag release using overlap with frames.
- Embedded nodes move with their parent frame.
- Dragging a node out of overlap removes frame membership.

### US-21: Frame editing and edges

As a user, I want frames to behave like super nodes for metadata and connectivity.

Acceptance criteria:

- Frames support title/description editing and corner resize.
- Frame editor supports border width/style controls.
- Frames expose top/right/bottom/left anchors for edge create/reconnect.
- Node drag previews frame add/remove membership with distinct highlights.
- Deleting a frame keeps contained nodes and clears their frame membership.

## Definition of Done (v1)

Version 1 is complete when:

- core node and edge workflows operate end-to-end
- persistence and file flows are safe
- undo/redo are reliable for core actions
- UI remains lightweight and canvas-first
