# hypernode

hypernode is a lightweight browser-based editor for building connected thinking spaces fast.

It runs fully client-side with no backend and no account system. Hypernode data autosaves in `localStorage`, and can be opened or saved as hypernode files backed by JSON.

Hypernode includes a lightweight built-in design system for surfaces, buttons, dialogs, inputs, and canvas objects. Appearance is preset-driven, stored with the document, and includes a shared radius scale that applies across controls, nodes, and frames.

## Current Features

- Fresh hypernodes start with a starter node already open in Zen edit mode, with the title focused and seeded to the current date.
- Create nodes by double-clicking the canvas or using the toolbar button, opening immediately in edit mode with title text selected.
- Edit node title/description inline from the selected-node mini toolbar, with description display supporting basic markdown (headers, paragraphs, lists, links, emphasis, inline code).
- Color selected node and frame backgrounds from local selection toolbars (10 curated colors + reset) with legible text and complementary selected highlights.
- Delete selected nodes with `Delete`/`Backspace`, or with `Ctrl/Cmd + Delete` plus confirmation while in Focus mode.
- Create edges from text and image node anchor points (top/right/bottom/left).
- Resize selected nodes from corner handles (top-left/top-right/bottom-right/bottom-left).
- Selected node/frame toolbars, resize handles, and anchor points render above overlapping canvas content.
- Resize handles and anchor points grow when zoomed out so they stay easier to grab.
- Selection toolbars stay zoom-agnostic so node and frame toolbar buttons remain clickable across supported zoom levels.
- Draw Frames from toolbar drag mode. Frames act as background super-nodes with anchors, resize handles, and title/description, including the same basic markdown support in descriptions.
- Frame mini toolbar renders above selected frames and includes color, border width, border style, edit/confirm, and delete controls.
- Node mini toolbars include color, border width, border style, and delete controls; single-node toolbars also include `Edit` and `Focus`.
- Multi-selected nodes show one shared toolbar centered above the selection bounds for batch color, border, and delete actions.
- Frame inline editor keeps title and description fields while frame border controls live in the frame toolbar.
- Drag nodes into Frames to embed them; embedded nodes move with their Frame and can be dragged out to ungroup.
- While dragging nodes, frames preview add/remove membership with distinct highlight states.
- While resizing frames, nodes preview add/remove membership changes and grouping updates on resize release.
- Create and reconnect edges to Frames via frame anchors.
- Add image nodes from the toolbar or by dragging local image files onto the canvas (stored as base64 data URLs in the hypernode JSON payload).
- Resize image nodes with preserved image aspect ratio, with title and description rendered below the image.
- Single selected nodes show a mini toolbar above the node with `Edit`, `Focus`, color, border, and delete actions.
- Single selected nodes also expose a `Focus` action for full-screen zen editing; Focus mode stays responsive across device sizes, uses placeholder-based node fields while editing, shows the image drop zone only in zen edit mode for adding or replacing images on existing nodes, and presents image-first scrollable reading for long descriptions.
- Multi-select nodes with `Ctrl/Cmd + click` (additive).
- Multi-select nodes with `Ctrl/Cmd + drag` marquee (touch/intersection hit rule).
- Drag any selected node to move the full selected group together.
- Clicking empty canvas clears selection.
- Render directed edge arrowheads at destination anchors with curved-approach rotation.
- Reconnect existing edge endpoints by dragging selected edge endpoints.
- Delete selected edges via inline edge overlay control or keyboard delete.
- Multi-select edges with `Ctrl/Cmd + click` (additive); multi-edge toolbar shows selection count with batch colour, thickness, style, type, and delete controls.
- Pan canvas with pointer drag on empty space.
- Zoom with mouse wheel/trackpad (bounded: `0.35` to `2.5`).
- Reset view to default pan/zoom.
- Undo/redo via toolbar and keyboard shortcuts.
- Auto-save hypernodes to browser storage.
- Open/save hypernode JSON files with validation and status toast feedback.
- Toasts render in any screen corner, use accent-highlighted glass surfaces, and auto-resolve away from occupied toolbar/meta placements.
- Start a new hypernode from the toolbar (with discard confirmation when existing hypernode data is present).
- Built-in semantic design system for surfaces, buttons, inputs, dialogs, toolbar controls, nodes, and frames.
- Curated hypernode-level UI theme presets (`blueprint`, `fjord`, `slate`, `paper`, `ember`, `chalkboard`, `citrine`, `canopy`, `tidepool`, and `dusk`) saved with the document through a modular theme registry.
- Shared UI radius presets (`sharp`, `soft`, `rounded`) that affect controls, dialogs, nodes, frames, image wells, and selection chrome.
- Full-screen settings, about, and keyboard shortcuts dialogs with responsive layouts.
- Theme-aware custom scrollbars across dialogs, focus views, and editor panes that inherit the active preset and radius scale.
- Settings menu for document-level defaults:
  - unified theme settings list with active theme selection plus enabled theme presets for the `T` keyboard cycle
  - UI radius preset (`sharp`, `soft`, or `rounded`)
  - hypernode background style (`blank`, `dots`, or `graph-paper`)
  - anchors mode (`auto` or `exact`) where `auto` keeps each edge's stored anchor points synced to the currently resolved connection sides as nodes and frames move
  - arrowheads visibility (`show` or `hide`)
  - arrowhead size (`10` levels, from `100%` to `280%` in `20%` increments)
  - toolbar position (`top left`, `top right`, `bottom left`, or `bottom right`)
  - toolbar orientation (`horizontal` or `vertical`)
  - toast position (`top left`, `top right`, `bottom left`, or `bottom right`)
  - metadata position (`top left`, `top right`, `bottom left`, or `bottom right`)
