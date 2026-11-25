# GCP deployment design

Package Next.js standalone with its static assets, FastAPI with Uvicorn, and Celery with the dispatcher as independent runtime artifacts. Use Cloud Run services for the two web-facing processes, continuously running Cloud Run worker pools for queue consumption and dispatch, Artifact Registry, Secret Manager, approved Cloud SQL for PostgreSQL and Memorystore for Redis, and GCS for approved media. Use separate service identities and keep the Next.js browser session and application authorization intact when authenticating service-to-service calls.

Staging must verify the chosen region, private database and Redis connectivity, service identity, readiness, structured telemetry, startup and rolling revisions, worker instance counts, graceful shutdown, and redelivery after interruption. Record actual resource settings, queue latency under load, instance-hours, and estimated monthly cost for idle and representative load before approval. Rehearse returning to an earlier compatible revision.

Production provisioning, deployment, migration, and worker cutover require explicit approval.
