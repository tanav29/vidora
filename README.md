# Vidora

Vidora is a video library with direct uploads, background FFmpeg transcoding, adaptive HLS playback, and shareable watch links. The Next.js app handles accounts and uploads; a separate worker processes videos from a Redis queue.

[See the demo](https://x.com/tanavtwt/status/2007356766284329173?s=20)

## What you need

- Node.js 22, npm, and FFmpeg (FFmpeg is included in the worker Docker image)
- PostgreSQL, an Upstash Redis database with REST credentials, and a Cloudflare R2 bucket
- Google OAuth credentials; Dodo Payments credentials are only needed for paid plans

The browser uploads directly to R2. Configure the bucket CORS policy to allow your app origin, `PUT` and `GET` requests, and the `Content-Type` header. Expose the bucket through a public R2 URL for playback; playback assets must be accessible from the browser. Set the Google OAuth redirect URI to `<app-url>/api/auth/callback/google`.

## Run locally

1. Copy `web/.env.example` to `web/.env` and `worker/.env.example` to `worker/.env`. Fill in the credentials. Set the same `R2_BUCKET`, Upstash credentials, and a long random `WORKER_SHARED_SECRET` in both files. Set both public R2 URLs to your bucket's public base URL. `R2_CLIENT_URL` is the S3 endpoint (`https://<account-id>.r2.cloudflarestorage.com`); the worker takes the account ID separately. The web and worker secret-key variable names differ as shown in the examples.
2. Install dependencies and apply the database migrations:

   ```sh
   npm install
   npm --prefix web install
   npm --prefix worker install
   cd web
   npx prisma migrate deploy
   cd ..
   ```

3. Start both processes with `npm run dev`, then open `http://localhost:3000`. Or run `npm run dev:web` and `npm run dev:worker` in separate terminals. The worker needs `ffmpeg` and `ffprobe` on its PATH.

## Interview demo (no services required)

To showcase the product before PostgreSQL, Redis, R2, or Google OAuth are configured, install only the web dependencies and run the app:

```sh
npm --prefix web install
npm run dev:web
```

Open `http://localhost:3000/demo` (or choose **Explore demo** on the landing page). This public tour renders illustrative library, storage, and processing data without authentication or backend calls. Its upload control is intentionally disabled; uploads and processing require the configured services described above. The demo cards are not persisted and do not represent real customer data.

Suggested interview walkthrough: explain the browser-to-R2 direct upload, show the processing status and retry history from the real Tasks page when services are available, then describe how the worker creates HLS renditions and the watch page plays them. The `/demo` page is suitable for a UI walkthrough when credentials are unavailable; it does not execute the upload or transcoding pipeline.

For billing, configure `DODO_PAYMENTS_API_KEY`, `DODO_PREMIUM_PRODUCT_ID`, and `WEBHOOK_SECRET_KEY`, and point the Dodo webhook to `<app-url>/api/billing/dodo/webhook`.

## Deploy

Deploy the web app from `web/` to a Node-compatible host, set the web environment variables, and run `npx prisma migrate deploy` against the production database. Set `NEXT_PUBLIC_APP_URL` to the deployed origin and register its Google callback and R2 CORS origin.

Deploy the worker as a **long-running service**, not a serverless function. On a Docker host such as Railway, use `worker/` as the build context and its Dockerfile. Set the variables from `worker/.env.example`, including `BACKEND_URL` as the deployed web origin and the same `WORKER_SHARED_SECRET` as the web app. The worker validates required variables at startup and needs writable temporary disk space for the source and encoded files. Configure automatic restarts.

To run the same image locally:

```sh
docker build -t vidora-worker ./worker
docker run --env-file ./worker/.env --restart unless-stopped vidora-worker
```

When Docker runs on your own computer, `localhost` inside the container refers to the container itself; use a web URL reachable from the container for `BACKEND_URL` (for example, `http://host.docker.internal:3000` on Docker Desktop). Start the web app first, then upload a short video and check the Tasks page and worker logs through to playback.

## How it works

1. The browser uploads a source file to R2 with a presigned URL; the web app creates a video record and queues a job.
2. The worker downloads the source, produces the selected HLS renditions and thumbnails, uploads them to R2, and reports progress to the web app. Failed jobs are retried; an expired in-flight lease can be recovered by a worker.
3. The Processing page shows each video's status, progress, and recorded failure and retry history. Failed jobs can be retried by their owner after the source is accessible. Older failures may not have recorded details. Watch pages require a signed-in session.

The worker keeps the source in R2 through processing failures and deletes it only after the outputs are uploaded and completion is confirmed. Explicitly deleting a video also deletes its source. Automatic retries wait 30 seconds and run up to three times after the initial attempt; an operator retry starts a new retry cycle. If queueing an upload fails, its source is retained and the failed job can be retried from Processing. Recording worker failures requires the web app to be reachable.

## Troubleshooting

- **Worker exits at startup:** check the named missing or invalid variables in its logs. `BACKEND_URL` and the Upstash REST URL must be HTTP(S) URLs.
- **Jobs stay pending:** check that the worker is running and both services use the same Upstash database and R2 bucket.
- **Processing cannot report status:** verify that the worker can reach `BACKEND_URL` and that both shared secrets match.
- **Upload or playback fails in the browser:** check R2 CORS, the public bucket URL, and access to the objects. Check the browser's network response and worker logs for details.

Useful checks: `npm run lint:web`, `npm run typecheck:worker`, and `npm run build`. The web app is in `web/`; the queue consumer and Dockerfile are in `worker/`.

## Observability

API requests and worker job lifecycle events are logged as JSON with Pino. Set `LOG_LEVEL` to control verbosity. API metrics are available at `/metrics` on each web process; worker metrics are at port 9464 by default. Metrics are process-local, so Prometheus must scrape each replica separately. Protect these endpoints using private networking or an authenticated proxy; they contain operational information.

For local monitoring, start the web app and worker, setting `METRICS_HOST=0.0.0.0` on the worker so Docker can reach it, then run `docker compose -f observability/compose.yml up -d`. Open Grafana at http://localhost:3001 (initial credentials are Grafana's default `admin` / `admin`, which must be changed on first login). Prometheus is at http://localhost:9090. The sample configuration uses `host.docker.internal`; adjust targets for your deployment. Do not expose the worker metrics port publicly. On serverless web deployments, process-local scrape metrics are incomplete; use a managed telemetry collector or platform integration instead.
