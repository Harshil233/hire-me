# Hire Me — High-Level Design

> **Companion documents:** [SPEC.md](SPEC.md) (what it must do), [SCHEMA.md](SCHEMA.md)
> (what is stored), [LLD.md](LLD.md) (class-level detail).

---

## 1. Overview

Two independent applications and a database, orchestrated by Docker Compose.

- **`backend/`** — a Node.js + TypeScript REST API over MongoDB.
- **`frontend/`** — a React + TypeScript single-page application.
- **MongoDB** — a single-node replica set.

The two applications never import from each other. Shared contracts (roles, statuses,
enumerations) are **duplicated deliberately** on the frontend as `config/constants.ts`,
because a relative import across the folder boundary would couple two things that must be
independently deployable. The duplication is small, frozen, and caught by the API's own
validation the moment it drifts.

---

## 2. Deployment topology

```
                          Docker network: hire-me_default
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                                                                  │
│  ┌────────────────────┐      ┌─────────────────────┐     ┌────────────────────┐  │
│  │  frontend          │      │  backend            │     │  mongo             │  │
│  │  nginx:alpine      │─────▶│  node:22-alpine     │────▶│  mongo:7           │  │
│  │  static SPA        │ HTTP │  Express 5          │ TCP │  replica set rs0   │  │
│  │  non-root, :8080   │      │  non-root, :8080    │     │  :27017            │  │
│  │  HEALTHCHECK       │      │  HEALTHCHECK        │     │  HEALTHCHECK       │  │
│  └────────────────────┘      └─────────────────────┘     └────────────────────┘  │
│                                        │                           │             │
│                                  ┌─────┴──────┐            ┌───────┴────────┐    │
│                                  │  uploads   │            │  mongo-data    │    │
│                                  │  volume    │            │  volume        │    │
│                                  └────────────┘            └────────────────┘    │
│                                                                                  │
│  One-shot jobs, exit 0 when done:                                                │
│  ┌────────────────────┐      ┌─────────────────────┐                             │
│  │  mongo-init        │      │  seed               │                             │
│  │  rs.initiate()     │      │  demo dataset       │                             │
│  └────────────────────┘      └─────────────────────┘                             │
└──────────────────────────────────────────────────────────────────────────────────┘
        host :5173                    host :8080                 host :27017
```

### 2.1 Startup ordering

Expressed with conditions, never with sleeps:

```
mongo ──(service_healthy)──▶ mongo-init ──(service_completed_successfully)──▶ backend
                                                                                │
                                                          (service_healthy) ────┼──▶ frontend
                                                                                └──▶ seed ──▶ exit 0
```

`backend`'s healthcheck hits `/api/v1/health`, which pings the database — so "healthy"
means *the API can serve*, not merely *the process started*.

### 2.2 Images

Both are multi-stage: `deps → build → runtime`. The runtime layer carries no dev
dependencies, no TypeScript sources and no test files, and runs as a non-root user. The
API image adds `tini` as PID 1 to reap zombies, and `wget` to back the healthcheck. The
SPA is compiled to static files and served by nginx on an unprivileged port.

The SPA's API base URL is a **build argument**, not a runtime variable — a static bundle
has no server to read the environment at request time, so the value is baked in at build.

### 2.3 Persistence

Two named volumes: `mongo-data` for the database and `uploads` for stored files. Both
survive `docker compose down`; `down -v` removes them.

---

## 3. Backend architecture

### 3.1 Layering and the dependency rule

```
   HTTP in
      │
      ▼
┌──────────────┐   Parses the request, calls one service, shapes the response.
│  Controller  │   No business rules. No database. No try/catch — Express 5
└──────┬───────┘   propagates rejections to the error middleware on its own.
       │  depends on I<Module>Service
       ▼
┌──────────────┐   Every business rule lives here: authorisation beyond role,
│   Service    │   state transitions, cross-module orchestration, transactions.
└──────┬───────┘   Knows nothing about HTTP or Mongoose.
       │  depends on I<Module>Repository
       ▼
┌──────────────┐   The only place Mongoose appears. Takes and returns domain
│  Repository  │   types; driver documents never escape.
└──────┬───────┘
       │
       ▼
   MongoDB
```

**Dependencies point inward, and only at interfaces.** A service holds an
`IJobRepository`, never a `JobRepository`. Concrete classes are known to exactly one
file — `src/container/index.ts`, the composition root.

The practical payoff is in the tests: a unit test constructs the real service with fake
collaborators passed to its constructor. Nothing is monkey-patched and no module is
mocked. If a test *needs* module mocking to work, that is a design defect, not a testing
problem.

