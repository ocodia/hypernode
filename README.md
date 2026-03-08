# hypernode

hypernode is a lightweight browser-based node graph editor for fast visual thinking.

It runs fully client-side with no backend and no account system. Graph data autosaves in `localStorage`, and can be opened/saved as JSON files.

## Current Features

- Create nodes by double-clicking the canvas or using the toolbar button, opening immediately in edit mode with title text selected.
- Edit node title/description inline from the selected-node mini toolbar.
- Color selected node backgrounds from a toolbar palette (5 curated colors + reset) with legible text and complementary selected highlights in light/dark themes.
- Delete selected nodes with `Delete`/`Backspace`.
- Create edges from node anchor points (top/right/bottom/left).
- Resize selected nodes from corner handles (top-left/top-right/bottom-right/bottom-left).
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
- Settings menu for:
  - graph background style (`dots` or `graph paper`)
  - anchors mode (`auto-anchor` or `exact anchor`)
  - arrowheads visibility (`show` or `hide`)
  - arrowhead size (`10` levels, from `100%` to `280%` in `20%` increments)
  - graph name
- Graph name shown in toolbar title and browser tab title.
- First-time Save suggests a filename based on the graph name.
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
- `Ctrl/Cmd + Enter`: toggle selected node editor
- `Ctrl/Cmd + Click`: add a node to current node selection
- `Escape`: exit node edit mode, cancel edge draft mode, or clear selection

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
  interaction/
  persistence/
  render/
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

## License

License to be determined.
