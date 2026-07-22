# CLAUDE.md

Engineering rules for this repository. These are **mandatory**, not suggestions.
Every change — feature, fix, or refactor — must satisfy every rule below before it is
considered done.

---

## 1. Repository Layout

The repo is a monorepo with two fully independent applications:

```
/
├── backend/          # Node.js + TypeScript API
├── frontend/         # TypeScript SPA
├── CLAUDE.md
└── README.md
```

- `backend/` and `frontend/` never import from each other via relative paths.
  Shared contracts are duplicated as types or published through a shared package —
  never through `../../backend/...`.
- Each folder owns its own `package.json`, `tsconfig.json`, `Dockerfile`,
  `.dockerignore`, `.env.example`, lint config, and test config.

---

## 2. Language & Tooling

- **TypeScript everywhere.** No `.js` source files. No `any` — use `unknown` plus a
  narrowing guard when the type is genuinely unknown.
- `tsconfig.json` must have `strict: true`, `noImplicitAny`, `strictNullChecks`,
  `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`,
  `exactOptionalPropertyTypes`.
- **Zod** is the only runtime validation library. Types are derived from schemas with
  `z.infer<typeof schema>` — never hand-write a type that duplicates a schema.
- ESLint + Prettier are enforced. A build with lint errors is a failed build.

---

## 3. SOLID Principles — Non-Negotiable

| Principle | What it means here |
|---|---|
| **S**ingle Responsibility | A class/file has exactly one reason to change. Controllers only translate HTTP ↔ service calls. Services only hold business rules. Repositories only talk to the database. |
| **O**pen/Closed | Extend behaviour through new implementations of an interface, not by adding `if (type === ...)` branches to existing code. |
| **L**iskov Substitution | Any implementation of an interface must be swappable without the caller changing. No throwing `NotImplemented` in an implementation. |
| **I**nterface Segregation | Prefer several small interfaces over one fat one. A consumer must not depend on methods it never calls. |
| **D**ependency Inversion | High-level modules depend on **interfaces**, never on concrete classes. Concrete types are wired only in the composition root. |

If a rule below ever conflicts with SOLID, SOLID wins — raise it instead of silently
deviating.

---

## 4. Design Patterns

Apply a pattern when it removes real duplication or branching — not to decorate code.
Expected patterns in this codebase:

- **Repository** — all persistence access (mandatory, see §6).
- **Dependency Injection** — constructor injection for every controller, service and
  repository (mandatory, see §7).
- **Strategy** — swappable algorithms (payment providers, notification channels,
  export formats) instead of `switch` blocks.
- **Factory** — object creation that involves branching or configuration.
- **Adapter** — wrapping third-party SDKs so they can be replaced and mocked.
- **Decorator** — cross-cutting concerns (caching, retries, metrics) around a service.
- **Singleton** — only for the logger and the DB connection pool, created in config.

Document the chosen pattern in a one-line comment above the class when it is not
obvious from the name.

---

