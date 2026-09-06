# baseball-app

Live MLB game viewer: GUMBO and Baseball Savant merged server-side and streamed
to the browser as typed domain events.

```sh
bun install
bun run dev          # app on http://localhost:3000, API on :3030
bun run dev:replay   # no network — replays a recorded game
```

Set `DATABASE_URL` (see `.env.example`) for the leaders and `/custom-query` pages.

See [CLAUDE.md](CLAUDE.md) for architecture and development notes.
