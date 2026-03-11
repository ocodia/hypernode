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
- [ ] Verify single-node mini toolbar exposes `Edit`, `Focus`, color, border width, border style, and `Delete`.
- [ ] At zoom levels `0.35`, `1.0`, and `2.5`, verify the single-node mini toolbar stays comfortably clickable and visually attached to the node.
- [ ] At zoom levels `0.35`, `1.0`, and `2.5`, open each node toolbar popover and verify trigger alignment, placement, and click targets remain correct.
- [ ] Multi-select at least 2 nodes and verify only one shared toolbar appears above the selection bounds.
- [ ] At zoom levels `0.35`, `1.0`, and `2.5`, verify the shared multi-node toolbar stays centered over the selection and remains clickable.
- [ ] Use the shared node toolbar to change color, border width, and border style for all selected nodes.
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
- [ ] Select a frame and verify frame mini toolbar appears with color, border width, border style, `Edit`, and `Delete`.
- [ ] Verify frame mini toolbar appears above frame bounds (not inside frame body).
- [ ] At zoom levels `0.35`, `1.0`, and `2.5`, verify the frame mini toolbar remains clickable and visually attached to the frame.
- [ ] Resize frame from each corner and confirm frame bounds update with zoom-aware pointer alignment.
- [ ] While resizing a frame smaller, verify previously embedded out-of-bounds nodes get remove-preview highlight.
- [ ] While resizing a frame larger, verify newly covered nodes get add-preview highlight.
- [ ] On frame resize release, verify out-of-bounds member nodes are automatically ungrouped.
- [ ] On frame resize release, verify newly covered nodes are automatically grouped into the frame.
- [ ] In frame edit mode, verify the `Edit` button changes to a positive confirm tick.
- [ ] In frame edit mode, use toolbar border width and border style controls and verify visual updates apply to the frame.
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

### Edge multi-select

- [ ] Click an edge to select it; verify single-edge toolbar appears at edge midpoint.
- [ ] Ctrl-click (Cmd-click on macOS) a second edge; verify both edges highlight and a multi-edge toolbar appears at the average midpoint.
- [ ] Verify multi-edge toolbar displays the selection count (e.g. "2 selected").
- [ ] Use multi-edge toolbar to change colour, line thickness, line style, and edge type for all selected edges.
- [ ] Click the Delete button on the multi-edge toolbar and verify all selected edges are removed.
- [ ] Ctrl-click a selected edge to deselect it; verify selection updates correctly (reverts to single-edge toolbar when one remains).
- [ ] Press Delete/Backspace with multi-edge selection active; verify all selected edges are deleted.
- [ ] Click on empty canvas to clear multi-edge selection.

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
- [ ] Open the shortcuts dialog and verify search matches both shortcut keys and action text.
- [ ] Search for a nonsense term and verify the empty state appears.
- [ ] Switch `Toolbar position` through all four corners and verify the toolbar stays clickable and aligned after each change.
- [ ] Toggle `Toolbar orientation` between horizontal and vertical and verify button layout updates without breaking click targets.
- [ ] Reload page and verify `Toolbar position` persists.
- [ ] Save, reopen, and create a new graph; confirm toolbar position round-trips for save/open and resets to `Top left` for a new graph.
- [ ] Trigger file/theme/image toasts and verify they appear in the bottom-right with accent-highlighted borders and disappear quickly.
- [ ] Open/close About dialog.
- [ ] Change the UI theme preset and reload page to verify theme persistence.
- [ ] Toggle the enabled state of several themes, press `T`, and verify disabled themes are skipped in the correct order.
- [ ] Disable the active theme and verify the app immediately switches to the first remaining enabled theme.
- [ ] Zoom until a single-node toolbar would collide with toolbar/meta/toast chrome and verify top/bottom auto-placement still avoids obstructions.

### Context menu

- [ ] Right-click on blank canvas and verify a context menu appears at the cursor with Add Node, Add Image, and Add Frame items.
- [ ] Click Add Node in the context menu and verify a node is created at the right-click location.
- [ ] Click Add Image in the context menu, pick an image, and verify an image node is created at the right-click location.
- [ ] Click Add Frame in the context menu and verify frame draw mode is activated.
- [ ] Press Escape while the context menu is open and verify it dismisses without triggering other Escape actions.
- [ ] Click outside the context menu and verify it dismisses.
- [ ] Right-click on a node, edge, or frame and verify the native browser context menu is suppressed.
- [ ] Verify context menu respects the current theme preset appearance.
- [ ] Verify context menu border radius adapts to the current radius preset.
