# Hire Me — Job Portal

A job portal for two audiences: **candidates** looking for a role and **HR/employers**
looking to hire. This phase delivers registration, authentication and the profile
experience for both roles.

```
/
├── backend/            # Node.js + TypeScript + Express + MongoDB API
├── frontend/           # React + TypeScript + Vite SPA
├── docker-compose.yml  # mongo (replica set) + backend + frontend
└── CLAUDE.md           # engineering rules this repo is held to
```

The two applications are fully independent: neither imports from the other, and each
owns its `package.json`, `tsconfig.json`, lint config, test config and `Dockerfile`.

---

## What is in this phase

| Area | Delivered |
|---|---|
| Registration | Candidate sign-up; HR sign-up that creates the employer's company in the same transaction |
| Authentication | Sign in, sign out, session restore, rotating refresh tokens |
| Profile | Personal details, job preferences, résumé, company details, live completion score |
| Profile sections | Experience, education, certifications and projects (full CRUD) |
| Files | Profile photo, résumé and company logo upload behind a swappable storage adapter |
| Job listings | HR posts jobs for their company; candidates browse and filter by role, type, work mode, location, skills, CTC and experience |

Deferred to a later phase: email verification, forgot/reset password, HR joining an
existing company, and a curated skills list.

---

## Running it

### With Docker (everything at once)

```bash
docker compose up --build
```

- Frontend → <http://localhost:5173>
- API → <http://localhost:8080/api/v1>
- Health → <http://localhost:8080/api/v1/health>

MongoDB starts as a **single-node replica set**. This is not optional: HR registration
writes the user, the company and the HR profile in one transaction, and MongoDB only
offers transactions on a replica set. A one-shot `mongo-init` service runs
`rs.initiate()` before the API boots.

### Locally

```bash
# MongoDB (replica set) only
docker compose up mongo mongo-init

# API — http://localhost:8080
cd backend && cp .env.example .env && npm install && npm run dev

# SPA — http://localhost:5173
cd frontend && cp .env.example .env && npm install && npm run dev
```

---

## Quality gates

Both applications enforce the same bar. Every command must exit 0.

```bash
cd backend  && npm run lint && npm run typecheck && npm run test:cov
cd frontend && npm run lint && npm run typecheck && npm run test:cov
```

Coverage thresholds (statements, branches, functions, lines) are set to 90% in each
test config, so the suite fails below them.

---

## API

Base path `/api/v1`. Every response uses one envelope:

