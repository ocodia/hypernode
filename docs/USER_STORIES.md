# hypernode - User Stories

## Purpose

This document captures version-1 user behavior slices with clear acceptance criteria.

## Epic 1 - Canvas Navigation

### US-1: Pan the canvas

As a user, I want to pan so I can navigate larger hypernodes.

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
- Hypernode data remains unchanged.

## Epic 2 - Nodes

### US-4: Create nodes quickly

As a user, I want to create nodes fast from canvas or toolbar.

Acceptance criteria:

- Double-click canvas creates a node at pointer hypernode position.
- Toolbar action creates a node at the default hypernode position.
- New node is immediately visible and selected.
- A fresh hypernode starts with one starter node already selected, in Zen edit mode, with the title focused.

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

### US-11: Autosave hypernode

As a user, I want work saved automatically.

Acceptance criteria:

- Hypernode changes autosave locally.
- Autosave does not require internet.

### US-12: Restore hypernode on reopen

As a user, I want previous work restored when I return.

Acceptance criteria:

- Startup loads a valid saved hypernode.
- Invalid or corrupted saved data falls back to a fresh hypernode without crashing.

### US-13: Export hypernode JSON

As a user, I want to back up or share hypernode data.

Acceptance criteria:

- Export action downloads valid JSON with nodes and edges.
- Export occurs fully client-side.

### US-14: Import hypernode JSON safely

As a user, I want to restore or import prior hypernode files.

Acceptance criteria:

- Import validates payload before apply.
- Valid import replaces the current hypernode.
- Invalid import preserves the current hypernode.
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
- While Focus mode is active, deletion requires `Ctrl/Cmd + Delete` or `Ctrl/Cmd + Backspace` and a confirmation prompt.

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

## Epic 7 - Post-v1 Productivity and Presentation

### US-22: Create image nodes from local files

As a user, I want to place local images on the canvas so I can use visual references inside the graph.

Acceptance criteria:

- Toolbar image action opens a local image picker.
- Dragging a valid local image file onto the canvas creates an image node at the drop position.
- Valid image files create image nodes with embedded base64 image data.
- New image nodes are created selected and enter the same inline editing flow as other nodes.
- Invalid image reads fail safely without corrupting the graph.

### US-33: Replace a focused image from Zen mode

As a user, I want Focus mode to accept dropped images so I can update a visual reference without leaving the reading/editing view.

Acceptance criteria:

- Focus mode for image nodes renders a visible drop zone near the focused image.
- Dropping a valid local image on that drop zone replaces the current image content.
- Clicking the drop zone opens the same local image picker used by the toolbar.
- Replacement preserves the node and its text metadata while updating the stored image payload safely.

### US-23: Resize image nodes while preserving aspect ratio

As a user, I want image nodes to resize cleanly so visual references stay readable and undistorted.

Acceptance criteria:

- Image nodes expose corner resize handles when selected.
- Resize keeps the image aspect ratio locked.
- Persisted width and height round-trip through autosave and JSON files.
- Title and description remain rendered below the image pane after resize.

### US-24: Add to a node selection incrementally

As a user, I want to add or remove nodes from selection so I can act on a group without losing my current context.

Acceptance criteria:

- `Ctrl/Cmd + Click` toggles a node in the current node selection.
- Multi-selection remains node-only and does not mix with edge or frame selection.
- Clicking empty canvas clears the current node selection.
- Single-node selection still collapses back to the normal single-selected state when only one node remains.

### US-25: Marquee-select multiple nodes

As a user, I want to drag a selection rectangle so I can select nearby nodes quickly.

Acceptance criteria:

- `Ctrl/Cmd + Drag` on empty canvas starts marquee selection.
- A visible marquee rectangle is rendered during the drag.
- Nodes are included when their interaction rect touches the marquee area.
- Marquee results merge with the selection state that existed when the drag started.

### US-26: Move a selected node group together

As a user, I want to move multiple selected nodes in one gesture so I can reorganize a cluster efficiently.

Acceptance criteria:

- Dragging any selected node moves the full selected node group.
- Relative positions inside the selected group are preserved during drag.
- Connected edges remain visually attached while the group moves.
- Group movement is undoable and redoable.

### US-27: Apply palette colors to nodes and frames

As a user, I want to color graph objects so I can add visual structure and emphasis.

Acceptance criteria:

