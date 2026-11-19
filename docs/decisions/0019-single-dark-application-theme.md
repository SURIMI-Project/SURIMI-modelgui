# 0019 — Single dark application theme

**Status:** Accepted by the user, 2026-11-16.
**Scope:** Supersedes the light-only/reference-tree and separate alias-file portions of ADR 0018. React Aria, CSS Modules, cascade layers and the palette/scale separation remain unchanged.

## Decision

Keep one active `styles/` tree with `aria/` and `design-system/`. Keep exactly one file in `styles/themes/`: `theme.css`. Declare dark semantic values at the document root before paint so controls and portal content share one theme without additional CSS-module themes or a switcher.

Remove obsolete reference files, unused global utility rules and the redundant font entry. Preserve raw palettes/scales separately from semantic roles. Explicit semantic roles preserve intentional white logo/avatar and sea-card coverage surfaces. Retain only compatibility names still consumed by preserved prototype/chart code, in the single theme file.

## Reason and consequences

The user requested the latest dark design and a single theme file. Separate light defaults and marine overrides split ownership and required theme props for portal dropdowns. Root semantic values provide the same styling contract across pages and overlays. Component appearance props can still select layout/composition, but do not select alternate theme files.

Changes require a frontend rebuild. They do not introduce theme preference persistence, backend/API changes or new dependencies. Visual and interaction review remains necessary across legacy prototypes and current application screens.
