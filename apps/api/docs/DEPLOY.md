# Deploy to Google Cloud Run

## Prerequisites

1. **Google Cloud Account** with billing enabled
2. **gcloud CLI** installed: https://cloud.google.com/sdk/docs/install
3. **Docker** installed (for local testing)

## Initial Setup (One-time)

### 1. Install and configure gcloud

```bash
# Install gcloud (macOS)
brew install google-cloud-sdk

# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create bakery-api-prod --name="Bakery API"

# Set the project
gcloud config set project bakery-api-prod

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable artifactregistry.googleapis.com
```

### 2. Create Artifact Registry repository

```bash
# Create repository for Docker images
gcloud artifacts repositories create bakery-api \
  --repository-format=docker \
  --location=us-central1 \
  --description="Bakery API Docker images"

# Configure Docker to use gcloud credentials
gcloud auth configure-docker us-central1-docker.pkg.dev
```

## Deploy

### Option A: Direct Deploy (Recommended for first deploy)

```bash
cd apps/api

# Deploy directly from source (Cloud Build handles everything)
gcloud run deploy bakery-api \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "ENVIRONMENT=production" \
  --set-env-vars "SUPABASE_URL=https://khwcknapjnhpxfodsahb.supabase.co" \
  --set-env-vars "SUPABASE_SERVICE_KEY=YOUR_SERVICE_KEY_HERE" \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300
```

### Option B: Build and Deploy Separately

```bash
cd apps/api

# Build image
gcloud builds submit --tag us-central1-docker.pkg.dev/bakery-api-prod/bakery-api/api:latest

# Deploy
gcloud run deploy bakery-api \
  --image us-central1-docker.pkg.dev/bakery-api-prod/bakery-api/api:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars "ENVIRONMENT=production,SUPABASE_URL=https://khwcknapjnhpxfodsahb.supabase.co,SUPABASE_SERVICE_KEY=YOUR_KEY"
```

## Configure Cloud Scheduler (Cron Jobs)

After deploying, set up Cloud Scheduler to trigger jobs:

```bash
# Get your Cloud Run URL
CLOUD_RUN_URL=$(gcloud run services describe bakery-api --region us-central1 --format 'value(status.url)')

# Create daily orders report job (runs at 6:00 AM Colombia time)
gcloud scheduler jobs create http daily-orders-report \
  --location us-central1 \
  --schedule "0 6 * * *" \
  --time-zone "America/Bogota" \
  --uri "${CLOUD_RUN_URL}/api/jobs/daily-orders-report" \
  --http-method POST \
  --oidc-service-account-email YOUR_SERVICE_ACCOUNT@bakery-api-prod.iam.gserviceaccount.com
```

## Environment Variables

Set these in Cloud Run:

| Variable | Description | Required |
|----------|-------------|----------|
| `ENVIRONMENT` | `production` | Yes |
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (not anon) | Yes |
| `GCP_PROJECT_ID` | Your GCP project ID | No |
| `GCP_REGION` | `us-central1` | No |

### Get Supabase Service Key

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy the `service_role` key (NOT the anon key)

## Verify Deployment

```bash
# Get service URL
gcloud run services describe bakery-api --region us-central1 --format 'value(status.url)'

# Test health endpoint
curl https://YOUR-URL.run.app/health

# Test detailed health
curl https://YOUR-URL.run.app/health/detailed
```

## Useful Commands

```bash
# View logs
gcloud run logs read --service bakery-api --region us-central1

# View logs in real-time
gcloud run logs tail --service bakery-api --region us-central1

# Update environment variables
gcloud run services update bakery-api \
  --region us-central1 \
  --set-env-vars "NEW_VAR=value"

# Scale settings
gcloud run services update bakery-api \
  --region us-central1 \
  --min-instances 1 \
  --max-instances 20

# Delete service (if needed)
gcloud run services delete bakery-api --region us-central1
```

## Cost Estimation

Cloud Run pricing (us-central1):
- **CPU**: $0.00002400 / vCPU-second
- **Memory**: $0.00000250 / GiB-second
- **Requests**: $0.40 / million requests
- **Free tier**: 2 million requests/month, 360,000 GiB-seconds, 180,000 vCPU-seconds

For moderate usage (few thousand requests/day), expect **$5-15/month**.

## Troubleshooting

### Container fails to start
```bash
# Check build logs
gcloud builds list --limit=5

# Check deployment logs
gcloud run logs read --service bakery-api --region us-central1 --limit=50
```

### Health check fails
- Ensure `PORT` environment variable is set to `8080` (Cloud Run default)
- Verify Supabase credentials are correct

### Scheduler not triggering
- Ensure Cloud Scheduler has permission to invoke Cloud Run
- Check scheduler logs: `gcloud scheduler jobs describe daily-orders-report --location us-central1`
