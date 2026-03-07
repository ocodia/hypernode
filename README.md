# hypernode

hypernode is a lightweight browser-based node graph editor for fast visual thinking.

It runs fully client-side with no backend and no account system. Graph data autosaves in `localStorage`, and can be opened/saved as JSON files.

## Current Features

- Create nodes by double-clicking the canvas or using the toolbar button, opening immediately in edit mode with title text selected.
- Edit node title/description inline on each node.
- Delete nodes from the inline editor or with `Delete`/`Backspace`.
- Create edges from node anchor points (top/right/bottom/left).
- Reconnect existing edge endpoints by dragging selected edge endpoints.
- Delete selected edges via inline edge overlay control or keyboard delete.
- Pan canvas with pointer drag on empty space.
- Zoom with mouse wheel/trackpad (bounded: `0.35` to `2.5`).
- Reset view to default pan/zoom.
- Undo/redo via toolbar and keyboard shortcuts.
- Auto-save graph to browser storage.
- Open/save graph JSON files with validation and status toast feedback.
- Installable PWA with offline app-shell caching.
- Interaction-state cursor feedback for drag/connect workflows.
- About dialog with usage instructions and keyboard shortcuts.
- Dark mode toggle with persisted theme preference.

## Keyboard Shortcuts

- `Delete` / `Backspace`: delete selected node/edge
- `Ctrl/Cmd + Z`: undo
- `Ctrl/Cmd + Y` or `Ctrl/Cmd + Shift + Z`: redo
- `Ctrl/Cmd + S`: save graph file
- `Ctrl/Cmd + Enter`: save and close active node editor
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
