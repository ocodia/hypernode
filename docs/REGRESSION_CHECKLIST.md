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

### Node corner resize

- [ ] Select a node and verify all four corner handles are visible.
- [ ] Select a node and verify mini toolbar appears above node without intersecting node border/anchors.
- [ ] Verify mini toolbar exposes `Edit` and `Delete` actions.
- [ ] Deselect node and verify handles are hidden.
- [ ] Deselect node and verify mini toolbar is hidden.
- [ ] Enter node edit mode and verify handles are hidden.
- [ ] Drag each corner handle and verify resize occurs from that corner.
- [ ] Verify minimum node size clamp at `160x96`.
- [ ] Verify node resize remains pointer-aligned at zoom levels `0.35`, `1.0`, and `2.5`.
- [ ] Verify one undo step reverts a full resize gesture; redo reapplies it.
- [ ] Verify resized node dimensions persist across reload and open/save/new flows.

### Frame draw, embed, and resize

- [ ] Toggle frame draw mode, drag to create a frame at zoom levels `0.35`, `1.0`, and `2.5`.
- [ ] Press `Escape` during frame draw mode and confirm draft cancels cleanly.
- [ ] Select a frame and verify frame mini toolbar appears with `Edit` and `Delete`.
- [ ] Verify frame mini toolbar appears above frame bounds (not inside frame body).
- [ ] Resize frame from each corner and confirm frame bounds update with zoom-aware pointer alignment.
- [ ] In frame edit mode, set border width and border style and verify immediate visual update.
- [ ] Drag nodes into a frame and verify they become embedded on release.
- [ ] While dragging into a frame, verify add-preview highlight appears before release.
- [ ] Drag embedded nodes out of frame overlap and verify they ungroup.
- [ ] While dragging out of a frame, verify remove-preview highlight appears before release.
- [ ] Move a frame with embedded nodes and verify member nodes move with it.
- [ ] Delete a frame and verify contained nodes remain in place and become ungrouped.

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

### Arrowheads settings

- [ ] Set `Arrowheads` to `Show` and verify committed edges render destination arrowheads; set `Hide` and verify they disappear.
- [ ] Verify draft edges never render arrowheads during create/reconnect preview.
- [ ] Verify arrowheads rotate with the curved edge approach angle at destination anchors (not fixed to axis directions).
- [ ] Verify arrowhead tips are slightly tucked under node boundaries at destination anchors.
- [ ] Move `Arrowhead size` from level `1` to level `10` and confirm each step increases size by about `20%` (range `100%` to `280%`).
- [ ] Reload page and verify `Arrowheads` and `Arrowhead size` settings persist.
- [ ] Verify `Arrowheads` and `Arrowhead size` persist across open/save/new graph flows.
- [ ] Verify undo/redo restores `Arrowheads` visibility and `Arrowhead size` changes.

## UI/Polish Checks

- [ ] Toggle keyboard hints on/off.
- [ ] Open/close About dialog.
- [ ] Toggle dark mode and reload page to verify theme persistence.
