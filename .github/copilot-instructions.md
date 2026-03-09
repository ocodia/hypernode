# Hypernode – Copilot Instructions

## Project Context
Hypernode is a lightweight browser-based node graph editor. It runs fully client-side
with no backend, no build step, and no frameworks. See `docs/` for full specs.

## Source of Truth (always consult before making changes)
- `docs/PRODUCT_SPEC.md` – what the product is and isn't
- `docs/REQUIREMENTS.md` – FR/NFR behavioral contracts
- `docs/ARCHITECTURE.md` – module boundaries and data model
- `docs/DESIGN_BRIEF.md` – visual and interaction style

## Code Conventions
- Vanilla JavaScript ES modules only — no frameworks, no TypeScript, no build step
- Single CSS file (`css/styles.css`) with BEM-like class naming
- All state flows through `js/state/store.js`; never mutate DOM state directly
- Edge rendering uses SVG; node rendering uses HTML
- Keep individual module files focused; split when they exceed ~400 lines

## When Implementing Features
1. First check `docs/REQUIREMENTS.md` for existing FR/NFR coverage
2. Update `docs/REQUIREMENTS.md` with new/changed FRs before writing code
3. Map code changes to requirement IDs in commit messages (e.g., "Implements FR-31")
4. Update `README.md` feature list and keyboard shortcuts if user-visible
5. Update `docs/REGRESSION_CHECKLIST.md` if interaction behavior changes
6. Bump `CACHE_NAME` version in `sw.js` when any cached file changes

## Do Not
- Add npm dependencies or a build pipeline
- Create new top-level HTML pages (SPA only)
- Store user data anywhere except localStorage and JSON files
- Introduce state outside of `store.js`
