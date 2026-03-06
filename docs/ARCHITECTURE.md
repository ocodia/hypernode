# Hypernode – Architecture

## Architecture Goals

The system architecture should prioritize:

- simplicity
- modular code
- offline capability
- maintainability
- browser-native technologies

---

## Technology Stack

The application should use:

- HTML
- CSS
- JavaScript ES Modules
- SVG for edge rendering
- localStorage for persistence

No backend services are used.

---

## Rendering Model

The application uses a hybrid rendering model:

Nodes: HTML DOM elements  
Edges: SVG paths

Both layers share the same coordinate system.

---

## Project Structure

Recommended directory layout:

/css
/js
/docs

Example structure:

js/
  main.js
  state/
  render/
  interaction/
  persistence/
  utils/

---

## Core Modules

### State Store

Responsible for storing application state including:

- nodes
- edges
- selection
- viewport
- history

---

### Rendering

Responsible for rendering:

- nodes
- edges
- sidebar
- viewport transform

---

### Interaction

Responsible for user interaction including:

- canvas pan
- zoom
- node dragging
- node selection
- edge creation

---

### Persistence

Handles:

- saving graphs
- loading graphs
- importing JSON
- exporting JSON

---

### History

Tracks undo and redo operations.

---

## Data Model

### Node

{
  "id": "node_id",
  "title": "Node title",
  "description": "",
  "x": 0,
  "y": 0
}

### Edge

{
  "id": "edge_id",
  "from": "node_id",
  "to": "node_id"
}

---

## State Management

The application maintains a single central state object.

Rendering updates occur after state changes.

---

## Storage Strategy

Version 1 uses browser localStorage.

Future versions may migrate to IndexedDB if needed.

---

## Import and Export

Graphs are serialized as JSON.

Import replaces the current graph after validation.

---

## Design Constraints

Do not introduce frameworks unless necessary.

Prefer simple readable JavaScript modules.

Avoid unnecessary abstraction layers.

Keep files focused and small.
