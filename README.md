# SURIMI Web App

Minimal Docker setup for sharing the project with non-developers.

## What the project manager needs

- Docker Desktop installed and running
- Optional: Node.js and npm, only if they want to use the npm shortcut commands

## Fastest way to run

From the project root:

```bash
docker compose up --build -d
```

Open:

```text
http://localhost:18080
```

To stop it:

```bash
docker compose down
```

## npm shortcuts

If npm is available, the same flow can be run with:

```bash
npm run docker:up
```

To stop:

```bash
npm run docker:down
```

To view logs:

```bash
npm run docker:logs
```

## Notes

- The app is built once into static files and served by Nginx.
- Client-side routes are supported, so refreshing pages like `/scenario/...` still works.
- The default host port is `18080`.
- You can change it temporarily without editing files:

```bash
SURIMI_PORT=19090 docker compose up --build -d
```

### Mock mode (controller down)

Set `MOCK=true` to use canned controller responses
(`src/lib/services/controllerMock.ts`) instead of calling the controller.
It defaults to `false` and is read at build time:

```bash
MOCK=true npm run dev
MOCK=true docker compose up --build -d
```

## Pastebin

### Controller interface

```
{
  "scenario_names": [
    "aegean_sea",
    "anchovy_bay",
    "northwestern_med"
  ]
}
```

```
{
  "simulation_statuses": [
    {
      "simulation_id": "3eb1efa6-e7c9-4ae0-a825-8a31f4cfbdaf",
      "experiment_id": "126fb98f-9d38-48b3-af2f-e65ee5fa9f57",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791797504",
        "nanos": 584793700
      },
      "simulation_duration": {
        "seconds": "494",
        "nanos": 415330400
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.241.13:7890",
      "order": 9
    },
    {
      "simulation_id": "a3269372-3957-4525-8439-19ef166c31a3",
      "experiment_id": "126fb98f-9d38-48b3-af2f-e65ee5fa9f57",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791797504",
        "nanos": 583828800
      },
      "simulation_duration": {
        "seconds": "525",
        "nanos": 667505600
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.10.123:7890",
      "order": 8
    },
    {
      "simulation_id": "27cd3a70-9734-4b0b-ba2c-f86a0ff8873a",
      "experiment_id": "126fb98f-9d38-48b3-af2f-e65ee5fa9f57",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791797504",
        "nanos": 582940900
      },
      "simulation_duration": {
        "seconds": "678",
        "nanos": 743871900
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.84.204:7890",
      "order": 7
    },
    {
      "simulation_id": "08a73122-c7bf-44d6-b2bc-08bf6b4999c3",
      "experiment_id": "126fb98f-9d38-48b3-af2f-e65ee5fa9f57",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791797504",
        "nanos": 581793300
      },
      "simulation_duration": {
        "seconds": "493",
        "nanos": 514987700
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.59.98:7890",
      "order": 6
    },
    {
      "simulation_id": "d0b029f3-cf75-4717-8e76-8598bcae5e06",
      "experiment_id": "126fb98f-9d38-48b3-af2f-e65ee5fa9f57",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791797504",
        "nanos": 580631700
      },
      "simulation_duration": {
        "seconds": "525",
        "nanos": 589541300
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.110.140:7890",
      "order": 5
    },
    {
      "simulation_id": "542086b9-be6d-4824-be84-f5e6d86e36a3",
      "experiment_id": "cccd6c0c-d6d4-4dcb-b2d8-91c220c71dde",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791387948",
        "nanos": 423962600
      },
      "simulation_duration": {
        "seconds": "347",
        "nanos": 300535100
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.59.98:7890",
      "order": 4
    },
    {
      "simulation_id": "ef840beb-f646-4390-9fb3-492ac82e76e1",
      "experiment_id": "f5599adb-f62b-4ed2-81c1-9099c983ca3a",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Initialised",
      "simulation_started": {
        "seconds": "1791387524",
        "nanos": 932931300
      },
      "simulation_duration": {
        "nanos": 10000000
      },
      "ecology_host": "http://::ffff:10.100.182.199:7890",
      "order": 3
    },
    {
      "simulation_id": "032cacf7-b723-4715-985f-0f582b4c193c",
      "experiment_id": "8cba041c-9c20-4e58-ae71-4ca0c758c742",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Finished",
      "simulation_started": {
        "seconds": "1791387520",
        "nanos": 28572100
      },
      "simulation_duration": {
        "seconds": "465",
        "nanos": 113752000
      },
      "simulation_current": {
        "seconds": "1483228800"
      },
      "ecology_host": "http://::ffff:10.100.110.140:7890",
      "order": 2
    },
    {
      "simulation_id": "53a61028-0e3f-4152-88b2-63eecf88d935",
      "experiment_id": "6a872f58-3c3a-453a-9ee3-ea8ccf125c22",
      "scenario_name": "northwestern_med",
      "start_date_time": {
        "seconds": "1356998400"
      },
      "end_date_time": {
        "seconds": "1483228800"
      },
      "status": "Initialised",
      "simulation_started": {
        "seconds": "1791387505",
        "nanos": 798536600
      },
      "simulation_duration": {
        "nanos": 10000000
      },
      "ecology_host": "http://::ffff:10.100.69.9:7890",
      "order": 1
    }
  ]
}
```
