# Hypernode - Design Brief

## Design Goals

The interface should feel:

- calm
- modern
- minimal
- practical

The UI should support extended focused use without clutter.

## Design System Direction

Hypernode should use a lightweight built-in design system rather than one-off component styling. The system should feel closer to simple, composable UI primitives such as ShadCN or Pico CSS than to bespoke page-specific chrome.

The design system should be:

- accessible by default
- themeable at the hypernode level
- semantic-token driven
- compact enough to stay out of the way of the canvas

The canvas remains the dominant visual surface, but the surrounding application chrome and canvas objects should read as part of the same system.

## Semantic Tokens

The design language should be defined in semantic tokens rather than hard-coded per-component colors.

Core tokens:

- `surface`
- `surface-muted`
- `surface-raised`
- `border`
- `text`
- `text-muted`
- `accent`
- `accent-contrast`
- `focus-ring`
- `danger`
- `success`

These tokens should drive the app shell, dialogs, controls, and canvas object shells consistently.

## Component Families

The design system should explicitly cover:

- surfaces and cards
- buttons
- inputs
- toggles
- dialogs
- pills and chips
- toolbar controls
- node and frame shells

Nodes, frames, image wells, and modal surfaces should feel like variations of the same component family instead of separate visual systems.

## Radius System

The UI should expose a shared radius scale that affects all major surfaces and controls, including nodes and frames.

Official radius presets:

- `sharp`
- `soft`
- `rounded` (default)

The selected radius preset should apply consistently across:

- cards and panels
- buttons and inputs
- dialogs and popovers
- nodes and frames
- image wells
- selection chrome and pills

## Layout

Current product layout:

- floating toolbar with compact icon actions that can be placed in any corner and switched between horizontal or vertical alignment
- full-screen canvas workspace with separate frame, edge, node, and overlay-control layers
- inline node and frame editing inside selected cards
- floating node-color popover
- modal settings and about dialogs
- transient bottom-right toast feedback for file and persistence workflows

The canvas should remain the dominant visual surface.

## Visual Style

The visual direction should emphasize:

- calm, minimal, dark-first neutral palettes with strong contrast
- subtle elevation and borders instead of heavy shadows
- restrained surfaces that support long editing sessions
- consistent component anatomy between app chrome and canvas objects

The theming model should stay preset-driven. Hypernode appearance should be selected from curated presets rather than a free-form token editor.

Curated appearance presets:

- `blueprint`
- `fjord`
- `slate` (soft grey palette)
- `paper`
- `ember`
- `soft-black`

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
- the same semantic surface, border, text, and radius language used by the rest of the UI

Selection controls should render above node content so resize handles, anchors, and the mini toolbar remain reachable even in dense layouts.

## Image Nodes

Image nodes should use the same card language as text nodes, but prioritize the image preview:

- image pane first, metadata second
- preserved image aspect ratio during render and resize
- bordered image surface with shared radius behavior inside the card
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

The node/frame palette should remain a lightweight annotation tool instead of a full theming surface.

- provide 10 curated swatches plus a reset action
- apply colors to selected nodes
- apply the same palette to selected frames
- update the default color used for newly created nodes when a swatch is chosen
- keep text legible against every palette option
- use palette-aware selected states instead of a single generic selection color

This palette system sits alongside the document-level UI theme presets rather than replacing them.

## Settings Panel

The settings panel should reflect graph-level controls that affect behavior or broad presentation:

- graph name
- UI theme preset
- UI radius preset
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

- visible keyboard focus outlines driven by the shared `focus-ring` token
- adequate contrast for text, surfaces, states, and controls across all presets
- keyboard support for delete, undo, redo, save, edit toggle, linked-node creation, directional navigation, and escape behavior
- themed controls remain readable and operable across `blueprint`, `fjord`, `slate`, `paper`, `ember`, and `soft-black`

## Persistence and Compatibility

Hypernode appearance should be document-level state:

- UI theme preset is saved in hypernode settings
- UI radius preset is saved in hypernode settings
- older documents without these values should fall back to `blueprint` and `rounded`

If the product also keeps an app-level system appearance preference, that preference should be secondary and must not override an explicit hypernode appearance preset.

## Future Visual Enhancement

- graph search
- minimap
- touch interaction polish
