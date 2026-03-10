# hypernode - Data Model

## Purpose

This document defines the canonical hypernode payload persisted to browser storage and written to hypernode JSON files.

The same top-level shape is used for:

- autosave in `localStorage`
- import validation
- export serialization

Hypernode appearance is part of the hypernode payload. UI theme and radius selections are stored in graph settings so each document can carry its own presentation.

If the app also keeps a local color-mode preference outside the graph payload, that preference is secondary and must not override an explicit hypernode appearance preset.

## Canonical Hypernode Payload

```json
{
  "name": "Untitled hypernode",
  "settings": {
    "uiThemePreset": "blueprint",
    "uiRadiusPreset": "rounded",
    "toolbarPosition": "top-left",
    "toolbarOrientation": "horizontal",
    "toastPosition": "bottom-right",
    "metaPosition": "bottom-left",
    "backgroundStyle": "dots",
    "anchorsMode": "auto",
    "arrowheads": "shown",
    "arrowheadSizeStep": 0,
    "showShortcutsUi": true,
    "nodeColorDefault": null
  },
  "nodes": [],
  "frames": [],
  "edges": []
}
```

Validation requires:

- `name` must be a string
- `settings` must be an object
- `nodes` must be an array
- `edges` must be an array
- `frames` may be omitted, but when present must be an array

Invalid payloads are rejected before import or restore is applied.

## Settings

```json
{
  "uiThemePreset": "blueprint | fjord | slate | paper | ember | soft-black",
  "uiRadiusPreset": "sharp | soft | rounded",
  "toolbarPosition": "top-left | top-right | bottom-left | bottom-right",
  "toolbarOrientation": "horizontal | vertical",
  "toastPosition": "top-left | top-right | bottom-left | bottom-right",
  "metaPosition": "top-left | top-right | bottom-left | bottom-right",
  "backgroundStyle": "dots | graph-paper",
  "anchorsMode": "auto | exact",
  "arrowheads": "shown | hidden",
  "arrowheadSizeStep": 0,
  "showShortcutsUi": "true | false",
  "nodeColorDefault": "sage | sky | amber | rose | slate | teal | violet | peach | mint | indigo | null"
}
```

Rules:

- `uiThemePreset` must be `blueprint`, `fjord`, `slate`, `paper`, `ember`, or `soft-black`
- `uiRadiusPreset` must be `sharp`, `soft`, or `rounded`
- `toolbarPosition` must be `top-left`, `top-right`, `bottom-left`, or `bottom-right`
- `toolbarOrientation` must be `horizontal` or `vertical`
- `toastPosition` must be `top-left`, `top-right`, `bottom-left`, or `bottom-right`
- `metaPosition` must be `top-left`, `top-right`, `bottom-left`, or `bottom-right`
- `backgroundStyle` must be `dots` or `graph-paper`
- `anchorsMode` must be `auto` or `exact`
- `arrowheads` must be `shown` or `hidden`
- `arrowheadSizeStep` is sanitized to an integer in the inclusive range `0..9`
- `showShortcutsUi` must be a boolean and defaults to `true` when missing or invalid
- `nodeColorDefault` may be `null` or one of the curated palette keys

Defaults:

- `uiThemePreset` defaults to `blueprint` when missing or invalid
- `uiRadiusPreset` defaults to `rounded` when missing or invalid
- `toolbarPosition` defaults to `top-left` when missing or invalid
- `toolbarOrientation` defaults to `horizontal` when missing or invalid
- `toastPosition` defaults to `bottom-right` when missing or invalid
- `metaPosition` defaults to `bottom-left` when missing or invalid
- legacy `uiRadiusPreset: "square"` is migrated to `soft`

Fallback behavior:

- invalid or missing settings values are sanitized back to hypernode defaults when loaded into app state
- payload validation rejects invalid setting enum values and invalid color keys before import/restore succeeds
- legacy toolbar positions are migrated to the nearest supported corner (`top-center -> top-left`, `bottom-center -> bottom-right`, `bottom-left -> bottom-left`, `left-column -> top-left`, `right-column -> top-right`)
- legacy `uiThemePreset: "graphite"` is migrated to `blueprint`
- legacy `uiThemePreset: "mist"` is migrated to `slate`
- older hypernode files that predate these fields fall back to `blueprint` and `rounded`

