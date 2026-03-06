# hypernode

hypernode is a lightweight browser-based node graph editor designed for fast visual thinking.

It allows users to create nodes, connect them with edges, and organize ideas spatially on an interactive canvas. The application runs entirely in the browser and stores data locally, requiring no backend services or user accounts.

hypernode is intentionally simple. The goal is a fast, focused tool for mapping relationships, exploring ideas, and modelling systems without the complexity of large diagramming software.

---

# Key Features

### Node-Based Graph Editing
Create nodes and connect them with edges to represent relationships between ideas, systems, or concepts.

### Interactive Canvas
Pan and zoom across an infinite workspace designed for spatial thinking.

### Drag-and-Drop Layout
Move nodes freely to organize and restructure your graph.

### Local Data Persistence
Graphs automatically save to browser storage. No internet connection is required.

### Import and Export
Graphs can be exported to JSON files and later restored through import.

### Undo and Redo
Common editing actions can be undone and redone.

---

# Design Philosophy

hypernode follows a few guiding principles:

**Offline-first**  
The application works entirely in the browser without requiring any network services.

**Simple interaction**  
Users should be able to begin creating nodes within seconds.

**Visual thinking first**  
The canvas is the primary interface.

**Calm interface**  
The UI avoids unnecessary complexity and visual noise.

**Lightweight architecture**  
The codebase favors simple modular JavaScript and browser-native technologies.

---

# Example Use Cases

hypernode can be used for many kinds of visual mapping:

- software architecture diagrams
- knowledge graphs
- concept maps
- workflow planning
- research notes
- brainstorming and idea exploration

---

# Technology

hypernode is built using browser-native technologies:

- HTML
- CSS
- JavaScript (ES Modules)
- SVG for edge rendering
- localStorage for persistence

No frameworks or backend services are required.

---
/docs
/css
/js


### Docs

Project documentation and specifications.


docs/
PRODUCT_SPEC.md
REQUIREMENTS.md
ARCHITECTURE.md
DESIGN_BRIEF.md
USER_STORIES.md
TASKS.md


### CSS

Stylesheets for layout and UI.


css/
tokens.css
layout.css
components.css
canvas.css


### JavaScript

Application logic.


js/
main.js

state/
render/
interaction/
persistence/
utils/


Modules are organized by responsibility to keep the codebase modular and easy to maintain.

---

# Running the Project

The application runs entirely in the browser.

You can start the project using a simple static server.

Example using Node:


npx serve .


Or Python:


python -m http.server


Then open:


http://localhost:3000


---

# Version 1 Scope

Version 1 includes:

- node creation
- node dragging
- node editing
- edge creation
- edge deletion
- canvas pan and zoom
- graph persistence
- import and export
- undo and redo

The goal of version 1 is to provide a reliable core graph editor without unnecessary complexity.

---

# Out of Scope

Version 1 intentionally excludes:

- collaboration
- cloud sync
- authentication
- plugins
- advanced diagramming features

These may be explored in future versions.

---

# Future Possibilities

Potential future improvements include:

- graph search
- grouping and clustering
- minimap navigation
- touch interaction improvements
- IndexedDB storage for large graphs
- multiple graph documents

---

# License

License to be determined.