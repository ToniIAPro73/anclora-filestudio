# Anclora Filestudio — Production Runtime Manifest

PRODUCTION_RUNTIME_MANIFEST_VERSION=1.0
STATUS=PRODUCTION_RUNTIME_CONFIRMED
LOCAL_RUNTIME_MODEL=PRODUCTION_BACKED
DO_NOT_CREATE_DEVELOPMENT_DATABASE=true

## 1. Application Identity

APPLICATION_NAME=Anclora Filestudio
REPOSITORY=anclora-filestudio
APPLICATION_TYPE=fullstack_or_application
FRAMEWORK=Next.js

## 2. Runtime Topology

FRONTEND_PROVIDER=Vercel
BACKEND_PROVIDER=Vercel Serverless Functions
PRODUCTION_DOMAIN=anclora-filestudio-3fyoq34kw-pmi140979-6354s-projects.vercel.app
PRODUCTION_DEPLOYMENT_PROVIDER=Vercel

```text
Browser / Client
   ↓
Vercel Frontend (Next.js)
   ↓
Backend Services
   ├── Database: None
   └── External Integrations
```

## 3. Production Database Contract

DATABASE_PROVIDER=None
DATABASE_SCOPE=production
LOCAL_DATABASE_SCOPE=production

Local development intentionally connects to the Production database.
This is the Anclora operating model.
Do not create or switch to a Development, Preview, Staging, ephemeral,
local or alternate database unless Toni explicitly requests it.

## 4. Database Migration Contract

MIGRATION_SYSTEM=None
MIGRATION_STRATEGY=NONE
MIGRATION_DIRECTORY=NONE
MIGRATION_RUNNER=NONE

All schema migrations apply strictly against the designated production database.
Destructive drops or resets are strictly prohibited without authorization.

## 5. Storage Contract

STORAGE_PROVIDER=None
STORAGE_SCOPE=production

Local development utilizes production storage buckets/services according to the production-backed model.

## 6. Authentication Contract

AUTH_PROVIDER=Session / JWT
AUTH_SCOPE=production

## 7. External Services & Integrations

EXTERNAL_SERVICES=Vercel API, Production Database, Email/Notifications

## 8. Environment Files & Loading Order

ENV_FILES=.env.local (mode 0600), .env.production.local (fallback)
All local secret variables point to production services. Never commit .env files containing credentials.

## 9. Local vs Production Model

LOCAL_RUNTIME_MODEL=PRODUCTION_BACKED
DO_NOT_CREATE_DEVELOPMENT_DATABASE=true

## 10. Persistent QA User Contract

PERSISTENT_QA_USER=qa@anclora.com (or system persistent test account)
QA identity must be preserved across sessions; never drop or reset test accounts.

## 11. Git Branch & Operational Policy

DEFAULT_BRANCH=development
PROMOTION_POLICY=All work commits to development branch. Never push directly to main or production.