### 3.2 Module layout

One folder per domain concept, each self-contained:

```
modules/<module>/
├── <module>.controller.ts   HTTP ↔ service translation
├── <module>.service.ts      business rules
├── <module>.repository.ts   persistence, the only Mongoose consumer
├── <module>.schema.ts       Zod schemas + inferred types
├── <module>.validator.ts    middleware applying those schemas
├── <module>.mapper.ts       document → domain → response shaping
├── <module>.interface.ts    I<Module>Service, I<Module>Repository, DI tokens
├── <module>.routes.ts       path → guard → validator → controller
└── __tests__/
```

Modules present: `auth`, `user`, `profile`, `candidate`, `hr`, `company`, `job`,
`application`, `notification`, `outreach`, `file`, `experience`, `education`,
`certification`, `project`, `health`, `docs`.

**A module never imports another module's repository.** Cross-module work goes
service → service through the other module's interface. When the job service needs to
resolve an employer name for a search, it asks the company module — it does not read the
`companies` collection.

### 3.3 Request lifecycle

```
request
  │
  ├─ helmet                  security headers
  ├─ cors                    origin allowlist, credentials enabled
  ├─ express.json            1 MB ceiling
  ├─ cookieParser            refresh cookie
  ├─ requestId               correlation id, attached to every log line
  ├─ rateLimit               global ceiling
  │
  ├─ router /api/v1
  │    ├─ authenticate       verifies the bearer token, attaches req.auth
  │    ├─ authorize(role)    wrong account type → 403
  │    ├─ validate(schema)   body/params/query → 422 with per-field detail
  │    └─ controller ─▶ service ─▶ repository ─▶ MongoDB
  │
  ├─ notFoundHandler         unmatched path → ROUTE_NOT_FOUND
  └─ errorHandler            the only place a response is formatted
```

Guards are ordered **cheapest first**: identity before role before shape before business
rules. An unauthenticated request never reaches a Zod parse, and an invalid body never
reaches the database.

### 3.4 Error handling

One `AppError` hierarchy (`ValidationError`, `UnauthorizedError`, `ForbiddenError`,
`NotFoundError`, `ConflictError`, `PayloadTooLargeError`, `InternalError`), each carrying
an HTTP status and a **stable error code** that is never renamed once shipped.

A single middleware normalises everything thrown anywhere in the pipeline — including
`ZodError`, Multer errors and Mongo duplicate-key failures — into one envelope:

```jsonc
{ "success": false, "error": { "code": "ALREADY_APPLIED", "message": "…", "details": [] } }
```

Faults at 500 and above are logged with the request id and a stack; the client gets a
generic message. Nothing else in the codebase formats an error response.

**Duplicate-key translation is load-bearing, not cosmetic.** "Apply once per job" is a
unique index rather than a read-then-write check, so the error middleware turning
`E11000` into a 409 is what closes the race.

### 3.5 Validation

Zod is the only runtime validation library, and types are always inferred with
`z.infer` — never hand-written alongside a schema.

Each schema is used **three times**: as request validation middleware, as the source of
the TypeScript type the controller and service pass around, and as the source of the
published OpenAPI schema. One definition, three consumers, no drift.

### 3.6 Configuration

`config/env.ts` is the only file in the codebase that reads `process.env`. It parses the
environment through a Zod schema at boot and **throws and exits** on failure — an
environment that is wrong fails at startup rather than at the first request that needs the
value. The parsed object is frozen and injected.

`config/constants.ts` holds frozen `as const` values: roles, statuses, transition maps,
validation limits, completion weights, collection names. No magic strings in business
logic.

---

## 4. Cross-cutting design decisions

### 4.1 Authentication and session handling

```
  POST /candidate/login
        │
        ▼
  ┌─────────────────────────────────────────────┐
  │ access token   JWT, 15 min                  │──▶ response body
  │                                             │    kept in memory only
  │ refresh token  JWT, 7 days, family id       │──▶ httpOnly cookie
  │                SHA-256 digest persisted     │    path=/api/v1
  └─────────────────────────────────────────────┘
```

- The access token never touches `localStorage`, so an XSS cannot read one.
- Only a **digest** of the refresh token is stored; a database dump does not yield usable
  sessions.
- Every refresh **rotates**: new token issued, old one revoked, same family.
- Presenting an already-rotated token means one of two things — a race, or theft. Both are
  handled by revoking the **whole family**, ending every session descended from that
  sign-in.

**Trade-off:** in-memory access tokens mean a page reload has no token until the silent
refresh completes, so the client shows a brief loading state on boot. That is the cost of
not putting a bearer token where a script can read it, and it is worth paying.

