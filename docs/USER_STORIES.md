# Hypernode – User Stories

## Purpose

This document defines the core user stories for Version 1 of Hypernode.

These stories are intended to help coding agents and developers implement the product in clear, testable slices of behaviour.

Each story includes acceptance criteria to reduce ambiguity.

---

## Epic 1 – Canvas Navigation

### US-1: Pan the canvas

As a user, I want to pan around the canvas so that I can navigate large graphs.

#### Acceptance Criteria

- The user can pan the canvas using a pointer interaction.
- Panning moves the visible viewport without changing node coordinates.
- Panning feels smooth and responsive.
- Existing nodes and edges remain visually aligned during pan.

---

### US-2: Zoom the canvas

As a user, I want to zoom in and out so that I can work comfortably on both small and large graphs.

#### Acceptance Criteria

- The user can zoom in and out using mouse wheel or trackpad gesture.
- Zoom affects the viewport, not stored node coordinates.
- Nodes and edges remain aligned during zoom.
- Zoom level is constrained to a sensible minimum and maximum.
- Zooming feels smooth and predictable.

---

### US-3: Reset the view

As a user, I want to reset the view so that I can quickly return to a usable canvas position.

#### Acceptance Criteria

- The user can trigger a reset view action.
- Reset view returns pan and zoom to default values.
- Resetting the view does not modify the graph data.

---

## Epic 2 – Node Creation and Editing

### US-4: Create a node

As a user, I want to create a node on the canvas so that I can start building a graph quickly.

#### Acceptance Criteria

- The user can create a node from the canvas.
- The node appears at or near the intended location.
- A new node has a unique id.
- A new node has a default title.
- A new node is visible immediately after creation.
- Node creation is added to undo history.

---

### US-5: Drag a node

As a user, I want to drag a node so that I can arrange my graph spatially.

#### Acceptance Criteria

- The user can drag a node using pointer input.
- The node moves smoothly during drag.
- The final node position is stored in graph state.
- Connected edges update while the node moves or immediately after movement.
- Node movement is undoable.
- Dragging a node does not unintentionally pan the canvas.

---

### US-6: Select a node

As a user, I want to select a node so that I can inspect or edit it.

#### Acceptance Criteria

- Clicking a node selects it.
- The selected node is visually distinct.
- Selecting a node updates the inspector panel.
- Clicking empty canvas clears selection.
- Only one selected node is required in v1.

---

### US-7: Edit node title

As a user, I want to change a node title so that the graph reflects my own labels.

#### Acceptance Criteria

- The user can edit the title of the selected node.
- Title changes are reflected in the node UI.
- Title changes are persisted.
- Title editing is undoable if practical, or at minimum is saved correctly.
- Empty titles are either prevented or replaced with a sensible fallback.

---

### US-8: Edit node description

As a user, I want to add notes to a node so that I can store more context.

#### Acceptance Criteria

- The user can edit the description of the selected node.
- Description changes are reflected in the UI where applicable.
- Description changes are persisted.
- The description field supports empty values.

---

### US-9: Delete a node

As a user, I want to delete a node so that I can remove unwanted items from the graph.

#### Acceptance Criteria

- The user can delete the selected node.
- Deleting a node removes it from the graph state.
- Any connected edges are also removed.
- The deletion updates the UI immediately.
- Node deletion is undoable.

---

## Epic 3 – Edge Creation and Management

### US-10: Create an edge between two nodes

As a user, I want to connect nodes so that I can represent relationships.

#### Acceptance Criteria

- The user can initiate edge creation from a source node.
- The user can complete edge creation on a target node.
- A valid edge is created only when both nodes exist.
- The edge appears immediately in the graph.
- Edge creation is undoable.
- The app prevents invalid self-contradictory states such as missing node references.

---

### US-11: View connected edges while moving nodes

As a user, I want edges to stay attached to nodes while I move them so that the graph remains understandable.

#### Acceptance Criteria

- Edge positions update when connected nodes move.
- Edge endpoints align with the visual node positions.
- Edge rendering remains performant for medium-sized graphs.

---

### US-12: Select an edge

As a user, I want to select an edge so that I can inspect or delete it.

#### Acceptance Criteria

- Clicking an edge selects it.
- The selected edge is visually distinct.
- Selecting an edge updates the inspector state or available actions.
- Clicking empty canvas clears edge selection.

---

### US-13: Delete an edge

As a user, I want to remove an edge so that I can correct or simplify my graph.

#### Acceptance Criteria

- The user can delete a selected edge.
- The edge is removed from graph state.
- The UI updates immediately.
- Edge deletion is undoable.

---

## Epic 4 – Persistence

### US-14: Automatically save my graph

