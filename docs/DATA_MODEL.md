# hypernode - Data Model

## Purpose

This document defines the canonical hypernode payload used for:

- autosave in `localStorage`
- file open/save validation
- import/export serialization

The persisted graph shape is:

```json
{
  "name": "Untitled",
  "settings": {
    "uiThemePreset": "tidepool",
    "enabledThemePresets": [
      "blueprint",
      "fjord",
      "slate",
      "paper",
      "ember",
      "chalkboard",
      "citrine",
      "canopy",
      "tidepool",
      "dusk"
    ],
    "uiRadiusPreset": "soft",
    "toolbarPosition": "top-left",
    "toolbarOrientation": "horizontal",
    "toastPosition": "bottom-right",
    "metaPosition": "bottom-left",
    "backgroundStyle": "dots",
    "anchorsMode": "exact",
    "arrowheads": "shown",
    "arrowheadSizeStep": 0,
    "nodeColorDefault": null
  },
  "nodes": [],
  "frames": [],
  "edges": []
}
```

## Settings

Current valid values:

```json
{
  "uiThemePreset": "blueprint | fjord | slate | paper | ember | chalkboard | citrine | canopy | tidepool | dusk",
  "enabledThemePresets": "[blueprint | fjord | slate | paper | ember | chalkboard | citrine | canopy | tidepool | dusk, ...]",
  "uiRadiusPreset": "sharp | soft | rounded",
  "toolbarPosition": "top-left | top-right | bottom-left | bottom-right",
  "toolbarOrientation": "horizontal | vertical",
  "toastPosition": "top-left | top-right | bottom-left | bottom-right",
  "metaPosition": "top-left | top-right | bottom-left | bottom-right",
  "backgroundStyle": "blank | dots | graph-paper",
  "anchorsMode": "auto | exact",
  "arrowheads": "shown | hidden",
  "arrowheadSizeStep": "0..9",
  "nodeColorDefault": "sage | sky | amber | rose | slate | teal | violet | peach | mint | indigo | null"
}
```

Defaults:

- `uiThemePreset`: `tidepool`
- `enabledThemePresets`: all installed theme preset ids, in registry order
- `uiRadiusPreset`: `soft`
- `toolbarPosition`: `top-left`
- `toolbarOrientation`: `horizontal`
- `toastPosition`: `bottom-right`
- `metaPosition`: `bottom-left`
- `backgroundStyle`: `dots`
- `anchorsMode`: `exact`
- `arrowheads`: `shown`
- `arrowheadSizeStep`: `0`
- `nodeColorDefault`: `null`

Validation rules:

- invalid enum values are rejected during payload validation
- invalid or missing settings sanitize back to the defaults above when loaded into app state
- `enabledThemePresets` deduplicates invalid entries and falls back to the full installed registry if empty
- if `uiThemePreset` is not included in `enabledThemePresets`, app state sanitization rehomes the active theme to the first enabled preset
- no legacy aliases are supported in the current contract

## Nodes

Text nodes:

```json
{
  "id": "node_123",
  "title": "Untitled Node",
  "description": "",
  "kind": "text",
  "x": 0,
  "y": 0,
  "frameId": "frame_123",
  "colorKey": "sage",
  "width": 210,
  "height": 80,
  "borderWidth": 1,
  "borderStyle": "solid"
}
```

Image nodes:

```json
{
  "id": "node_456",
  "title": "Reference Screenshot",
  "description": "",
  "kind": "image",
  "x": 0,
  "y": 0,
  "frameId": "frame_123",
  "colorKey": "sky",
  "width": 210,
  "height": 182,
  "borderWidth": 1,
  "borderStyle": "solid",
  "imageData": "data:image/png;base64,...",
  "imageAspectRatio": 1.777
}
```

Rules:

- `id` must be a non-empty string
- `title` and `description` are stored as plain strings
- `kind` is `text` or `image`
- `x` and `y` are numbers
- `width` and `height` are optional positive finite numbers
- `frameId`, when present, must reference an existing frame
- `colorKey` is optional and must be one of the curated palette keys
- `borderWidth` sanitizes to `1..8`
- `borderStyle` must be `solid`, `dashed`, or `dotted`
- image nodes require valid `imageData` and `imageAspectRatio`

## Frames

```json
{
  "id": "frame_123",
  "title": "Untitled Frame",
  "description": "",
  "x": 0,
  "y": 0,
  "width": 320,
  "height": 200,
  "borderWidth": 3,
  "borderStyle": "solid",
  "colorKey": "mint"
}
```

Rules:

- `id` must be a non-empty string
- `width` and `height` must be positive finite numbers
- dimensions are clamped to minimum frame sizes in app state
- `borderWidth` sanitizes to `1..8`
- `borderStyle` must be `solid`, `dashed`, or `dotted`
- `colorKey` is optional and uses the same curated palette as nodes

## Edges

```json
{
  "id": "edge_123",
  "from": "node_123",
  "to": "frame_123",
  "fromAnchor": "right",
  "toAnchor": "left",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "edgeType": "curved",
  "colorKey": null
}
```

Rules:

- `from` and `to` must reference existing node or frame ids
- self-loops are invalid at payload level
- anchors may be `top`, `right`, `bottom`, `left`, or `null`
- when `anchorsMode` is `auto`, the store rewrites stale anchors to the currently resolved sides
- `strokeWidth`: integer 1–8, defaults to `2`
- `strokeStyle`: `"solid" | "dashed" | "dotted"`, defaults to `"solid"`
- `edgeType`: `"curved" | "straight" | "orthogonal"`, defaults to `"curved"`
- `colorKey`: one of the named palette keys or `null` (inherits theme default), omitted from serialised payload when `null`

## Persistence Boundaries

- Autosave stores `{ name, settings, nodes, frames, edges }`
- File save/export writes the same shape as JSON
- Import/open accepts only payloads that pass validation for that same shape
- Appearance settings are document-level state and round-trip with the graph
