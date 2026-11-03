# PM ticket analysis

Planning only. No ticket implementation starts until the user understands the request and gives the go-ahead. Ticket IDs below are local references, not PM tracker IDs.

| Ticket | Status |
| --- | --- |
| [T01 — Add 2 new charts in Dashboard of Outputs](T01-output-dashboard-charts.md) | Understood; data and scope questions remain; not implemented |
| [T02 — Landing page map showing case-study areas](T02-landing-page-map.md) | Initial interpretation; PM clarification needed; not implemented |
| [T03 — Harvest Control Page](T03-harvest-control-page.md) | Discuss changed page with PM before implementation; old notes only |
| [T04 — Anchovy Bay Intro Screen](T04-anchovy-bay-intro-screen.md) | Asset supplied; intended screen change needs clarification; not implemented |

Keep each ticket's understanding, questions, and tasks in its own file. Update that file when decisions are made; proposals are not approved requirements.

## Local review

Local `.env` uses `MOCK=true`. Home: `http://localhost:5173/`; reference charts: `http://localhost:5173/test`.

The existing mock enables Northwestern Mediterranean and Anchovy Bay. Aegean Sea is intentionally unavailable on the home page; its dashboard can be viewed directly at `http://localhost:5173/scenario-outputs/aegean-sea`. Enabling its home-page card would require an application-code change and has been deferred.
