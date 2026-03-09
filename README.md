# hypernode

hypernode is a lightweight browser-based node graph editor for fast visual thinking.

It runs fully client-side with no backend and no account system. Graph data autosaves in `localStorage`, and can be opened/saved as JSON files.

## Current Features

- Create nodes by double-clicking the canvas or using the toolbar button, opening immediately in edit mode with title text selected.
- Edit node title/description inline from the selected-node mini toolbar, with description display supporting basic markdown (headers, paragraphs, lists, links, emphasis, inline code).
- Color selected node backgrounds from a toolbar palette (10 curated colors + reset) with legible text and complementary selected highlights in light/dark themes.
- Delete selected nodes with `Delete`/`Backspace`.
- Create edges from text and image node anchor points (top/right/bottom/left).
- Resize selected nodes from corner handles (top-left/top-right/bottom-right/bottom-left).
- Selected node/frame toolbars, resize handles, and anchor points render above overlapping canvas content.
- Resize handles and anchor points grow when zoomed out so they stay easier to grab.
- Draw Frames from toolbar drag mode. Frames act as background super-nodes with anchors, resize handles, and title/description, including the same basic markdown support in descriptions.
- Frame mini toolbar renders above selected frames.
- Frame inline editor includes border width (`1-8`) and border style (`solid`, `dashed`, `dotted`).
- Drag nodes into Frames to embed them; embedded nodes move with their Frame and can be dragged out to ungroup.
- While dragging nodes, frames preview add/remove membership with distinct highlight states.
- While resizing frames, nodes preview add/remove membership changes and grouping updates on resize release.
- Create and reconnect edges to Frames via frame anchors.
- Add image nodes from the toolbar using local image files (stored as base64 data URLs in graph JSON).
- Resize image nodes with preserved image aspect ratio, with title and description rendered below the image.
- Single selected nodes show a mini toolbar above the node with `Edit` and `Delete` actions.
- Multi-select nodes with `Ctrl/Cmd + click` (additive).
- Multi-select nodes with `Ctrl/Cmd + drag` marquee (touch/intersection hit rule).
- Drag any selected node to move the full selected group together.
- Clicking empty canvas clears selection.
- Render directed edge arrowheads at destination anchors with curved-approach rotation.
- Reconnect existing edge endpoints by dragging selected edge endpoints.
- Delete selected edges via inline edge overlay control or keyboard delete.
- Pan canvas with pointer drag on empty space.
- Zoom with mouse wheel/trackpad (bounded: `0.35` to `2.5`).
- Reset view to default pan/zoom.
- Undo/redo via toolbar and keyboard shortcuts.
- Auto-save graph to browser storage.
- Open/save graph JSON files with validation and status toast feedback.
- Start a new graph from the toolbar (with discard confirmation when existing graph data is present).
- Settings menu for:
  - graph background style (`dots` or `graph paper`)
  - anchors mode (`auto-anchor` or `exact anchor`)
  - arrowheads visibility (`show` or `hide`)
  - arrowhead size (`10` levels, from `100%` to `280%` in `20%` increments)
  - graph name
- Node color tool also sets the default color for newly created nodes.
- Node color tool also applies to selected Frames (flat palette style) and still sets the default color for newly created nodes.
- Graph name shown in toolbar title and browser tab title.
- First-time Save suggests a filename based on the graph name.
- Open/save toolbar actions use the File System Access API and are disabled in browsers that do not support it.
- Installable PWA with offline app-shell caching.
- Interaction-state cursor feedback for drag/connect workflows.
- About dialog with usage instructions and keyboard shortcuts.
- Dark mode toggle with persisted theme preference.

## Keyboard Shortcuts

- `Delete` / `Backspace`: delete selected node/edge
- `Ctrl/Cmd + Shift + Enter`: create a new node linked from the selected node
- `Ctrl/Cmd + Arrow` (`Up`/`Down`/`Left`/`Right`): follow connected node in that direction, otherwise nearest
- `Ctrl/Cmd + Z`: undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z`: redo
- `Ctrl/Cmd + S`: save graph file
- `Ctrl/Cmd + Enter`: toggle selected node/frame editor
- `Ctrl/Cmd + Click`: add a node to current node selection
- `Escape`: exit node edit mode, cancel edge draft mode, or clear selection
- `Escape`: also exits frame draw mode and frame edit mode

## Tech Stack

- HTML
- CSS
- JavaScript (ES modules)
- SVG (edge rendering + edge overlay controls)
- `localStorage` (persistence)

No frameworks or backend services are used.

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

## Version 1 Scope

Version 1 includes the core graph editor loop:

- node create/edit/move/delete
- edge create/reconnect/delete
- pan/zoom/reset view
- selection and inline controls
- undo/redo
- local persistence
- JSON file open/save

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
4. **Verify persistence impact**: if graph shape/settings/storage keys change, document migration/compatibility notes.
5. **Run a lightweight docs audit before merge**: confirm every new toolbar control, shortcut, setting, and workflow is represented in README and requirements.

Recommended PR checklist item:

- [ ] Requirements updated (if behavior changed)
- [ ] README updated (if user-visible behavior changed)
- [ ] Any new shortcut/settings/file-format behavior documented

## License

Released under the [MIT License](https://opensource.org/license/MIT).
