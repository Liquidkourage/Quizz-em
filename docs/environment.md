# Server environment variables

Set these on the Railway server service. Only the first two matter for a normal show.

| Variable | Needed | What it does |
| --- | --- | --- |
| `HOST_SECRET` | Yes, when deployed | The password the host desk must send. A deployed server with none set refuses every host. |
| `DATABASE_URL` | Strongly recommended | Postgres connection string. Stores question libraries and, with it set, saves live tables every ~5 seconds so a restart can restore them. Unset: libraries use a SQLite file (lost on redeploy without a volume) and nothing is saved for recovery. |
| `ENFORCE_CORS_ALLOWLIST` | No (off) | Set to exactly `true` to restrict which other websites may call the server. Off or anything else: any origin is allowed, as before. |
| `ALLOWED_ORIGINS` | Only with the flag above | Comma-separated origins, for example `https://quizzem.example.com,https://www.quizzem.example.com`. Include every address people really use. Ignored unless `ENFORCE_CORS_ALLOWLIST=true`. Pages served by this server are never affected. |
| `PORT` | Railway sets it | Port to listen on (default 7777). |
| `HOST` | No | Address to bind (default `0.0.0.0`). |
| `PGSSLMODE` | No | `disable` turns off Postgres SSL for the venue library and table snapshots. Local databases are detected automatically. |
| `VENUE_DATABASE_PATH` | No | SQLite file location when `DATABASE_URL` is unset. |
| `ANSWER_WINDOW_SECONDS` (or `ANSWER_WINDOW_SEC`) | No | Default answer countdown, clamped to 15 to 300 seconds. The host can override it per venue. |
| `QHE_CPU_VP_ACTION_DELAY_MS` | Rehearsal only | Delay between computer-player actions in milliseconds (default is a random 3 to 7 seconds). Use `0` or `50` to rehearse large all-CPU fields. |
| `RAILWAY_PUBLIC_DOMAIN`, `RAILWAY_ENVIRONMENT`, `RAILWAY_PROJECT_ID` | Railway sets them | Used to print links and to detect a deployed server (which makes `HOST_SECRET` mandatory). |
| `NODE_ENV` | No | `production` also marks the server as deployed. |

Client builds (not the server) read `VITE_SOCKET_URL`, which points a built page at a server on another address. Leave it unset when the server serves the pages itself.