- The palette popover offers 10 curated swatches and a reset action.
- Choosing a swatch applies that color to all selected nodes.
- Choosing a swatch while a frame is selected applies that color to the frame.
- Reset removes the explicit object color and returns it to the default styling.

### US-28: Set the default color for newly created nodes

As a user, I want my chosen palette color to carry forward so repeated node creation is faster.

Acceptance criteria:

- Choosing a palette swatch updates the graph-level default node color.
- Newly created text nodes inherit the current default color.
- Newly created image nodes inherit the current default color.
- Resetting the palette default removes inherited color from future nodes without changing existing ones.

### US-29: Edit graph settings from a dedicated panel

As a user, I want hypernode-wide controls in one place so I can adjust presentation and edge behavior without editing files.

Acceptance criteria:

- Settings dialog exposes hypernode name, UI theme preset, UI radius preset, background style, anchors mode, arrowhead visibility, arrowhead size, a `Show shortcuts in UI` toggle, and a `Show shortcuts on toolbar` toggle.
- Changing a setting updates the current hypernode immediately.
- Hypernode name updates the metadata chip and browser tab title.
- Settings remain available without leaving the canvas workflow.

### US-29a: Choose a UI theme preset per hypernode

As a user, I want to choose a curated appearance preset so each hypernode can have a consistent UI look without manual color tuning.

Acceptance criteria:

- Settings expose UI theme presets `blueprint`, `fjord`, `slate`, `paper`, `ember`, and `soft-black`.
- Choosing a preset updates shared UI surfaces, controls, dialogs, nodes, and frames.
- The node/frame annotation palette remains available and distinct from the document UI theme.
- Focus states and text contrast remain readable across all supported presets.

### US-29b: Choose a shared radius preset

As a user, I want to adjust the global radius style so the hypernode can feel more boxy or more rounded.

Acceptance criteria:

- Settings expose radius presets `sharp`, `soft`, and `rounded`.
- Changing the preset updates buttons, inputs, dialogs, nodes, frames, image wells, and selection chrome consistently.
- Nodes and frames visibly inherit the same radius language as the surrounding application UI.
- Changing the radius preset updates the current hypernode immediately.

### US-30: Persist settings through autosave and file round-trips

As a user, I want hypernode settings to stay with the document so the hypernode reopens the way I left it.

Acceptance criteria:

- Autosave persists hypernode settings with the hypernode payload.
- Opening a valid hypernode JSON file restores persisted settings.
- Saving a hypernode JSON file writes the current settings into the file.
- Invalid settings payloads are rejected before replacing the current hypernode.
- UI theme preset and UI radius preset round-trip with the same persistence guarantees as the other graph settings.

### US-33: Search keyboard shortcuts

As a user, I want the keyboard shortcuts dialog to be searchable so I can find commands by key or action quickly.

Acceptance criteria:

- The shortcuts dialog renders from the current shortcut catalog rather than duplicated static markup.
- Searching matches against both displayed shortcut keys and action descriptions.
- A clear empty state appears when no shortcuts match the query.
- Turning off shortcut UI hides shortcut affordances in the UI without disabling the actual keyboard commands.
- Toolbar shortcut hints can be shown independently when shortcut UI is enabled.

### US-31: Navigate the graph with directional shortcuts

As a user, I want keyboard navigation across connected nodes so I can inspect a hypernode without relying on pointer travel.

Acceptance criteria:

- `Ctrl/Cmd + Arrow` selects a connected node in the requested direction when available.
- If no directly connected candidate fits that direction, the nearest valid node in that direction is selected.
- When no node is selected, directional navigation can start from an available node.
- Navigation changes selection without entering edit mode.

### US-32: Create a linked node from the keyboard

As a user, I want to create a connected follow-up node from the keyboard so I can expand ideas quickly.

Acceptance criteria:

- `Ctrl/Cmd + Shift + Enter` creates a new node from the currently selected node.
- The new node is positioned near the source node with collision-avoidance behavior.
- An edge from the source node to the new node is created automatically.
- The new node becomes selected and enters edit mode immediately.

## Definition of Done (v1)

Version 1 is complete when:

- core node and edge workflows operate end-to-end
- persistence and file flows are safe
- undo/redo are reliable for core actions
- UI remains lightweight and canvas-first
- appearance presets and radius presets persist consistently with the hypernode document