## 5. Backend Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts               # Zod-validated env parsing — fails fast on boot
│   │   ├── constants.ts         # frozen, app-wide constants
│   │   ├── logger.ts            # single logger instance
│   │   └── index.ts             # barrel re-export
│   ├── modules/
│   │   └── <module>/
│   │       ├── <module>.controller.ts
│   │       ├── <module>.service.ts
│   │       ├── <module>.repository.ts
│   │       ├── <module>.schema.ts
│   │       ├── <module>.validator.ts
│   │       ├── <module>.interface.ts
│   │       ├── <module>.routes.ts
│   │       └── __tests__/
│   │           ├── <module>.controller.spec.ts
│   │           ├── <module>.service.spec.ts
│   │           └── <module>.repository.spec.ts
│   ├── common/
│   │   ├── errors/              # AppError hierarchy
│   │   ├── middlewares/         # error handler, auth, request-id, rate limit
│   │   ├── utils/               # pure, reusable helpers
│   │   └── types/
│   ├── container/               # DI registrations (composition root)
│   ├── database/                # connection, migrations, seeds
│   ├── app.ts                   # framework wiring only
│   └── server.ts                # bootstrap / listen only
├── tests/                       # integration & e2e
├── Dockerfile
├── .dockerignore
└── package.json
```

### File responsibilities

- **`<module>.controller.ts`** — parse request, call service, shape response. No
  business logic, no DB access, no try/catch soup (errors bubble to the error
  middleware).
- **`<module>.service.ts`** — all business rules. Depends on the repository
  **interface**, never the concrete class.
- **`<module>.repository.ts`** — the only place that touches the ORM/query builder.
  Implements the repository interface. Returns domain objects, never raw ORM rows
  leaking driver types.
- **`<module>.schema.ts`** — Zod schemas for body, params, query, and response, plus
  the inferred types.
- **`<module>.validator.ts`** — middleware/guards that apply the schemas to incoming
  requests and produce a consistent 422 error shape.
- **`<module>.interface.ts`** — `I<Module>Service`, `I<Module>Repository`, domain
  entity types, and the DI tokens for that module.
- **`<module>.routes.ts`** — route table: path → validator → controller method.

A module never imports another module's repository. Cross-module work goes
service → service through the other module's **interface**.

---

## 6. Repository Model for the Database

- Every DB read/write lives behind a repository.
- Services and controllers must never import the ORM, a query builder, or a raw
  driver.
- Each repository implements an interface declared in `<module>.interface.ts`, e.g.:

  ```ts
  export interface IUserRepository {
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    create(data: CreateUserInput): Promise<User>;
    update(id: string, data: UpdateUserInput): Promise<User>;
    softDelete(id: string): Promise<void>;
  }
  ```
- Repository methods take and return **domain types**, not HTTP DTOs.
- Transactions are expressed through a unit-of-work / transaction-manager
  abstraction, not by passing an ORM transaction object into a service.

---

## 7. Dependency Injection

- **Constructor injection only.** No `new SomeService()` inside another class, no
  service locators sprinkled through the code, no importing a singleton instance
  directly into a service.
- Depend on interfaces:

  ```ts
  export class UserService implements IUserService {
    constructor(
      private readonly userRepository: IUserRepository,
      private readonly logger: ILogger,
    ) {}
  }
  ```
- All concrete bindings live in `src/container/`. That is the only file allowed to
  know concrete classes.
- Injection tokens are typed symbols/constants — no magic strings.
- Because everything is injected, unit tests pass mocks straight into the
  constructor. If a test needs monkey-patching or module mocking to work, the DI is
  wrong — fix the design, not the test.

---

## 8. Configuration

- `config/env.ts` parses `process.env` through a Zod schema at startup and **throws
  and exits** on failure. Nothing else in the codebase reads `process.env`.
- Export a typed, frozen `env` object; consumers import that.
- `config/constants.ts` holds `as const` values (roles, statuses, limits, cache TTLs).
  No magic numbers or bare strings in business logic.
- `config/logger.ts` exports a single structured logger behind an `ILogger`
  interface, injected everywhere. No `console.log` in `src/`.
- Every new env var must be added to the Zod schema **and** `.env.example` in the
  same change. Secrets never get committed.

---

## 9. No Duplicate Functions — DRY

Before writing any function:

1. Search the codebase for an existing implementation (by name **and** by behaviour).
2. If something close exists, extend or parameterise it instead of copying.
3. If the same logic would live in two modules, lift it into `common/utils/` (backend)
   or `src/lib/` (frontend).

Rules:
- Two functions must never share a name and purpose in different files.
- Copy-pasted blocks of 3+ lines are a defect — extract them.
- Utilities are pure, individually unit-tested, and exported through one barrel.
- Validation logic lives only in Zod schemas; never re-check the same rule by hand
  inside a service.

---

## 10. Frontend Structure

```
frontend/
├── src/
│   ├── app/                  # entry, providers, router
│   ├── pages/                # route-level screens (composition only)
│   ├── features/
│   │   └── <feature>/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── api/          # feature API client
│   │       ├── schemas/      # Zod schemas + inferred types
│   │       ├── types/
│   │       ├── utils/
│   │       └── __tests__/
│   ├── components/           # shared, presentational, dumb
│   ├── hooks/                # shared hooks
│   ├── services/             # http client, interceptors, storage
│   ├── config/               # env (Zod-validated), constants
│   ├── lib/                  # pure utilities
│   ├── store/                # global state
│   └── styles/
├── Dockerfile
├── .dockerignore
└── package.json
```

Rules:
- Components are presentational; logic lives in hooks. A component file over ~150
  lines gets split.
- No `fetch`/`axios` calls inside components — always through a feature's `api/`
  layer, which is injected or imported through a hook so it can be mocked.
- Every API response is parsed with a Zod schema at the boundary. The rest of the app
  trusts the inferred types.
- Frontend env vars are validated in `config/env.ts` with Zod, same as backend.
- Prop types are explicit; no implicit `any`, no `React.FC` with untyped children.
- SOLID applies here too: one responsibility per hook/component, dependencies passed
  in (props, context, or hook arguments), not reached for globally.

---

## 11. Testing & Coverage

**Rule: every function you write ships with its unit tests in the same change.**

- Backend: Jest (or Vitest) + Supertest for HTTP-level tests.
- Frontend: Vitest/Jest + React Testing Library. Test behaviour, not implementation
  details.
- Test the real dependency graph via mocks injected through constructors/props.
- Every module needs: controller tests, service tests, repository tests, validator
  tests, and tests for each utility.
- Cover the unhappy paths — validation failures, not-found, permission denied,
  repository throwing, network errors.
- **Coverage must be > 90%** for statements, branches, functions and lines, on both
  frontend and backend. Thresholds are enforced in the test config so the suite
  **fails** below them:

  ```js
  coverageThreshold: {
    global: { statements: 90, branches: 90, functions: 90, lines: 90 },
  }
  ```
- Coverage is never raised by excluding files. Only generated code, type-only files
  and the bootstrap entrypoint may be excluded.
- Tests are deterministic: no real network, no real DB in unit tests, no sleeps,
  fixed clocks and seeded randomness.

---

## 12. Docker

Both `backend/` and `frontend/` have a `Dockerfile` and `.dockerignore`.

- Multi-stage builds: `deps → build → runtime`.
- Runtime image is slim (`node:<lts>-alpine` or `nginx:alpine` for the built
  frontend), runs as a non-root user, and contains no dev dependencies or source
  maps that aren't wanted in production.
- Backend image exposes the configured port and defines a `HEALTHCHECK`.
- **After every feature, re-read both Dockerfiles and confirm whether they still
  hold.** Update them when a change introduces:
  - a new runtime dependency or system package (e.g. native module, image tooling),
  - a new env var (add to `.env.example`, wire through compose/Dockerfile args),
  - a new port, volume, or long-running process,
  - a change to build output paths, start scripts, or the Node version,
  - new files that should be in `.dockerignore`.

  If no change is required, say so explicitly in the summary — don't stay silent
  about it.
- `docker-compose.yml` at the repo root wires backend + frontend + database for local
  development.

---

## 13. Error Handling & API Contract

- One `AppError` hierarchy (`NotFoundError`, `ValidationError`, `UnauthorizedError`,
  `ConflictError`, …) with a status code and a stable error code.
- A single error-handling middleware converts errors into the response shape. Nothing
  else formats error responses.
- Consistent envelope:

  ```jsonc
  { "success": true,  "data": { } }
  { "success": false, "error": { "code": "USER_NOT_FOUND", "message": "...", "details": [] } }
  ```
- Zod validation failures return `422` with per-field details.
- Never leak stack traces, SQL, or driver messages to clients. Log them with a
  request id instead.

---

## 14. Naming Conventions

- Files: `kebab-case` for backend modules (`user.service.ts`), `PascalCase` for React
  components (`UserCard.tsx`).
- Classes: `PascalCase`. Interfaces: `IUserService`. Types: `PascalCase`.
- Variables/functions: `camelCase`. Constants: `UPPER_SNAKE_CASE`.
- Zod schemas: `createUserSchema`, `updateUserSchema`; inferred types `CreateUserInput`.
- Booleans read as predicates: `isActive`, `hasAccess`, `canEdit`.

---

## 15. Definition of Done

A change is not complete until **all** of these are true:

- [ ] SOLID respected; dependencies injected through interfaces.
- [ ] Backend module has all required files (controller, service, repository, schema,
      validator, interface, routes).
- [ ] Payloads validated with Zod on both frontend and backend.
- [ ] No duplicated function or copy-pasted logic introduced.
- [ ] New env vars validated in `config/env.ts` and added to `.env.example`.
- [ ] Unit tests written for every new function, happy and unhappy paths.
- [ ] Coverage > 90% on both apps; the suite passes.
- [ ] Lint and typecheck pass with zero errors.
- [ ] Dockerfiles reviewed and updated if needed (state the outcome either way).
- [ ] No `console.log`, no `any`, no commented-out code, no TODOs left behind.
