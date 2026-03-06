# Hypernode – Requirements

## Functional Requirements

### Canvas

FR-1  
The system must provide an interactive canvas for graph editing.

FR-2  
Users must be able to pan the canvas.

FR-3  
Users must be able to zoom the canvas.

FR-4  
The canvas must support graphs containing at least 500 nodes.

---

### Node Creation

FR-5  
Users must be able to create nodes on the canvas.

FR-6  
New nodes appear at the clicked location.

FR-7  
Nodes contain:

- id
- title
- optional description
- x coordinate
- y coordinate

FR-8  
Nodes must be draggable.

---

### Node Editing

FR-9  
Users must be able to edit the node title.

FR-10  
Users must be able to edit the node description.

FR-11  
Node editing must not require leaving the canvas context.

---

### Edge Creation

FR-12  
Users must be able to create edges between nodes.

FR-13  
Edges must visually connect nodes.

FR-14  
Edges must update when nodes move.

FR-15  
Edges may be directional.

---

### Node Deletion

FR-16  
Users must be able to delete nodes.

FR-17  
Deleting a node removes connected edges.

---

### Edge Deletion

FR-18  
Users must be able to delete edges.

---

### Persistence

FR-19  
Graphs must persist automatically using local browser storage.

FR-20  
Saved graphs must reload when reopening the application.

---

### Import and Export

FR-21  
Users must be able to export the graph as a JSON file.

FR-22  
Users must be able to import graph JSON files.

FR-23  
Importing a graph replaces the current graph.

---

### Undo and Redo

FR-24  
Users must be able to undo actions.

FR-25  
Users must be able to redo actions.

Actions that must support undo:

- node creation
- node deletion
- node movement
- edge creation
- edge deletion

---

## Non Functional Requirements

### Performance

NFR-1  
The system must support graphs containing at least:

- 500 nodes
- 1000 edges

NFR-2  
Dragging nodes must update edges smoothly.

---

### Offline Operation

NFR-3  
The application must function without internet connectivity.

NFR-4  
No external APIs may be required.

---

### Browser Support

NFR-5  
The application must support modern browsers including:

- Chrome
- Edge
- Firefox
- Safari

---

### Data Format

NFR-6  
Graph data must be stored as JSON.

Example:

{
  "nodes": [],
  "edges": []
}

---

### Security

NFR-7  
All data processing must occur client-side.

---

### Accessibility

NFR-8  
Keyboard shortcuts should support common actions such as:

- undo
- redo
- delete