### 4.2 Authorisation, in three distinct layers

| Layer | Question | Failure |
|---|---|---|
| `authenticate` | Is this a valid session? | 401 |
| `authorize(role)` | Is this the right *account type*? | 403 |
| Service | Does this *particular* record belong to you? | **404** |

The third answering 404 rather than 403 is deliberate: a 403 confirms the record exists,
which turns any id endpoint into an oracle for enumerating other people's data.

### 4.3 Transactions as a unit of work

Employer registration writes a user, a company and an HR profile. Either all three exist
or none do.

Services depend on `ITransactionManager` and receive an **opaque `TransactionContext`**
which they hand to repositories. A Mongoose `ClientSession` never appears in a service
signature — so the business rule "these three writes are atomic" is expressed without the
service knowing which database is underneath.

### 4.4 Extension through strategies, not branches

Three places would otherwise have grown a `switch`:

| Concern | Mechanism | Adding a case means |
|---|---|---|
| Role-specific profiles | `IProfileStrategy` per role, resolved from a map | Register one strategy |
| File download permission | `IFileAccessPolicy` list; allowed if any policy allows | Add one policy class |
| Status transitions | Frozen transition + actor maps | Edit one frozen map |

`GET /profile` returns a candidate profile or an employer profile with no conditional in
the service — it resolves the strategy for the caller's role and delegates. A third role
would be a new class and one registration.

### 4.5 One generic stack for four resources

Experience, education, certification and project are the same shape: a candidate-owned
list with full CRUD. They share **one** repository base, **one** service and **one**
controller, generic over their entity and input types. Each module supplies only its Zod
schema, its mapper and its route table.

This is where a naïve implementation would have four near-identical copies of the same
ownership check — and where a bug fixed in one copy survives in three.

### 4.6 Ports and adapters at the edges

Password hashing (bcrypt), token signing (jsonwebtoken), file storage (local disk) and
email delivery (log / Resend) each sit behind a narrow interface. Services depend on the
port; the composition root picks the adapter.

Two payoffs: unit tests inject a fake with no I/O, and swapping the disk for S3 or Resend
for SES is a new class plus one line in the container.

`MAIL_DRIVER=log` is not a test double — it is a real adapter that renders the message and
writes it to the log, so the whole outreach path is exercisable with no provider account
anywhere.

### 4.7 Outreach: queued, not inline

```
POST /outreach/campaigns
     │
     ├─ resolve audience → recipient rows (status: queued)   ─┐
     └─ 201 with the campaign                                 │  request ends here
                                                              │
   worker (every 5s, in-process)                              │
     ├─ claimNextQueuedCampaign()   atomic claim              │
     ├─ takeQueuedRecipients(batch) ◀──────────────────────────┘
     ├─ send, mark each row sent | failed | skipped
     └─ refreshCampaignTotals()
```

Two hundred messages would outlast any sensible request timeout, and a crash halfway
through must be resumable rather than silently partial. Marking each recipient row as it
goes means a restart resumes exactly where it stopped and never sends twice.

**Trade-off:** the worker runs inside the API process. Two instances would each poll, and
the atomic claim is what stops them sending the same campaign twice — correct, but a
dedicated worker with a real broker is the honest answer at volume. Recorded in the
README's known limitations.

### 4.8 Documentation generated, not maintained

The OpenAPI document is built at boot by converting the same Zod schemas the routes
validate with into JSON Schema. A renamed field changes the published contract on the next
boot, because there is no second copy to update.

Paths are the one part still written by hand, so an integration test fires **every**
documented path and method at the running application and fails if any returns
`ROUTE_NOT_FOUND`.

---

## 5. Frontend architecture

### 5.1 Structure

```
src/
├── app/          providers · router · route guards · shell layout
├── pages/        route-level screens — composition only
├── features/     one folder per feature:
│                 api/ (HTTP calls) · hooks/ (logic) ·
│                 components/ (presentation) · schemas/ (Zod)
├── components/   shared, dumb, presentational
├── hooks/        shared hooks
├── services/     axios client · refresh interceptor · typed request helper
├── config/       env (Zod-validated) · constants mirrored from the API
├── lib/          pure utilities
└── store/        auth (access token in memory) · theme
```

Components are presentational; logic lives in hooks. No component calls `fetch` or
`axios` — every request goes through a feature's `api/` layer, reached through a hook, so
it can be stubbed at the transport in tests.

### 5.2 State, split by ownership

