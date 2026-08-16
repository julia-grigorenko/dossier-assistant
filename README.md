# AI Client Intake & Dossier Assistant

A portfolio MVP demonstrating an end-to-end client intake and employee review workflow using Next.js, TypeScript, Supabase/PostgreSQL, Zod validation, deterministic status evaluation, and explicit human approval.

A customer submits a free-text business request. The application stores it as a dossier, applies structured analysis, flags uncertain or incomplete information for review, allows an employee to correct the extracted data, and requires a separate explicit action before approval.

## Technology stack

* Next.js 16 with the App Router
* React 19
* TypeScript
* Tailwind CSS
* Supabase/PostgreSQL
* Supabase JavaScript client
* Zod
* Vitest
* n8n integration planned for the next implementation phase

## Prerequisites

Install the following before running the project:

* Node.js 20 or newer
* npm
* Docker Desktop or another Docker-compatible runtime
* Git
* `jq` for optional command-line JSON formatting

Verify the main dependencies:

```bash
node --version
npm --version
docker --version
git --version
```

Docker Desktop must be running before starting the local Supabase stack.

`jq` is optional. On Ubuntu or Debian, install it with:

```bash
sudo apt update
sudo apt install -y jq
```

## Installation

Clone the repository:

```bash
git clone YOUR_REPOSITORY_URL
cd dossier-assistant
```

Install the application dependencies:

```bash
npm install
```

The Supabase CLI does not need to be installed globally. The project invokes it through `npx`.

If the local Supabase snippets directory is missing, create it:

```bash
mkdir -p supabase/snippets
```

Start the local Supabase services:

```bash
npx supabase start
```

The first start can take several minutes while Docker images are downloaded.

Check the local service URLs and credentials:

```bash
npx supabase status
```

## Environment variables

Create a local environment file in the project root:

```text
.env.local
```

For local Supabase development, add:

```dotenv
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=YOUR_LOCAL_SERVICE_ROLE_KEY
```

Use the API URL and `service_role` key printed by:

```bash
npx supabase status
```

Do not use the PostgreSQL connection URL as `SUPABASE_URL`.

Incorrect:

```dotenv
SUPABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Correct:

```dotenv
SUPABASE_URL=http://127.0.0.1:54321
```

For a hosted Supabase project, use:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_HOSTED_SUPABASE_SECRET_KEY
```

The URL and key must belong to the same Supabase instance. Do not combine a local URL with a hosted key.

The secret key:

* Is used only by server-side modules.
* Bypasses Row Level Security.
* Must never be exposed to browser code.
* Must never be prefixed with `NEXT_PUBLIC_`.
* Must never be committed to Git.

The application protects privileged modules with:

```ts
import "server-only";
```

Environment files are excluded by `.gitignore`. Verify:

```bash
git check-ignore .env.local
```

Expected:

```text
.env.local
```

The committed `.env.example` documents required variables without containing real secrets:

```dotenv
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Supabase migrations

Database migrations are stored in:

```text
supabase/migrations/
```

The migrations create:

* `dossier_status` enum
* `request_type` enum
* `dossiers` table
* Data-integrity constraints
* Email-format constraint
* Dashboard query index
* Processing-token index
* `updated_at` trigger
* Required `service_role` table grants

The dashboard index is:

```sql
(status, created_at desc)
```

### Apply migrations to a fresh local database

Make sure Supabase is running:

```bash
npx supabase start
```

Reset the local database and apply every migration:

```bash
npx supabase db reset
```

Warning: `db reset` deletes all data in the local Supabase database.

### Apply only pending migrations

To retain existing local data:

```bash
npx supabase migration up --local
```

Check migration status:

```bash
npx supabase migration list --local
```

### Push migrations to a hosted development project

Log in and link the project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Preview the pending changes:

```bash
npx supabase db push --dry-run
```

Apply them:

```bash
npx supabase db push
```

Do not run a destructive reset against a hosted project unless that is explicitly intended.

## Local development

Start Supabase first:

```bash
npx supabase start
```

Start the Next.js development server:

```bash
npm run dev
```

Open:

* Intake: http://localhost:3000/intake
* Dashboard: http://localhost:3000/dashboard
* Local Supabase Studio: http://localhost:54323

Stop Next.js with `Ctrl+C`.

Stop the local Supabase stack with:

```bash
npx supabase stop
```

## Test and build commands

Run the unit tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Run the persistence integration check:

```bash
npm run check:persistence
```

The persistence check creates a dossier, retrieves it, adds analysis, approves it, and confirms the stored state.

Run ESLint:

```bash
npm run lint
```

Run TypeScript checking independently:

```bash
npx tsc --noEmit
```

Create an optimized production build:

```bash
npm run build
```

Start the production build locally:

```bash
npm run start
```

The generated Next.js build is stored in:

```text
.next/
```

Do not edit or commit `.next/`.

Before committing, run the full verification sequence:

```bash
npm test
npm run lint
npm run build
```

## MVP Foundation flow

### 1. Submit a customer intake

Open:

http://localhost:3000/intake

Submit:

* Full name
* Email
* Company name
* Free-text request

The client and server validate the request. A valid submission creates a dossier with:

```text
PROCESSING
```

The original request is persisted before analysis begins.

### 2. Run development mock analysis

The MVP Foundation uses a development-only mock endpoint. It supports two deterministic samples:

* `complete` → `READY`
* `incomplete` → `NEEDS_REVIEW`

The endpoint is intentionally available only when running:

```bash
npm run dev
```

Set the dossier ID:

```bash
DOSSIER_ID="YOUR_DOSSIER_ID"
```

Run the complete sample:

```bash
curl -i \
  -X POST \
  "http://localhost:3000/api/dev/dossiers/$DOSSIER_ID/analyze" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "sample": "complete"
  }'
