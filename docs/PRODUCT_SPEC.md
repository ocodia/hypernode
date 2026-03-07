# Hypernode - Product Specification

## Overview

Hypernode is a lightweight browser-based node graph editor for local, offline use.

Users create nodes, connect them with directed edges, move items spatially, and persist their graph locally. The app prioritizes speed, simplicity, and clarity over large feature sets.

## Product Goals

- fast visual thinking workflow
- offline-capable by default
- simple interaction model
- lightweight modular architecture
- no user accounts or cloud dependency
- user-owned local data

## Target Users

- developers mapping system relationships
- designers modelling flows
- researchers building concept maps
- writers exploring idea structures
- analysts mapping connected entities

## Core Capabilities

### Node Workflow

- create nodes quickly from canvas or toolbar
- edit title/description inline on node cards
- drag nodes to organize layout
- resize selected nodes from corner handles
- delete selected nodes

### Edge Workflow

- create edges from node anchors
- preview draft edge while choosing target
- reconnect selected edge endpoints
- delete selected edges

### Canvas Navigation

- pan on empty canvas drag
- zoom around cursor with bounded levels
- reset view to default

### Data and Reliability

- automatic local persistence
- startup restore from valid saved graph
- import/export JSON with payload validation
- visible import/export status feedback

### Productivity

- undo/redo for core actions
- keyboard shortcuts for delete, undo, redo, and escape flows

## Product Principles

### Offline First

No network service required for core usage.

### Fast Start

Users should be able to create first node within seconds.

### Visual Thinking First

Canvas is the primary interface and interaction surface.

### Calm Interface

UI should remain focused and low-noise.

### Lightweight Implementation

Keep the codebase small, modular, and browser-native.

## Non Goals (Version 1)

- multi-user collaboration
- cloud sync
- authentication
- plugin ecosystem
- enterprise workflow features

## Success Criteria

- first-node creation is immediate
- node and edge interactions are stable and predictable
- data persists between sessions
- import failures do not destroy current graph
- app remains simple, responsive, and offline-capable
