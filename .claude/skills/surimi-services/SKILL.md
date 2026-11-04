---
name: surimi-services
description: Look up how the SURIMI services this GUI depends on really behave, in their source on GitHub (org SURIMI-Project: controller, Ecopath, market, fisheries authority, output creator, protocol, POSEIDON, CMSY, value chain) and in the SURIMI-project issue tracker, instead of guessing. Use before stating or relying on any behaviour of the controller or a model service (statuses, cancel, MSE runs, Ecopath pods, outputs, errors, env vars), when designing backend code that calls them, when a run behaves unexpectedly, when the user mentions Rik or a partner's answer, or when the user types /surimi-services.
---

# Check the SURIMI services at the source

The controller and the model services are owned by partner teams. Their docs
are thin and answers by mail can be out of date, so behaviour is checked in the
code and recorded with the commit it was read at.

## 1. Find the repo

All under `https://github.com/SURIMI-Project/`. The `gh` CLI is logged in.

| Repo | Language | What it is, for us |
| --- | --- | --- |
| `SURIMI-controller` | C# | `surimi.v1.ControllerService`: experiments, simulations, statuses, Ecopath pod dispatch. **The one we call.** Owner: Rik |
| `SURIMI-protocol` | proto | Source of `buf.build/surimi/surimi-protocol` |
| `SURIMI-Ecopath` | C# | Ecology service (Ecopath with Ecosim); one pod per simulation |
| `SURIMI-market` | Python | Market service; S3 inputs under `market/<scenario>/` |
| `SURIMI-fisheries-authority` | C# | Regulations, `CreateRegulations`; recruitment and quota CSVs |
| `SURIMI-output-creator` | Python | Writes the `.nc` and `.bin` outputs |
| `SURIMI-CMSY` | R | Stock assessment |
| `SURIMI-POSEIDON`, `SURIMI-POSEIDON_inputs` | Java | Fishery agent model and its inputs |
| `SURIMI-value-chain` | C# | Value chain model |
| `SURIMI-Common-DotNet`, `SURIMI-Datamodel-DotNet`, `SURIMI-SemanticRegistry-DotNet` | C# | Shared code and DTOs used by the C# services |
| `SURIMI-project` | — | **Issues only, no code.** Search it for known problems |
| `SURIMI-datagui`, `SURIMI-market` (local clones) | Python | Already cloned in `c:\Konnecta\github\SURIMI-Project\` |

List them again with
`gh repo list SURIMI-Project --limit 100 --json name,description,updatedAt`
when a repo is missing here, and add it to this table.

## 2. Read the code

Shallow-clone into the session scratchpad, never into this repo, and only read
it: do not build or run partner code.

```bash
git clone -q --depth 1 https://github.com/SURIMI-Project/<repo>.git <scratchpad>/repos/<repo>
git -C <scratchpad>/repos/<repo> log -1 --format='%h %cs'
```

For a single file, `gh api repos/SURIMI-Project/<repo>/contents/<path> --jq .content | base64 -d`.

Where things are in `SURIMI-controller/SURIMI-controller/`:

| Question | File |
| --- | --- |
| Status strings and transitions, cancel rules | `Services/SimulationManager.cs` (`InitSimulationAsync`, `RunSimulationAsync`, `CancelSimulationAsync`) |
| Experiment submit, MSE runs, init order, cancel of an experiment | `Services/ExperimentManager.cs` (`SubmitExperiment`, `RunExperimentAsync`, `CancelExperimentAsync`) |
| RPC handlers (`RemoveExperiment` = cancel) | `Services/ControllerService.cs` |
| Ecopath pods, "No available pods" | `Services/SimulationDispatcher.cs`, `Services/ServiceClients/EcopathServiceClient.cs` |
| Env vars (`ECOPATH_NR_OF_PODS`, `NR_OF_MSE_RUNS`, `AWS_*`, service URLs) | `Program.cs` |

Issues: `gh issue list -R SURIMI-Project/SURIMI-project --state all --search "<words>"`.

## 3. Record what you found

- State the fact with its evidence: **Read from source**, repo and short commit,
  file and method. Example: "Read from source, SURIMI-controller `a8a7f3a`,
  `SimulationManager.CancelSimulationAsync`".
- A partner's answer (mail, chat) is recorded as **Confirmed by <name>,
  YYYY-MM-DD**. When it disagrees with the code, record both and add an open
  question in `docs/ISSUES.md`.
- Put controller behaviour in `docs/ARCHITECTURE.md` § "Controller behaviour";
  defects go to `docs/ISSUES.md` § "Controller and model services" via
  `/issue`; decisions that depend on it link the section.
- When the code changed since the commit a doc cites, re-check and update the
  doc and its commit.

## 4. Report

Say which repos and commits you read and which docs you updated.