```

Run the incomplete sample for a different, newly created dossier:

```bash
curl -i \
  -X POST \
  "http://localhost:3000/api/dev/dossiers/$DOSSIER_ID/analyze" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "sample": "incomplete"
  }'
```

The mock passes through the same trusted application path that the future n8n callback will use:

```text
Mock analysis
  → Zod validation
  → evaluateAnalysis()
  → status transition
  → repository
  → PostgreSQL
```

The mock does not write directly to PostgreSQL.

### 3. Browse the dashboard

Open:

http://localhost:3000/dashboard

The dashboard shows dossiers newest first and includes:

* Customer name
* Company
* Request type
* Requested amount
* Status
* Created date
* Optional status filter

Dossiers without analysis display an awaiting-analysis state.

### 4. Review a dossier

Open a dossier from the dashboard.

The review page displays:

* Original customer request
* Contact information
* Extracted analysis fields
* AI summary
* Confidence
* Missing fields
* Validation warnings
* Processing or failure explanation
* Current status

### 5. Correct the analysis

Use the review form to edit allowed analysis fields.

Saving corrections:

* Validates the corrected data.
* Runs `evaluateAnalysis()`.
* Recalculates `READY` or `NEEDS_REVIEW`.
* Persists the corrections and validation warnings.
* Never approves the dossier automatically.

Customer intake fields are immutable through the correction endpoint.

### 6. Approve explicitly

Approval uses a separate action and endpoint:

```text
POST /api/dossiers/:id/approve
```

Approval:

* Is allowed only from `READY` or `NEEDS_REVIEW`.
* Requires structurally and numerically valid analysis.
* Sets `status` to `APPROVED`.
* Sets `approved_at`.
* Prevents further corrections.
* Rejects repeated approval attempts.

A human may explicitly approve a low-confidence `NEEDS_REVIEW` dossier after reviewing it. The mock workflow and future n8n/LLM workflow cannot approve dossiers.

### Complete MVP Foundation vertical slice

```text
Submit intake
  → PROCESSING
  → development mock analysis
  → READY or NEEDS_REVIEW
  → dashboard
  → review
  → save corrections
  → explicit approval
  → APPROVED
```

Refresh the dashboard and review page after each important step to confirm that state is persisted in PostgreSQL.

## API endpoints

### Application endpoints

```text
POST   /api/dossiers
GET    /api/dossiers
GET    /api/dossiers/:id
PATCH  /api/dossiers/:id
POST   /api/dossiers/:id/approve
```

The list endpoint optionally accepts a status filter:

```text
GET /api/dossiers?status=NEEDS_REVIEW
```

### Development-only endpoint

```text
POST /api/dev/dossiers/:id/analyze
```

Request body:

```json
{
  "sample": "complete"
}
```

or:

```json
{
  "sample": "incomplete"
}
```

The endpoint returns `404` outside development mode.

## Status lifecycle

The MVP supports:

```text
PROCESSING
READY
NEEDS_REVIEW
PROCESSING_FAILED
APPROVED
```

Main transitions:

```text
PROCESSING → READY
PROCESSING → NEEDS_REVIEW
PROCESSING → PROCESSING_FAILED
PROCESSING_FAILED → PROCESSING
READY → NEEDS_REVIEW
NEEDS_REVIEW → READY
READY → APPROVED
NEEDS_REVIEW → APPROVED
```

`APPROVED` is terminal.

## Current MVP limitations

* n8n is not integrated yet.
* No real LLM provider is called.
* Analysis is produced by deterministic development fixtures.
* The development mock is triggered manually through a temporary endpoint.
* No authentication or employee user accounts are implemented.
* No authorization roles are implemented.
* The server uses an elevated Supabase secret/service-role key.
* The API must not be exposed publicly without authentication and authorization.
* RLS is enabled, but browser-facing RLS policies are intentionally absent because the browser uses Next.js API routes.
* No production queue, dead-letter queue, or durable job scheduler exists.
* No automated retry UI is implemented for `PROCESSING_FAILED`.
* No workflow-run or audit-history table exists.
* No analysis version history exists.
* Approval is terminal; reopening an approved dossier is not supported.
* Concurrent updates use only basic status checks rather than full record versioning.
* Monetary values use one assumed demo currency, EUR.
* Multi-currency support is not implemented.
* Email validation is basic and does not verify that an address exists.
* No file uploads or document extraction are implemented.
* No notifications are implemented.
* The UI has functional MVP styling and limited accessibility testing.
* Deployment and production connectivity are not completed.
* Automated tests focus on domain rules and deterministic mock fixtures; full browser end-to-end tests are not included.

## Security notes

Never commit or share:

```text
.env
.env.local
SUPABASE_SERVICE_ROLE_KEY
Supabase service_role keys
Database passwords
```

Before pushing to GitHub, verify:

```bash
git status
git ls-files .env .env.local
git ls-files '.next/*'
git ls-files 'supabase/.temp/*'
```

The `git ls-files` commands above should produce no output for secrets and generated files.

If a secret key is accidentally committed or shared publicly, rotate it immediately.