- Toolbar color picks affect only the current node or frame selection and do not change the default color for newly created nodes.
- Hypernode name is shown in a glassy metadata chip with a file icon and live canvas coordinates; its corner position is configurable, the browser tab title stays in sync, and double-clicking the file icon opens a rename modal.
- First-time Save suggests a filename based on the hypernode name.
- Open/save toolbar actions use the File System Access API and are disabled in browsers that do not support it.
- Installable PWA with offline app-shell caching.
- Interaction-state cursor feedback for drag/connect workflows.
- Searchable keyboard shortcuts dialog with key/action matching, including punctuation-light searches such as `comma`, `slash`, `?`, and `delete`.
- About dialog with a toggleable guide wizard, keyboard shortcuts, and a GitHub link.
- Visible focus states, keyboard-usable controls, and contrast-conscious presets across the themed UI.
- Native radios, checkboxes, ranges, and custom switches inherit their accent treatment from the active theme preset.

## Keyboard Shortcuts

Use the shortcuts dialog to search by key combo or action name.

- `Delete` / `Backspace`: delete selected node/edge
- `Ctrl/Cmd + Shift + H`: create a new hypernode
- `Ctrl/Cmd + O`: open a hypernode file
- `N`: add a text node
- `Ctrl/Cmd + N`: add a text node at the current pointer position
- `I`: add an image node
- `F`: toggle frame draw mode
- `Ctrl/Cmd + Delete` or `Ctrl/Cmd + Backspace`: delete the focused node from Focus mode after confirmation
- `Ctrl/Cmd + Shift + Enter`: create a new node linked from the selected node
- `Ctrl/Cmd + Arrow` (`Up`/`Down`/`Left`/`Right`): follow connected node in that direction, otherwise nearest
- `Ctrl/Cmd + Z`: undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z`: redo
- `Ctrl/Cmd + S`: save hypernode file
- `Ctrl/Cmd + 0`: reset view
- `Ctrl/Cmd + Enter`: toggle selected node/frame editor
- `Ctrl/Cmd + Alt + Enter`: toggle Focus mode for the selected node
- `Ctrl/Cmd + Click`: add a node or edge to current selection
- `Ctrl/Cmd + ,`: open settings
- `Ctrl/Cmd + /`: open keyboard shortcuts
- `T`: toggle to the next enabled theme preset
- `Shift + ?`: open About
- `Escape`: exit Focus/node edit mode, cancel edge draft mode, or clear selection
- `Escape`: also exits frame draw mode and frame edit mode

## Tech Stack

- HTML
- CSS
- JavaScript (ES modules)
- SVG (edge rendering + edge overlay controls)
- `localStorage` (persistence)

No frameworks or backend services are used.

## Design System

Hypernode uses a small semantic design system instead of ad hoc component styling. The system is designed to stay lightweight and canvas-first while keeping the rest of the interface consistent and accessible.

Core semantic tokens include:

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

These tokens are applied across:

- toolbar controls
- dialogs and popovers
- buttons, inputs, toggles, and native form controls
- metadata chips and pills
- nodes, frames, and image wells

Appearance stays preset-driven:

- UI theme presets: `blueprint`, `fjord`, `slate`, `paper`, `ember`, `chalkboard`, `citrine`, `canopy`, `tidepool`, `dusk`
- UI radius presets: `sharp`, `soft`, `rounded`

Theme definitions are registry-backed and applied as semantic token maps, so future installable themes can be added without duplicating CSS aliases or hard-coded settings markup.

The selected radius preset applies to standard UI controls and canvas objects alike, including nodes and frames.

If the product also exposes a local theme toggle or system color-mode preference, that preference is secondary to the hypernode's saved appearance preset and should not override it.

## Project Structure

```text
docs/
css/
  styles.css