```jsonc
{ "success": true,  "data": { } }
{ "success": false, "error": { "code": "USER_NOT_FOUND", "message": "…", "details": [] } }
```

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/candidate/register` | — | Create a candidate account |
| POST | `/hr/register` | — | Create an HR account **and** its company |
| POST | `/candidate/login` | — | Sign a **candidate** in; access token in the body, refresh token in an httpOnly cookie |
| POST | `/hr/login` | — | Sign an **HR** in; same response shape |
| POST | `/refresh` | cookie | Rotate the refresh token, issue a new access token |
| POST | `/logout` | cookie | Revoke the session |
| GET | `/me` | access | The signed-in account |
| GET | `/profile` | access | Role-dispatched profile + completion breakdown |
| PUT | `/profile` | access | Role-dispatched partial update |
| POST | `/company/register` | HR | Register a company for an HR that has none |
| GET | `/company/:id` | access | Company detail |
| PUT | `/company/:id` | HR owner | Update the company |
| GET | `/jobs` | access | Browse **published** listings; filters + pagination |
| POST | `/jobs` | HR | Post a job for the caller's own company (created as a draft) |
| GET | `/jobs/mine` | HR | The caller's company postings, drafts included |
| GET | `/jobs/:id` | access | Listing detail; drafts visible only to their own company |
| PUT | `/jobs/:id` | HR owner | Update the listing |
| PATCH | `/jobs/:id/status` | HR owner | `draft → published → closed`, and reopen |
| GET/POST | `/experience` | candidate | List / create |
| PUT/DELETE | `/experience/:id` | candidate | Update / delete |
| … | `/education`, `/certification`, `/project` | candidate | Identical shape |
| POST | `/files` | access | Multipart upload → `{ fileId }` |
| GET | `/files/:id` | access | Stream the file to its owner |
| GET | `/health` | — | Liveness + database ping |

Validation failures return **422** with per-field details. A record owned by another
user returns **404**, never 403, so the API cannot be used to probe for other accounts.

Job listings are owned by a **company**, never by an email. A posting's `companyId` is taken
from the poster's own membership and a `companyId` in the request body is ignored, so one HR
cannot post under another company. Another company's listing answers **404**, and a draft is
invisible outside the company that owns it.

Sign-in is **role-scoped**: each role has its own path and refuses the other's accounts.
A candidate presenting correct credentials to `/hr/login` gets the same generic
`INVALID_CREDENTIALS` 401 as a wrong password — no session, no cookie, no `lastLoginAt` —
so the endpoint cannot be used to discover which role an email belongs to.

---

## Architecture

### Backend

```
src/
├── config/       env (Zod, fail-fast) · constants · logger
├── common/       errors · middlewares · persistence · http · security · utils · validation
├── modules/      auth · user · profile · candidate · hr · company · file · health
│                 experience · education · certification · project
├── container/    typed DI tokens + the composition root
├── database/     connection · models · transaction manager
├── app.ts        framework wiring only
└── server.ts     bootstrap only
```

Notable decisions:

- **Repository pattern** — Mongoose appears only inside `*.repository.ts`. Services and
  controllers depend on interfaces.
- **Dependency injection** — constructor injection everywhere; concrete classes are
  known only to `src/container/index.ts`.
- **Strategy for profiles** — `GET`/`PUT /profile` dispatch to a per-role strategy, so
  adding a role means adding a class, not an `if`.
- **Adapters** — password hashing, JWTs and file storage sit behind ports, so bcrypt,
  jsonwebtoken and the local disk can each be swapped without touching a service.
- **Unit of work** — transactions are expressed through `ITransactionManager`; no
  driver session ever reaches a service signature.
- **One generic owned-resource stack** — experience, education, certification and
  project share a repository base, a service and a controller. Each module only
  declares its schema, its mapper and its route table.

### Frontend

```
src/
├── app/          providers · router · guards · layout
├── pages/        route-level screens (composition only)
├── features/     auth · profile · sections (api / hooks / components / schemas)
├── components/   shared, presentational building blocks
├── services/     http client, refresh interceptor, typed request helper
├── config/       env (Zod) · constants
├── lib/          pure utilities
└── store/        auth store (access token in memory)
```

Notable decisions:

- **Session handling** — the access token lives in memory only, so an XSS cannot read
  it; the refresh token is an httpOnly cookie. A single-flight interceptor refreshes
  and retries once on a 401.
- **Validation twice, deliberately** — forms validate with Zod before submitting, and
  the API validates again. The server is always the authority.
- **Every response is parsed** at the boundary; the rest of the app trusts the
  inferred types.
- **The four profile sections share one implementation** — a config object per section
  supplies its schema, mapping and fields; the list, modal, cache handling and API
  client are written once.

---

## Testing

- **Backend** — Vitest. Unit tests inject mocks through constructors. Repository and
  route tests run against `mongodb-memory-server` in replica-set mode and are driven
  with Supertest, so the transaction, the indexes and the middleware chain are all
  exercised for real.
- **Frontend** — Vitest + React Testing Library, with the transport stubbed at the
  axios layer. Tests assert behaviour a user can observe: validation messages, guard
  redirects, refresh-and-retry, upload flows and completion updates.

Unhappy paths are covered explicitly: duplicate email, bad credentials, replayed
refresh tokens, wrong role, another user's record, oversized or wrong-typed uploads,
and rollback of a failed HR registration.
