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
- optional description stored as a string and rendered as a basic markdown subset (ATX headers, paragraphs, lists, links, emphasis, inline code)
- x coordinate
- y coordinate
- optional width
- optional height

FR-8  
Users must be able to drag nodes.

FR-9  
Users must be able to edit node title and description inline.
Description editing must preserve raw markdown source while rendered node/frame descriptions display the supported markdown subset without executing raw HTML.

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

FR-15a
When anchors mode is `auto`, stored edge anchors must stay synchronized with the latest resolved endpoint sides so autosave and export persist the current attachment points.

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
Delete keyboard shortcuts must remove selected node/edge, except in Focus mode where delete must require `Ctrl/Cmd + Delete` (or `Ctrl/Cmd + Backspace`) plus confirmation.

FR-25  
Escape must exit current lightweight interaction states (edge draft, node resize, or inline edit) and otherwise clear selection.

FR-26  
Users must be able to resize selected nodes from corner handles.

FR-27
Users must be able to start a new graph from the toolbar, with a confirmation prompt before discarding an existing non-empty graph.

FR-28
Selection toolbars must allow applying palette colors to selected nodes and frames without changing the default color used for newly created nodes.

FR-28a
Canvas selection toolbars must remain usable across the supported zoom range by keeping their click targets effectively screen-space sized while staying attached to the selected node/frame bounds.

FR-29
Graph settings must include graph name, UI theme preset, enabled theme presets, UI radius preset, toolbar position, toolbar orientation, toast position, metadata position, background style, anchors mode, arrowhead visibility, and arrowhead size.

FR-29a
The shortcuts dialog must support search by shortcut keys and action text.

FR-29b
Toolbar, toast, and metadata position settings must use an interactive placement control that prevents overlap and auto-resolves conflicts to the nearest valid slot.

FR-29c
Settings, About, and Shortcuts dialogs must dismiss when users click the backdrop outside the dialog content.

FR-29d
Dialog overflow must scroll within the dialog content regions rather than scrolling the entire dialog shell.

FR-30
The app must provide hypernode-level appearance presets and persist the selected UI theme preset and UI radius preset with the graph document.

FR-30a
The UI theme preset must apply semantic design tokens across shared UI primitives and canvas objects, including dialogs, toolbar controls, nodes, frames, and image wells.

FR-30aa
Installed UI theme presets must come from a canonical registry-backed theme definition model rather than CSS alias selectors or duplicated settings markup.

FR-30ab
Users must be able to enable or disable individual UI theme presets for keyboard theme cycling, and the `T` shortcut must skip disabled themes while preserving registry order among enabled themes.

FR-30b
The UI radius preset must apply a shared radius scale across controls, dialogs, cards, nodes, frames, image wells, and selection chrome.

FR-31
Users must be able to create, edit, move, resize, and delete Frames.

FR-32
Frames must support anchor-based edge create/reconnect workflows like nodes.

FR-33
Nodes must support single-frame embedding by overlap; embedded nodes move with their parent Frame.

FR-34
Deleting a Frame must ungroup contained nodes without deleting those nodes.

FR-35
Frames must support per-frame border width and style controls (`solid`, `dashed`, `dotted`).

FR-35a
Nodes must support per-node border width and style controls (`solid`, `dashed`, `dotted`) with persistence and multi-node batch application.

FR-36
During node drag, Frames must provide visual add/remove membership preview feedback before drop.

FR-37
Users must be able to drag a local image file onto the canvas to create an image node at the drop position.

FR-38
Focused image nodes must provide a zen-mode drop zone that accepts a local image file and replaces the node image in place.
The drop zone must be visible in zen edit mode and hidden in zen read mode.
Canvas inline node editing must not expose an image drop zone or other in-place image-add affordance for existing nodes.

FR-39
Node title and description editors must use placeholders as their visible affordance in both canvas edit mode and zen edit mode.

FR-40
Zen read mode must render node image content before title and description, and the focused node body must scroll internally for long descriptions.

FR-41
Users must be able to Ctrl-click (Cmd-click on macOS) edges to multi-select them. Multi-selected edges must visually highlight.
A multi-edge toolbar must appear at the average midpoint of the selected edges, displaying the selection count and providing controls for colour, line thickness, line style, edge type, and bulk delete — mirroring the single-edge toolbar and the multi-node toolbar pattern.

FR-42
Right-clicking on the canvas must display a context menu at the cursor position.
The blank-canvas context menu must offer Add Node, Add Frame, and Add Image options that create entities at the right-click graph point.
The context menu must be extensible so that node, edge, and frame targets can provide target-specific menu items in future.
The context menu must dismiss on outside click, Escape, scroll, or any menu-item action.
The context menu must use the shared design system tokens and radius presets.

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

NFR-6
When file system APIs are unavailable, unsupported actions should degrade gracefully (for example, disabling open/save controls with clear affordance).

### Data Format and Safety

NFR-7
Graph persistence and import/export formats must use JSON with `{ name, settings, nodes, frames, edges }`.

NFR-8
All graph data processing must occur client-side.

### Accessibility

NFR-9
Interactive controls must provide visible focus states across all appearance presets.

NFR-10
Core editing actions should be keyboard-accessible where practical.

NFR-11
Themed surfaces, text, and control states must maintain accessible contrast across the supported UI theme presets.

NFR-12
Nodes, frames, dialogs, inputs, and toolbar controls must inherit the shared radius system consistently for each supported radius preset.