js/
  main.js
  shared/
  interaction/
    binders/
  persistence/
  render/
    modules/
  state/
  utils/
icons/
index.html
```

## Run Locally

Serve the folder with any static server.

```bash
npx serve .
```

or

```bash
python -m http.server
```

Then open the URL shown by your server (commonly `http://localhost:3000` or `http://localhost:8000`).

For checks:

```bash
npm install
npm test
npm run lint
```

## Version 1 Scope

Version 1 includes the core hypernode editor loop:

- node create/edit/move/delete
- edge create/reconnect/delete
- pan/zoom/reset view
- selection and inline controls
- undo/redo
- local persistence
- hypernode JSON file open/save
- hypernode-level appearance presets and shared UI radius presets

## Out of Scope (v1)

- collaboration
- cloud sync
- authentication
- plugins
- advanced diagramming feature sets

## Future Work

- graph search
- grouping/clustering
- minimap
- touch interaction polish
- IndexedDB support for large graphs
- multiple graph documents

## Keeping docs in sync when adding features

For each new feature PR, update docs as part of the same change set (do not defer to a later PR):

1. **Update requirements first** (`docs/REQUIREMENTS.md`): add or adjust FR/NFR entries that define behavior and constraints.
2. **Update user-facing behavior** (`README.md`): update feature list, shortcuts, settings/options, and compatibility notes.
3. **Cross-check UI copy** against `index.html` labels and dialog text so docs match what users see.
4. **Verify persistence impact**: if graph shape/settings/storage keys change, document the exact current contract in `docs/DATA_MODEL.md`.
5. **Run a lightweight docs audit before merge**: confirm every new toolbar control, shortcut, setting, and workflow is represented in README and requirements.

Recommended PR checklist item:

- [ ] Requirements updated (if behavior changed)
- [ ] README updated (if user-visible behavior changed)
- [ ] Any new shortcut/settings/file-format behavior documented

## Contributor Notes

- `docs/DATA_MODEL.md` is the source of truth for persisted settings enums and defaults.
- `js/state/store.js` is the source of truth for the public store API used by rendering and interactions.
- `docs/REGRESSION_CHECKLIST.md` is the source of truth for manual interaction regression coverage.

## License

Released under the [MIT License](https://opensource.org/license/MIT).