| Kind | Where | Why |
|---|---|---|
| Server state | TanStack Query | Caching, invalidation and dedup are its job, not ours |
| Session | Zustand, in memory | Access token must never reach storage |
| Theme | Zustand + `localStorage` | Survives reload; follows the OS until chosen |
| Filters and search | **The URL** | Shareable, reload-proof, back-button correct |

Putting filters in the URL rather than component state is what makes a search shareable
and a reload lossless — and it removes a whole class of "why did my filters reset" bugs.

### 5.3 The boundary is parsed, not trusted

Every API response is parsed with a Zod schema at the edge. Past that point the app trusts
its inferred types. A backend that changes shape produces one loud failure at the boundary
instead of `undefined` surfacing three components deep.

### 5.4 Refresh and retry, single-flight

```
request ──▶ 401 ──▶ is a refresh already in flight?
                        │ yes ──▶ await it ──▶ retry once
                        │ no  ──▶ POST /refresh ──▶ retry once
                                        │ fails ──▶ clear session, redirect to /login
```

Ten components rendering at once produce **one** refresh, not ten. Retry is attempted
exactly once, so a genuinely dead session cannot loop.

### 5.5 Theming as one token layer

Every colour is a semantic CSS variable (`--surface`, `--fg-muted`, `--brand`)
redefined under `[data-theme='dark']` and exposed to Tailwind via `@theme inline`.
Components say `bg-surface` once. There is not a single `dark:` variant in the codebase,
and switching theme repaints without a rebuild.

---

## 6. Data design summary

Full detail in [SCHEMA.md](SCHEMA.md).

```
User ──1:1──▶ CandidateProfile ──1:N──▶ Experience · Education · Certification · Project
  │                    │
  │                    └──0:N──▶ Application ──N:1──▶ Job ──N:1──▶ Company
  │                                                                   ▲
  └──1:1──▶ HrProfile ──N:1─────────────────────────────────────────┘

User ──1:N──▶ RefreshToken     (rotation families)
User ──1:N──▶ Notification
User ──1:N──▶ File             (photo · résumé · logo)

Company ──1:N──▶ OutreachCampaign ──1:N──▶ OutreachRecipient ──N:1──▶ User
```

Notable choices:

- **Profiles are separate collections, not a discriminated `users` document.** The two
  roles share almost no fields, and a single collection would be half-null on every row.
- **`companyId` on a job, never an email.** Ownership survives a person leaving.
- **The résumé on an application is a snapshot** — a file id copied at submission, so an
  employer always reads what was actually sent.
- **Refresh tokens carry a `family`**, which is what makes theft detection possible.
- **Outreach recipients store a user id, not an address** — one source of truth for an
  email, and an audit trail that never becomes a stale copy of personal data.

---

## 7. Decisions and trade-offs

| Decision | Chosen | Alternative | Why |
|---|---|---|---|
| Database | MongoDB | PostgreSQL | Profiles are deep and sparse; document shape avoids a wide table of nulls. Cost: relational integrity is the application's job |
| Replica set for one node | Yes | Standalone | Transactions are unavailable without it, and employer registration needs one. Cost: an extra init container |
| Search | Case-insensitive regex | `$text` index | Search spans the employer's name, needing `$or`, and `$text` may not appear in one. Cost: does not scale to very large corpora |
| Access token storage | Memory | `localStorage` | XSS cannot read it. Cost: a brief loading state on boot |
| Another user's record | 404 | 403 | A 403 confirms existence and enables enumeration |
| Duplicate application | Unique index | Read-then-write | Closes the concurrent race in the database |
| Outreach send | Queued worker | Inline in the request | Two hundred messages outlast a request; a crash must resume. Cost: in-process worker |
| Notifications | Durable rows, read on load | WebSocket | No socket infrastructure; survives reload. Cost: not instant |
| API docs | Generated from Zod | Hand-written YAML | Cannot drift. Cost: a small conversion layer |
| Frontend constants | Duplicated from the API | Shared package | Keeps the two apps independently deployable. Cost: a small frozen duplication |
| Sections | One generic stack | Four modules | One ownership check to get right instead of four. Cost: one more generic to read |

---

## 8. What is deliberately absent

- **No service locator.** Nothing resolves its own dependencies; everything is injected.
- **No `console.log`, no `any`, no commented-out code** anywhere in either `src/`.
- **No `if (role === …)` in a service.** Role-specific behaviour is a strategy.
- **No try/catch in controllers.** Express 5 propagates rejections; the error middleware
  is the single place a failure becomes a response.
- **No ORM import outside a repository**, and no repository import outside its own module.
- **No `dark:` variant** in the frontend — one token layer serves both themes.
