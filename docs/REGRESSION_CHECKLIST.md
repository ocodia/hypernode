# Interaction Regression Checklist

Last updated: 2026-03-07

Use this checklist before shipping interaction changes.

## Preconditions

- App opens with no console errors.
- Graph contains at least 3 nodes and 2 edges.
- Reset view once before running checks.

## Core Interaction Checks

### Node drag under zoom

- [ ] Zoom to `0.35`, drag a node in multiple directions, confirm pointer and node stay aligned.
- [ ] Zoom to `1.0`, repeat node drag check.
- [ ] Zoom to `2.5`, repeat node drag check.
- [ ] Undo/redo after each zoom-level drag behaves correctly.

### Panning after selection

- [ ] Select a node, then pan from empty canvas area.
- [ ] Select an edge, then pan from empty canvas area.
- [ ] Confirm selection clears when pan begins on empty canvas.

### Edge create/reconnect under rapid input

- [ ] Start edge create from an anchor, quickly move pointer across multiple nodes, release on valid target.
- [ ] Start edge create, release on invalid target (same node), ensure draft is canceled cleanly.
- [ ] Select edge endpoint, reconnect to a different node under quick pointer movement.
- [ ] During reconnect/create, press `Escape` and confirm draft state fully clears.
- [ ] Verify no stuck `is-connecting` or `is-dragging` UI class states after cancel/release.

### Anchors modes

- [ ] Set `Anchors` to `Auto-anchor` and verify create/reconnect/edge render use nearest anchor between nodes.
- [ ] Set `Anchors` to `Exact anchor` and verify created/reconnected edge endpoints stay on committed anchors when nodes move.
- [ ] Switch between `Auto-anchor` and `Exact anchor` and confirm edge paths update immediately with no stuck draft/selection state.

## UI/Polish Checks

- [ ] Toggle keyboard hints on/off.
- [ ] Open/close About dialog.
- [ ] Toggle dark mode and reload page to verify theme persistence.
