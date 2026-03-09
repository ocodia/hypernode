# Changelog

This changelog is grouped by date because the project does not currently publish tagged releases.

The format loosely follows Keep a Changelog. Entries summarize shipped user-visible work rather than mirroring commit subjects.

## Unreleased

### Added

- Canvas drag-and-drop for creating image nodes from local files.
- Focus-mode image drop zone for replacing the current image without leaving zen mode.

### Changed

- Focus-mode deletion now requires `Ctrl/Cmd + Delete` confirmation instead of plain `Delete`.

## 2026-03-09

### Added

- Frame creation, editing, movement, resizing, and deletion workflows.
- Frame anchor support for edge creation and edge reconnect flows.
- Selection overlay controls for nodes and frames, including resize handles and inline edit/delete actions.

### Changed

- Frame resizing now previews node membership changes before commit.
- Embedded-node membership handling was refined during drag and resize workflows.
- Project documentation and repository hygiene files were expanded.

## 2026-03-08

### Added

- Image nodes created from local image files.
- Multi-select workflows with additive selection and marquee selection.
- Keyboard shortcuts for linked-node creation and directional graph navigation.
- Selected-node mini toolbar actions for edit and delete.
- Expanded node color palette behavior, including curated swatches and default-color handling.

### Changed

- Node selection behavior was refined for faster group editing.
- Documentation was updated to better match current behavior.

## 2026-03-07

### Added

- Node corner resizing with undo/redo coverage.
- Settings panel controls for graph name, background style, and anchor behavior.
- Arrowhead visibility and size controls for directed edges.

### Changed

- Node card layout was refined for fixed-size and content-aware rendering.
