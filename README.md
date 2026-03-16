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
