# Frontend implementation plan

**Updated:** 2026-11-05. T05 implemented; T06 foundation implemented, login UI/live integration pending.

## Confirmed direction

Confirmed by the user after discussion with the PM, 2026-11-05:

- Users must sign in before accessing SURIMI. There is no public case-selection/content page for now; authentication entry and callback routes remain accessible as needed.
- First remove frontend gRPC integration and make the existing UI navigable with clearly labelled fixed demonstration results. Do not create mock runs, even in memory. Consolidate mock datasets and hardcoded informational content under `apps/frontend/mock-data/`; ordinary UI labels stay in components. All three cases show one shared example report.
- Second integrate the existing backend authentication, using a shared REST request layer, services, and TanStack Query for server state.
- The current “landing page” becomes the signed-in case-selection page. Explore two design approaches; their details are still to be discussed.
- Further work concerns user-input and dashboard design changes and backend integration. Existing PM notes remain references until each ticket is clarified.

## Work order

Ticket IDs are stable local references, not execution order or PM tracker IDs.

| Order | Ticket | Current scope/status |
| --- | --- | --- |
| 1 — confirmed | [T05 — Remove frontend gRPC](T05-remove-frontend-grpc.md) | Implemented; build/route-render checks passed; browser review pending |
| 2 — confirmed | [T06 — Authentication and REST foundation](T06-authentication-and-rest-foundation.md) | Request/services/query foundation implemented; login experience and live integration pending |
| Later — order pending | [T02 — Signed-in case selection](T02-landing-page-map.md) | Explore two design approaches; discuss concepts first |
| Later — order pending | [T03 — Harvest Control inputs](T03-harvest-control-page.md) | Latest input requirements/design still needed |
| Later — order pending | [T04 — Anchovy Bay introduction](T04-anchovy-bay-intro-screen.md) | Confirm asset placement and screen changes |
| Later — order pending | [T01 — Output dashboard charts](T01-output-dashboard-charts.md) | Two charts identified; clarify scope and data |

No priority between the four later tickets has been agreed. Additional input/dashboard changes should become separate tickets once described, rather than being assumed part of these four.

## How we refine each ticket

Discuss at most three defining questions at a time. Record confirmed behaviour, frontend actions, backend/design dependencies, and completion criteria in that ticket. Do not treat proposed interactions or old screenshots as agreed requirements.

[Detailed REST migration audit](../plans/2026-11-04-frontend-rest-migration-audit.md) contains the removal inventory, source findings, and proposed architecture. Its runtime limitations describe that audit session, not the current deployment status.

## Development review versus rollout

The temporary dummy stage is for development review. It is not permission to publish publicly accessible SURIMI pages. The integrated app must require authentication before case selection, configuration, runs, or outputs. **Route exception confirmed by the user, 2026-11-05:** `/test` remains public for now; `/netcdf-lab` requires login once authentication is integrated.
