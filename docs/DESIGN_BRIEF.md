# Hypernode - Design Brief

## Design Goals

The interface should feel:

- calm
- modern
- minimal
- practical

The UI should support extended focused use without clutter.

## Layout

Current product layout:

- floating top toolbar with graph title and compact icon actions
- full-screen canvas workspace with separate frame, edge, node, and overlay-control layers
- inline node and frame editing inside selected cards
- floating node-color popover
- modal settings and about dialogs
- transient toast feedback for file and persistence workflows

The canvas should remain the dominant visual surface.

## Visual Style

- soft minimalism
- rounded cards and controls
- subtle borders/shadows
- restrained neutral surfaces with a curated color system for graph objects

## Canvas

- spacious working area
- subtle patterned background with switchable `dots` and `graph paper` modes
- pan/zoom should feel stable and predictable
- overlays should stay aligned with the transformed viewport at every zoom level

## Nodes

Text nodes should provide:

- clear title hierarchy
- optional description text
- compact selected-state actions
- distinct selected, connection-target, and membership-preview states

Selection controls should render above node content so resize handles, anchors, and the mini toolbar remain reachable even in dense layouts.

## Image Nodes

Image nodes should use the same card language as text nodes, but prioritize the image preview:

- image pane first, metadata second
- preserved image aspect ratio during render and resize
- bordered image surface with rounded corners inside the card
- title and description rendered below the image
- selection, anchors, and resize controls consistent with text nodes

## Edges

- smooth curved connections
- selected edge emphasis
- selected edge overlay controls (delete + reconnect endpoints)
- edge draft preview during connect/reconnect flows
- optional direction arrowheads controlled from settings

## Typography

Use a readable sans-serif system stack.

Prioritize legibility over decorative styling.

## Color Palette System

The palette system should feel like a lightweight annotation tool instead of a full theming surface.

- provide 10 curated swatches plus a reset action
- apply colors to selected nodes
- apply the same palette to selected frames
- update the default color used for newly created nodes when a swatch is chosen
- keep text legible against every palette option
- use palette-aware selected states instead of a single generic selection color

## Settings Panel

The settings panel should reflect graph-level controls that affect behavior or broad presentation:

- graph name
- background style
- anchors mode (`Auto-anchor` or `Exact anchor`)
- arrowhead visibility (`Show` or `Hide`)
- arrowhead size slider

The panel should read as a compact control surface with grouped sections, clear labels, and short helper text for behavior-heavy options.

## Interaction Feedback

Provide clear visual states for:

- hover
- selection
- editing
- connecting
- panning
- marquee selection
- frame membership preview

Current interaction affordances should include:

- additive multi-select for nodes
- marquee selection with a visible selection rectangle
- overlay resize handles and anchor controls for selected nodes and frames
- mini toolbar actions for the single selected node or frame
- keyboard shortcuts for edit toggle, linked-node creation, graph navigation, save, undo, redo, delete, and escape/cancel flows

Animation should be subtle and short.

## Accessibility

Ensure:

- visible keyboard focus outlines
- adequate contrast for key UI states
- keyboard support for delete, undo, redo, save, edit toggle, linked-node creation, directional navigation, and escape behavior

## Future Visual Enhancement

- graph search
- minimap
- touch interaction polish