As a user, I want my graph to save automatically so that I do not lose work.

#### Acceptance Criteria

- Graph changes are persisted to browser storage automatically.
- The user is not required to manually save after each change.
- Autosave does not require an internet connection.
- Temporary interaction state is not required to be persisted.

---

### US-15: Reload my graph on next open

As a user, I want my previous graph to appear when I reopen the app so that I can continue where I left off.

#### Acceptance Criteria

- On startup, the app attempts to load the saved graph.
- If valid saved data exists, the graph is restored.
- If saved data is invalid or absent, a safe empty graph is loaded instead.
- A broken saved state does not crash the app.

---

## Epic 5 – Import and Export

### US-16: Export my graph to a JSON file

As a user, I want to export my graph so that I can back it up or move it elsewhere.

#### Acceptance Criteria

- The user can trigger export from the UI.
- Export generates a JSON file.
- The exported file includes nodes and edges.
- The export works entirely client-side.
- The exported file is valid JSON.

---

### US-17: Import a previously exported graph

As a user, I want to import a graph file so that I can restore or open saved work.

#### Acceptance Criteria

- The user can select a JSON file from their device.
- The file is parsed client-side.
- The imported graph is validated before being applied.
- A valid import replaces the current graph.
- An invalid import does not overwrite the current graph.
- The user receives clear feedback if import fails.

---

## Epic 6 – Undo and Redo

### US-18: Undo my last action

As a user, I want to undo mistakes so that I can work confidently.

#### Acceptance Criteria

- The user can trigger undo from UI or keyboard shortcut.
- Undo reverses the last supported graph action.
- Supported actions include at least:
  - create node
  - delete node
  - move node
  - create edge
  - delete edge
- Undo updates the rendered graph immediately.

---

### US-19: Redo an undone action

As a user, I want to redo an action so that I can restore something I reversed accidentally.

#### Acceptance Criteria

- The user can trigger redo from UI or keyboard shortcut.
- Redo restores the previously undone supported action.
- Redo updates the rendered graph immediately.

---

## Epic 7 – Selection and Inspector

### US-20: See details for the selected item

As a user, I want the sidebar to reflect my current selection so that editing feels clear and structured.

#### Acceptance Criteria

- Selecting a node shows node details in the inspector.
- Selecting an edge shows edge-related actions or details.
- No selection shows a helpful empty state.
- The inspector updates immediately when selection changes.

---

### US-21: Clear selection

As a user, I want to clear selection so that I can return to a neutral editing state.

#### Acceptance Criteria

- Clicking empty canvas clears the current selection.
- The inspector returns to its no-selection state.
- No graph data is changed when selection is cleared.

---

## Epic 8 – Keyboard Support

### US-22: Use keyboard shortcuts for common actions

As a user, I want keyboard shortcuts so that I can work faster.

#### Acceptance Criteria

- Delete removes the selected node or edge where appropriate.
- Undo shortcut works on supported platforms.
- Redo shortcut works on supported platforms.
- Escape cancels current interaction modes where implemented.
- Keyboard shortcuts do not break text input editing.

---

## Epic 9 – Empty State and First Use

### US-23: Understand what to do when the app is empty

As a first-time user, I want the empty app to guide me lightly so that I can begin without confusion.

#### Acceptance Criteria

- The app shows a minimal helpful hint when no nodes exist.
- The hint does not obstruct normal use.
- The hint explains at least one way to create a node.

---

## Epic 10 – Reliability and Safety

### US-24: Avoid losing my current graph due to bad import data

As a user, I want imports to be safe so that invalid files do not destroy my current work.

#### Acceptance Criteria

- Invalid import data is rejected.
- The current graph remains unchanged after a failed import.
- The app provides visible feedback on failure.

---

### US-25: Recover safely from missing or corrupted saved data

As a user, I want the app to recover safely so that storage issues do not prevent usage.

#### Acceptance Criteria

- If saved data cannot be parsed, the app loads a fresh empty graph.
- The app remains usable.
- Failure to load saved data does not break rendering or interaction.

---

## Suggested Build Order

Recommended implementation sequence:

1. App shell and layout
2. State store
3. Canvas pan and zoom
4. Node creation
5. Node rendering
6. Node dragging
7. Node selection and inspector
8. Edge creation and rendering
9. Node and edge deletion
10. Persistence
11. Import and export
12. Undo and redo
13. Keyboard shortcuts
14. UI polish and empty states

---

## Definition of Done

Version 1 is complete when:

- core node graph interactions work end-to-end
- graph data persists locally
- import and export work safely
- undo and redo cover core actions
- the UI reflects the design brief
- the app remains lightweight, modular, and offline-capable
