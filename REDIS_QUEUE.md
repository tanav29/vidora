# Redis Queue

Vidora now uses Upstash Redis for both job queueing and transient job status.

Required environment variables:

```env
UPSTASH_REDIS_REST_URL="..."
UPSTASH_REDIS_REST_TOKEN="..."
```

The web app enqueues jobs with `LPUSH`, and the worker polls the queue with `RPOP`.
Failed jobs are requeued into a delayed retry set in Redis.