## Nodes

### Text Node

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
  "height": 80
}
```

### Image Node

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
  "imageData": "data:image/png;base64,...",
  "imageAspectRatio": 1.777
}
```

Rules:

- `id` must be a non-empty string
- `title` is stored as a string and sanitized to the default title when empty after trimming
- `description` is stored as a string; UI rendering interprets a limited markdown subset while persistence preserves the raw source text
- `kind` may be `text` or `image`; invalid or missing values resolve to `text`
- `x` and `y` are stored as numbers and sanitize to `0` when invalid
- `width` and `height` are optional, but when present must be positive finite numbers
- `frameId` is optional and must reference an existing frame when present
- `colorKey` is optional and may be any curated palette key or `null`

Image-node-specific rules:

- `imageData` is required for `kind: "image"`
- `imageData` must be a `data:image/...;base64,...` URL
- `imageAspectRatio` is required for `kind: "image"` and must be a positive finite number
- image nodes persist explicit `width` and `height`
- when an image payload is malformed during sanitization, the node falls back to a text node instead of crashing the app

Sizing behavior:

- text-node width and height remain optional unless the node has been resized
- image-node height is derived from width, aspect ratio, and fixed metadata height when an explicit valid height is not present

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
  "borderWidth": 1,
  "borderStyle": "solid",
  "colorKey": "mint"
}
```

Rules:

- `id` must be a non-empty string
- `title` is sanitized to the default title when empty after trimming
- `description` is stored as a string; UI rendering interprets a limited markdown subset while persistence preserves the raw source text
- `width` and `height` must be positive finite numbers when present
- sanitized frame dimensions are clamped to minimum frame dimensions in app state
- `borderWidth` is sanitized to an integer in the inclusive range `1..8`
- `borderStyle` must be `solid`, `dashed`, or `dotted`
- `colorKey` is optional and uses the same curated palette keys as nodes

## Edges

```json
{
  "id": "edge_123",
  "from": "node_123",
  "to": "frame_123",
  "fromAnchor": "right",
  "toAnchor": "left"
}
```

Rules:

- `id` must be a string
- `from` and `to` must reference existing node or frame ids
- `from` and `to` may not be the same id
- stored anchors may be `top`, `right`, `bottom`, `left`, or `null`
- when `settings.anchorsMode` is `auto`, stored anchors are normalized to the latest resolved sides between the current edge endpoints
- payload validation rejects edges whose endpoints do not exist

Sanitization behavior:

- invalid anchors are converted to `null` in app state
- when auto-anchor mode is active, `null` or stale stored anchors are backfilled to the latest resolved sides during load/import and subsequent endpoint movement

## Cross-Object Validation

Payload validation rejects graphs when any of the following are true:

- `settings` contains invalid enum values or an out-of-range arrowhead size step
- `settings.uiThemePreset` is not a supported preset
- `settings.uiRadiusPreset` is not a supported preset
- `settings.toolbarPosition` is not a supported position
- `settings.showShortcutsUi` is present but not a boolean
- `settings.nodeColorDefault` is not `null` and not a valid palette key
- `frames` contains duplicate frame ids
- `nodes` contains duplicate node ids
- a node references a `frameId` that does not exist
- an image node is missing valid `imageData` or `imageAspectRatio`
- a frame contains invalid `borderWidth`, `borderStyle`, or `colorKey`
- an edge points to a node or frame id that does not exist
- an edge forms a self-loop at the payload level

## Persistence Boundaries

- Hypernode autosave is stored under the hypernode storage key as `{ name, settings, nodes, frames, edges }`
- Hypernode export writes the same shape as formatted JSON
- Hypernode import accepts only payloads that pass validation for the same shape
- Hypernode appearance presets are persisted with graph settings and are included in exported files
