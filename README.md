# Hire Me — a job portal

A two-sided hiring platform. **Candidates** build a profile, search listings and track
their applications. **Employers** post roles for their company, review applicants,
browse a talent pool and invite people to apply by email.

Everything runs in Docker. One command brings up the database, the API and the UI, and
seeds a populated demo dataset so there is something to look at immediately.

```bash
git clone <your-repo-url>
cd hire-me
docker compose up --build
```

Then open **<http://localhost:5173>** and sign in with the credentials in
[Test credentials](#test-credentials).

---

## Contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Running it](#running-it)
- [Test credentials](#test-credentials)
- [Feature walkthrough](#feature-walkthrough)
- [API](#api)
- [Tech stack](#tech-stack)
- [Testing and quality gates](#testing-and-quality-gates)
- [Security notes](#security-notes)
- [Configuration](#configuration)
- [Known limitations](#known-limitations)
- [Further documentation](#further-documentation)

---

## What it does

| Area | Candidate | Employer |
|---|---|---|
| Account | Register, sign in, session restored on reload | Same, plus their company is created with the account |
| Profile | Personal details, preferences, résumé, live completion score | Personal details and company details |
| Profile sections | Experience, education, certifications, projects (full CRUD) | — |
| Jobs | Search and filter published listings, view detail, see similar roles | Post, edit, and move a listing through draft → published → closed |
| Applications | Apply once per job, track status, withdraw | Review applicants per listing, shortlist or reject |
| Talent pool | — | Browse and filter every candidate open to work, open a full profile, read a résumé |
| Outreach | Receive an invitation email, unsubscribe with one click | Invite a filtered audience to a listing; preview the reach first |
| Notifications | Told when an application's status changes | — |
| Theming | Light and dark, following the OS until overridden | Same |

---

## Architecture

Three services on one Docker network, plus a one-shot seeder and a one-shot replica-set
initialiser that both exit once their work is done.

```
                          Docker network: hire-me_default
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌──────────────────┐        ┌──────────────────┐      ┌────────────────┐  │
│   │    frontend      │        │     backend      │      │     mongo      │  │
│   │                  │        │                  │      │                │  │
│   │  React 19 SPA    │        │  Express 5 API   │      │  MongoDB 7     │  │
│   │  built by Vite   │  HTTP  │  Node 22         │      │  replica set   │  │
│   │  served by nginx │───────▶│                  │─────▶│  rs0           │  │
│   │                  │  :8080 │  /api/v1         │ 27017│                │  │
│   │  nginx:alpine    │        │  node:22-alpine  │      │  mongo:7       │  │
│   └──────────────────┘        └──────────────────┘      └────────────────┘  │
│           │ :8080                      │ :8080                  │           │
│           │                            │                        │           │
│           │                     ┌──────┴───────┐        ┌───────┴───────┐   │
│           │                     │   uploads    │        │  mongo-data   │   │
│           │                     │   (volume)   │        │   (volume)    │   │
│           │                     └──────────────┘        └───────────────┘   │
│           │                                                                 │
│           │                     ┌──────────────┐        ┌───────────────┐   │
│           │                     │     seed     │        │  mongo-init   │   │
│           │                     │  runs once,  │        │  rs.initiate, │   │
│           │                     │  then exits  │        │  then exits   │   │
│           │                     └──────────────┘        └───────────────┘   │
└───────────┼─────────────────────────────────────────────────────────────────┘
            │
      host :5173                                                   host :8080
            │                                                            │
            └──────────────────  your browser  ──────────────────────────┘
```

**How a request flows.** The browser loads the SPA from nginx on `:5173`. The SPA calls
the API directly on `:8080` — it is not proxied, so CORS is configured explicitly and
the API's allowed origin is an environment variable. The API talks to MongoDB by service
name (`mongo:27017`) over the compose network; the database port is published only for
convenience when inspecting it with a GUI.

**Why the database is a replica set.** Employer registration writes the user, the
company and the HR profile in a single transaction, so a failure part-way through cannot
leave an orphaned account. MongoDB only offers transactions on a replica set, so
`mongo-init` runs `rs.initiate()` once before the API boots.

**Startup order** is expressed with healthchecks, not sleeps:

```
mongo (healthy) → mongo-init (completed) → backend (healthy) → frontend
                                                    └───────→ seed → exits
```

Inside each application:

```
backend/src                                  frontend/src
├── config/      env (Zod, fail fast)        ├── app/        providers · router · guards
├── common/      errors · middleware ·       ├── pages/      route-level screens
│                persistence · security      ├── features/   api · hooks · components ·
├── modules/     one folder per domain       │               schemas per feature
├── container/   DI composition root         ├── components/ shared presentational
├── database/    models · seeds              ├── services/   http client · interceptors
├── app.ts       framework wiring only       ├── config/     env (Zod) · constants
└── server.ts    bootstrap only              ├── lib/        pure utilities
                                             └── store/      auth · theme
```

A fuller treatment is in [docs/DESIGN.md](docs/DESIGN.md); the class-level detail is in
[docs/LLD.md](docs/LLD.md).

---

## Running it

### Prerequisites

**Docker Desktop (or Docker Engine) with Compose v2, running.** Nothing else — no Node,
no MongoDB, no npm install.

Verify before you start:

```bash
docker compose version     # expect: Docker Compose version v2.x or later
docker info                # must print server details, not an error
```

If `docker info` errors, the CLI is installed but the **engine is not running** — see
[Docker is not running](#docker-is-not-running) below. On Windows this is usually because
WSL2 is missing, and it is the single most common reason a first
`docker compose up --build` fails.

<details>
<summary><b>Windows — first-time setup (WSL2 required)</b></summary>

Docker Desktop on Windows runs its engine inside **WSL2**, so WSL2 must be installed
before Docker can start. Windows 10 version 2004+ or Windows 11.

1. Open **PowerShell as Administrator** and install WSL2:

   ```powershell
   wsl --install
   ```

   If WSL is already present but out of date:

   ```powershell
   wsl --update
   ```

2. **Restart your machine.** This is not optional — WSL2 is not usable until you do.

3. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
   and launch it. During setup keep **"Use WSL 2 instead of Hyper-V"** ticked.

4. Wait for the whale icon in the system tray to report **"Engine running"**. Docker
   Desktop takes 30–60 seconds to start and the CLI fails until it has.

5. Confirm, then start the stack:

   ```bash
   docker info
   docker compose up --build
   ```

**If `wsl --install` fails**, hardware virtualisation is probably disabled. Check Task
Manager → Performance → CPU → *Virtualization: Enabled*. If it says Disabled, enable
Intel VT-x / AMD-V (often called SVM) in your BIOS/UEFI.

Useful checks:

```powershell
wsl --status         # which version is default, and is a distro installed
wsl -l -v            # installed distros and their WSL version
```

</details>

<details>
<summary><b>macOS</b></summary>

Install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) —
choose the Apple Silicon or Intel build to match your machine — and launch it. No WSL,
no extra steps. Wait for the whale icon to report the engine is running, then:

```bash
docker info
docker compose up --build
```

</details>

<details>
<summary><b>Linux</b></summary>

Install Docker Engine and the Compose plugin from
[docs.docker.com/engine/install](https://docs.docker.com/engine/install/). There is no
Docker Desktop requirement.

```bash
sudo systemctl enable --now docker

# optional: run docker without sudo (log out and back in afterwards)
sudo usermod -aG docker $USER
```

Then `docker compose up --build`. Without the group change, prefix the command with
`sudo`.

</details>

#### Docker is not running

If you see this on `docker compose up --build`:

```
unable to get image 'hire-me-frontend': failed to connect to the docker API at
npipe:////./pipe/dockerDesktopLinuxEngine; check if the path is correct and if the
daemon is running: open //./pipe/dockerDesktopLinuxEngine: The system cannot find
the file specified.
```

…nothing is wrong with this project. The Docker **CLI** is installed but the **engine**
is not reachable. In order of likelihood:

| Cause | Fix |
|---|---|
| Docker Desktop is not running | Launch it; wait for the tray icon to say *Engine running* |
| Docker Desktop is still starting | Give it 30–60 seconds and retry |
| **WSL2 is not installed** (Windows) | `wsl --install` in an admin PowerShell, then **restart** — see the Windows section above |
| WSL2 is installed but outdated | `wsl --update`, then restart Docker Desktop |
| Virtualisation disabled in BIOS | Enable Intel VT-x / AMD-V (SVM), then reinstall WSL2 |
| Linux daemon not started | `sudo systemctl start docker` |

The equivalent message on macOS and Linux is
`Cannot connect to the Docker daemon at unix:///var/run/docker.sock` — same cause, same
fixes.

### Start

```bash
git clone <your-repo-url>
cd hire-me
docker compose up --build
```

First build takes a few minutes while images are pulled and both apps compile. You are
ready when the log shows the API listening and the seeder finishing:

```
hire-me-backend  | {"level":"info","msg":"Server listening","port":8080}
hire-me-seed     | {"level":"info","msg":"Seed complete", ...}
hire-me-seed exited with code 0
```

`hire-me-seed exited with code 0` is expected — it is a one-shot job, not a crash.
So is `hire-me-mongo-init exited with code 0`.

| What | Where |
|---|---|
| **Web UI** | **<http://localhost:5173>** |
| API | <http://localhost:8080/api/v1> |
| **Interactive API docs (Swagger UI)** | **<http://localhost:8080/api/v1/docs>** |
| OpenAPI document | <http://localhost:8080/api/v1/openapi.json> |
| Health | <http://localhost:8080/api/v1/health> |
| MongoDB | `mongodb://localhost:27017` (database `hire_me`) |

No environment configuration is required. Every variable has a working development
default; [Configuration](#configuration) covers overriding them.

### Stop

```bash
docker compose down          # stop, keep the data
docker compose down -v       # stop and delete the database and uploads
```

The seeder is additive and re-runnable, so `docker compose up` again after a `down` will
not duplicate anything.

### Running without Docker

Only useful for development — Docker is the supported path.

```bash
# 1. MongoDB as a replica set
docker compose up mongo mongo-init

# 2. API on :8080
cd backend && cp .env.example .env && npm install && npm run dev
npm run seed            # optional: the demo dataset

# 3. SPA on :5173
cd frontend && cp .env.example .env && npm install && npm run dev
```

---

## Test credentials

Seeded automatically. Both roles are ready to use on first boot.

| Role | Email | Password |
|---|---|---|
| **HR / Employer** | `admin@test.com` | `Admin@1234` |
| **Candidate** | `user@test.com` | `User@1234` |

> Sign-in is **role-scoped**: employers sign in through the employer tab, candidates
> through the candidate tab. Presenting a candidate's correct password on the employer
> tab fails exactly like a wrong password — this is deliberate, see
> [Security notes](#security-notes).

The rest of the demo dataset — **7 employers, 41 listings, 25 candidates, 54
applications** — shares one password, `Demo@1234`, so you can sign in as any of them:

| Sample account | Role | Password |
|---|---|---|
| `admin@test.com` | Employer at Meridian Technologies | `Admin@1234` |
| `grace@nimbuslabs.test` | Employer at Nimbus Labs | `Demo@1234` |
| `raj@aetheranalytics.test` | Employer at Aether Analytics | `Demo@1234` |
| `user@test.com` | Candidate | `User@1234` |
| `ada@example.com` | Candidate | `Demo@1234` |
| `kiran@example.com` | Candidate | `Demo@1234` |

These are demo credentials for an assessment environment. No real or sensitive data is
used anywhere in this repository, and the seeder **refuses to run** when `NODE_ENV` is
`production` precisely because a shared, committed password would otherwise become a
real one.

---

## Feature walkthrough

### As a candidate — sign in as `user@test.com` / `User@1234`

You land on **Jobs**, which is the point of the account.

1. **Find a role** — `/jobs`
   One search box spans the title, description, skills, locations, role *and* the
   employer's name, matched word by word. **Filters** sit beside the results: role,
   job type, work mode, location, skills, CTC range and experience. Active filters
   appear as removable chips, so a narrow result never looks like a bug. Filters live in
   the URL, so a search is shareable and survives a reload.

2. **Read a listing** — click any card
   Full description, responsibilities, qualifications, pay band, the employer's profile
   and links, and **similar roles** at the bottom. Jobs you have already applied to are
   marked as such in the list, so you never apply twice by accident.

3. **Apply** — the button on a listing
   Optional cover note. Your résumé is **snapshotted** at submission: later profile edits
   never rewrite an application an employer has already read. Applying twice is refused.

4. **Track applications** — `/applications`
   Every application with its current status. You can **withdraw** from here; withdrawal
   is terminal.

5. **Get told what happened** — the bell in the header
   When an employer shortlists or rejects you, a notification is waiting on your next
   page load. Click it to jump to the application.

6. **Build the profile** — `/profile`
   Personal details, job preferences, and a **live completion score** that names exactly
   what is still missing. Add work experience, education, certifications and projects;
   upload a profile photo and a résumé. A fuller profile is what puts you in an
   employer's talent-pool results.

7. **Unsubscribe** — the link in any outreach email
   Opts you out of employer email without signing in.

### As an employer — sign in as `admin@test.com` / `Admin@1234`

You land on the **talent pool**, because that is what an employer came for.

1. **Browse candidates** — `/candidates`
   Every candidate open to work, filtered by skill, location and job type, with the same
   search-and-chips behaviour as the job list.

2. **Open a candidate** — click a card
   Their full profile: experience, education, projects, certifications, skills — and
   their **résumé**, readable in the browser.

3. **Post a job** — `/hr/jobs` → *Post a job*
   Title, description, responsibilities, qualifications, role, type, work mode, skills,
   locations, pay band and experience range. Created as a **draft**, visible to nobody
   outside your company until you publish it.

4. **Manage listings** — `/hr/jobs`
   Your company's postings, drafts included. Move each through
   **draft → published → closed**, and reopen a closed one. Illegal moves are refused.

5. **Review applicants** — *Applicants* on any listing
   Everyone who applied, filterable by status, each with the résumé they applied with.
   **Shortlist** or **reject** — the candidate is notified either way. The applicant card
   is deliberately narrow: name, location, skills, photo. Never a date of birth, a mobile
   number or a salary expectation.

6. **Invite candidates by email** — `/hr/outreach`
   Choose one of your listings, describe the audience with the same filters as the talent
   pool, **preview how many people it reaches**, then queue the campaign. A background
   worker sends in batches. Anyone who has opted out is skipped automatically, and both
   per-campaign and daily ceilings apply so the feature cannot become a spam cannon.
   With the default `MAIL_DRIVER=log`, messages are written to the backend log rather
   than sent — see [Outreach email](#outreach-email).

7. **Company profile** — `/profile`
   Your details and your company's: description, logo, website, social links, address.

### Things worth trying either way

- **Toggle the theme** in the header. Light and dark are one token layer, so the switch
  repaints instantly.
- **Try the API directly** at <http://localhost:8080/api/v1/docs>. Call
  `/candidate/login`, copy `data.accessToken`, press **Authorize**, and every endpoint is
  live.
- **Reload any page.** The session is restored from the refresh cookie, and filters come
  back from the URL.
- **Ask for something that is not yours** — another company's draft listing, another
  candidate's file. You get a 404, not a 403.

---

## API

Base path `/api/v1`. Full interactive reference: **<http://localhost:8080/api/v1/docs>**.

The OpenAPI document is **generated from the Zod schemas the API validates with**,
converted to JSON Schema at boot. The documentation cannot drift from the implementation
because there is no second copy to keep in step, and an integration test fires every
documented path at the running application to prove each one exists.

Every response uses one envelope:

```jsonc
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "JOB_NOT_FOUND", "message": "…", "details": [] } }
```

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/candidate/register` · `/hr/register` | — | Create an account (HR sign-up creates the company transactionally) |
| POST | `/candidate/login` · `/hr/login` | — | Role-scoped sign-in |
| POST | `/refresh` · `/logout` | cookie | Rotate the session · revoke it |
| GET | `/me` | access | The signed-in account |
| GET/PUT | `/profile` | access | Role-dispatched profile and completion |
| POST/GET/PUT | `/company…` | HR | Register, read, update the company |
| GET/POST | `/jobs` | access / HR | Browse published listings · post a draft |
| GET | `/jobs/mine` · `/jobs/skills` | HR / access | Own postings incl. drafts · skill vocabulary |
| GET/PUT/PATCH | `/jobs/:id[/status]` | access / HR owner | Detail · update · lifecycle |
| POST | `/jobs/:id/apply` | candidate | Apply once; résumé snapshotted |
| GET | `/jobs/:id/applications` | HR owner | Applicants for that listing |
| GET | `/applications` · `/applications/job-ids` | candidate | Own applications |
| PATCH | `/applications/:id/status` | both | HR shortlists/rejects; candidate withdraws |
| GET | `/candidates` · `/candidates/:userId` | HR | Talent pool · one candidate in full |
| GET/POST | `/outreach/campaigns[/preview]` | HR | List · preview reach · queue a campaign |
| POST | `/outreach/unsubscribe` | — | Opt out from an email link |
| GET/PATCH | `/notifications[/read]` | access | Inbox and unread count · mark read |
| GET/POST/PUT/DELETE | `/experience` · `/education` · `/certification` · `/project` | candidate | Profile sections |
| POST/GET | `/files[/:id]` | access | Upload · stream to whoever may read it |
| GET | `/health` | — | Liveness and a database ping |

---

## Tech stack

### Backend

| Concern | Choice | Why |
|---|---|---|
| Runtime | Node.js 22 LTS, TypeScript 5.9 (`strict`) | — |
| HTTP | Express 5 | Native async error propagation, so no try/catch in controllers |
| Database | MongoDB 7 + Mongoose 8 | Document shape suits nested profiles; transactions via replica set |
| Validation | **Zod 4** | One schema per contract; types inferred, never hand-written |
| Auth | `jsonwebtoken`, `bcryptjs` | Access + rotating refresh tokens |
| Security | `helmet`, `cors`, `express-rate-limit` | Headers, origin allowlist, request ceilings |
| Uploads | `multer` | Behind a storage port, so the disk is swappable |
| Logging | `pino` | Structured JSON behind an `ILogger` interface |
| API docs | `swagger-ui-express` + Zod → JSON Schema | Contract generated from the validators |
| Tests | Vitest, Supertest, `mongodb-memory-server` | Real replica set in-process |

### Frontend

| Concern | Choice | Why |
|---|---|---|
| Framework | React 19, TypeScript 5.9 (`strict`) | — |
| Build | Vite 7 | — |
| Routing | React Router 7 | — |
| Server state | TanStack Query 5 | Caching, invalidation, request dedup |
| Client state | Zustand 5 | Auth and theme only |
| Forms | React Hook Form + Zod resolver | Same schema language as the backend |
| HTTP | Axios | One interceptor for refresh-and-retry |
| Styling | Tailwind CSS 4 | Semantic tokens; no `dark:` variant anywhere |
| Tests | Vitest, React Testing Library, MSW, `axios-mock-adapter` | Behaviour, not implementation |

### Tooling

ESLint 9 (`strict-type-checked`) · Prettier · Docker multi-stage builds · Docker Compose
· nginx (static runtime for the SPA).

---

## Testing and quality gates

```bash
cd backend  && npm run lint && npm run typecheck && npm run test:cov
cd frontend && npm run lint && npm run typecheck && npm run test:cov
```

Every command must exit 0. Coverage thresholds — statements, branches, functions and
lines — are set to **90%** in each test config, so the suite *fails* below them, and
coverage is never raised by excluding real code.

- **Backend** — unit tests inject mocks through constructors, so nothing is
  monkey-patched. Repository and route tests run against `mongodb-memory-server` in
  replica-set mode and are driven with Supertest, exercising the real transaction, the
  real indexes and the real middleware chain.
- **Frontend** — React Testing Library with the transport stubbed at the axios layer.
  Tests assert what a user can observe: validation messages, guard redirects,
  refresh-and-retry, upload flows, filter behaviour and completion updates.
- **Contract** — every path in the OpenAPI document is fired at the running application,
  so a documented endpoint that does not exist fails the build.

Unhappy paths are covered explicitly: duplicate email, bad credentials, replayed refresh
tokens, wrong role, another user's record, invalid status transitions, oversized or
wrong-typed uploads, and rollback of a failed employer registration.

---

## Security notes

- **Passwords** are bcrypt-hashed at cost 12 and must be 8+ characters with upper, lower,
  digit and symbol. The hash never leaves the repository layer.
- **Access tokens** are short-lived (15 min) and held **in memory only** on the client, so
  an XSS cannot read one from storage. The **refresh token** is an `httpOnly`, `sameSite`
  cookie scoped to `/api/v1`.
- **Refresh rotation with theft detection** — every refresh mints a new token and revokes
  the old one. Replaying a spent token revokes the entire family, ending every session
  descended from it. Only a SHA-256 digest is stored, never the token.
- **Role-scoped sign-in** — each role has its own login path and refuses the other's
  accounts, answering the same generic `INVALID_CREDENTIALS` as a wrong password, with no
  session and no `lastLoginAt` write. The endpoint cannot be used to discover which role
  an email belongs to.
- **404, never 403, for another user's data** — a record you do not own is indistinguishable
  from one that does not exist, so the API cannot be used to probe for other accounts.
  `403` is reserved for the wrong *account type*.
- **Ownership comes from the session** — a listing's `companyId` is taken from the
  poster's own membership and a `companyId` in the request body is ignored.
- **Races are closed in the database** — one application per candidate per job is a unique
  index, not a read-then-write check, so two concurrent requests cannot both pass.
- **Least-privilege payloads** — the applicant card an employer sees never carries a
  candidate's date of birth, mobile number or salary expectations.
- **File access is decided by policy, per request** — the owner may always read their own
  file. An employer may additionally read any candidate's *résumé or photo*, which is a
  deliberate boundary matching the talent pool that already shows every candidate to every
  employer; a company logo stays readable only by its owner. Each reason to allow a
  download is a separate policy class, so a new audience is a new class rather than another
  branch.
- **Validated twice, deliberately** — forms validate before submitting and the API
  validates again. The server is always the authority.
- **Env parsed and frozen at boot** — an invalid environment aborts startup rather than
  failing later, and `process.env` is read in exactly one file. Production refuses to boot
  on a default unsubscribe secret.
- **Hardened transport** — helmet, an explicit CORS origin allowlist, a global rate limit
  plus a tighter one on credential and bulk-email endpoints, and a 1 MB body cap.
- **Nothing leaks** — stack traces, driver messages and SQL never reach a client; they are
  logged against a request id instead.
- **Containers run as non-root**, with no dev dependencies and no source in the runtime
  image.

---

## Configuration

Nothing needs configuring to run the project. Every variable has a development default
baked into `docker-compose.yml`.

To override any of them, copy the root example and edit it — Compose picks it up
automatically:

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
|---|---|---|
| `JWT_ACCESS_SECRET` | dev value | Signs access tokens. Min 32 chars |
| `JWT_REFRESH_SECRET` | dev value | Signs refresh tokens. Min 32 chars |
| `UNSUBSCRIBE_SECRET` | dev value | Signs unsubscribe links. Min 32 chars |
| `MAIL_DRIVER` | `log` | `log` writes email to the log; `resend` sends it |
| `RESEND_API_KEY` | empty | Required when `MAIL_DRIVER=resend` |
| `MAIL_FROM_EMAIL` | `onboarding@resend.dev` | Sender address |
| `MAIL_REDIRECT_TO` | empty | Send every outreach email here instead of its real recipient |

The compose defaults are published in this repository, which makes them public knowledge
and therefore not secrets. They are appropriate for an assessment on a laptop and
inappropriate anywhere reachable. `backend/.env.example` documents the full set —
every backend variable is validated by a Zod schema at boot, and an invalid one aborts
startup.

### Outreach email

Outreach ships with `MAIL_DRIVER=log`, so campaigns are fully explorable with no email
account anywhere: queue one, then watch the rendered message appear in the backend log.

```bash
docker compose logs -f backend
```

To send for real, set `MAIL_DRIVER=resend` and `RESEND_API_KEY` in `.env`. Until a
sending domain is verified, most providers only accept mail addressed to the account's
own address — set `MAIL_REDIRECT_TO` to route every message there.

---

## Known limitations

Scoped out deliberately, not overlooked.

**Not built**

- **No email verification, and no forgot/reset password.** Both need the same delivery
  path outreach already has, but neither adds anything to what is being assessed.
- **An employer cannot join an existing company.** Every HR sign-up creates a new one.
  There is no invitation flow, so two colleagues cannot yet share a company's listings —
  the data model supports it (`companyRole` is already `owner | member`), the UI does not.
- **Skills are free text**, not a curated taxonomy. "React" and "ReactJS" are different
  skills. The filter is fed by the distinct skills actually in use, which contains the
  problem without solving it.
- **No admin role.** Two roles were required; a third would be more of the same.

**Deliberate trade-offs**

- **Job search is a case-insensitive regex, not a text index.** Search spans the
  employer's name as well as the listing, which means an `$or`, and MongoDB's `$text` may
  not appear inside one. Correct and fast enough at this size; at a much larger one it
  wants Atlas Search or an external index.
- **Notifications are polled on page load, not pushed.** They are durable rows read when
  the shell mounts — no socket, no interval. A notification raised while you sit on a page
  appears on the next navigation rather than instantly.
- **Files are stored on a local volume.** Storage sits behind an adapter, so S3 is a new
  class rather than a refactor, but the container currently owns its uploads and would not
  scale horizontally without swapping it.
- **The outreach worker runs in the API process.** A 5-second interval over a Mongo-backed
  queue, not a real broker. It is safe for concurrent instances (batches are claimed
  atomically), but a dedicated worker is the honest answer at volume.
- **Single-node replica set.** Required for transactions, but a real deployment wants a
  real one.
- **No CI pipeline is included.** The quality gates exist and pass as documented
  commands; nothing runs them automatically on push.

**Assessment-environment caveats**

- **Demo secrets are committed** as compose defaults so `docker compose up --build` works
  with zero configuration. A production deployment must override all three; the API
  already refuses to boot in production on a default unsubscribe secret.
- **`COOKIE_SECURE=false`** so the refresh cookie works over plain HTTP on localhost.
  Any real deployment sets it to `true`.
- **MongoDB's port is published** to the host for convenience. It would not be exposed
  in a real deployment.

---

## Further documentation

| Document | What is in it |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Product specification: roles, user stories, functional and non-functional requirements, acceptance criteria |
| [docs/DESIGN.md](docs/DESIGN.md) | High-level design: architecture, layering, request lifecycle, key decisions and their trade-offs |
| [docs/SCHEMA.md](docs/SCHEMA.md) | Database schema: every collection, field, index and relationship, with the reasoning behind each index |
| [docs/LLD.md](docs/LLD.md) | Low-level design: module-by-module classes, interfaces, DI wiring and algorithms |
| [CLAUDE.md](CLAUDE.md) | The engineering rules this repository is held to |
| <http://localhost:8080/api/v1/docs> | Interactive API reference (running stack) |

---

## Notes on building this with Claude Code

`CLAUDE.md` at the repository root is the rulebook the assistant worked against —
SOLID boundaries, the repository pattern, DI through interfaces, Zod as the only
validation library, tests alongside every function, and a 90% coverage floor. Keeping the
standard in the repository rather than in a prompt is what made the codebase consistent
across sessions: it is re-read on every task, so module twelve looks like module one.

Two practices did most of the work. First, treating the rules as a **quality gate that
fails**, not advice — lint, typecheck and coverage thresholds are enforced by the tooling,
so a violation stops the build rather than surviving in review. Second, **generating
rather than duplicating**: the OpenAPI document is built from the same Zod schemas the API
validates with, and the four profile sections share one generic stack, so there is
materially less code to keep correct.

Where the tool needed the most supervision was in accepting a plausible-looking
abstraction too early, and in test coverage that exercised a happy path while leaving the
error branch untested. Both are caught by asking for the unhappy paths explicitly and by
enforcing branch coverage rather than line coverage alone.
