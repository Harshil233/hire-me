# Hire Me — Low-Level Design

Class-level detail: what each module contains, what it depends on, and how the
non-obvious algorithms work.

> **Companion documents:** [SPEC.md](SPEC.md) · [DESIGN.md](DESIGN.md) · [SCHEMA.md](SCHEMA.md)
> Endpoint-by-endpoint reference: <http://localhost:8080/api/v1/docs>

---

## 1. Conventions

| Convention | Rule |
|---|---|
| Interfaces | `I<Name>` — `IJobService`, `IJobRepository`, `ILogger` |
| DI tokens | Typed symbols, `UPPER_SNAKE_CASE`, declared beside the interface they resolve |
| Injection | **Constructor only.** No `new` inside a class, no service locator, no imported singleton |
| Direction | Controller → Service → Repository, each depending on the next one's *interface* |
| Cross-module | Service → other module's **service interface**, never its repository |
| Clock | `now: () => Date` is injected wherever time matters, so tests are deterministic |
| Naming | Files `kebab-case.ts`; classes `PascalCase`; constants `UPPER_SNAKE_CASE`; booleans read as predicates |

---

## 2. Composition root

`src/container/` is the only place concrete classes are known.

```
src/container/
├── token.ts       createToken<T>(description) → Token<T>, a typed symbol
├── container.ts   Container: register<T>(token, value) · resolve<T>(token)
├── tokens.ts      HTTP-layer and infrastructure tokens
└── index.ts       createContainer(config) — the wiring itself
```

```ts
export const createContainer = (config: ContainerConfig): Container => {
  const { env, connection, logger, database } = config;
  const now = config.now ?? ((): Date => new Date());
  const container = new Container();

  /* infrastructure — adapters chosen here, ports injected everywhere else */
  const transactionManager = new MongooseTransactionManager(connection);
  const passwordHasher     = new BcryptPasswordHasher(env.BCRYPT_ROUNDS);
  const tokenService       = new JwtTokenService({ /* secrets and TTLs from env */ });
  const fileStorage        = new LocalDiskFileStorage(env.FILE_STORAGE_PATH);

  /* repositories → services → controllers, in dependency order */
  const userRepository = new UserRepository(UserModel);
  // …
};
```

`Container.resolve` throws `DependencyNotRegisteredError` when the composition root
forgot a binding — a wiring mistake fails loudly at boot, not at the first request that
needed it.

Tokens are typed symbols rather than strings:

```ts
export const JOB_SERVICE: Token<IJobService> = createToken('IJobService');
```

`resolve(JOB_SERVICE)` is typed `IJobService` with no cast at the call site, and a typo
is a compile error rather than a runtime `undefined`.

**Where the container is allowed to appear:** `app.ts`, when building route tables. Never
inside a service, a repository or a controller — those receive what they need.

---

## 3. Common layer

```
src/common/
├── errors/        AppError hierarchy · frozen ERROR_CODES
├── middlewares/   authenticate · authorize · validate · error-handler ·
│                  request-id · rate-limit · upload
├── http/          api-response envelope · owned-resource controller & router
├── persistence/   ITransactionManager · owned-resource repository base
├── security/      IPasswordHasher · ITokenService · IAccessTokenVerifier
├── email/         IEmailSender port
├── validation/    shared Zod field builders
├── utils/         completion · hash · search-terms · zod-details
└── types/         ILogger, Express request augmentation
```

### 3.1 Error hierarchy

```
AppError (abstract: statusCode, code, details)
├── ValidationError        422  VALIDATION_ERROR (or a more specific code)
├── UnauthorizedError      401  UNAUTHENTICATED · INVALID_CREDENTIALS · TOKEN_EXPIRED …
├── ForbiddenError         403  ROLE_FORBIDDEN
├── NotFoundError          404  *_NOT_FOUND
├── ConflictError          409  CONFLICT · ALREADY_APPLIED · EMAIL_ALREADY_EXISTS …
├── PayloadTooLargeError   413  FILE_TOO_LARGE
└── InternalError          500  INTERNAL_ERROR
```

`normalizeError(error: unknown): AppError` in the error middleware translates everything
else the pipeline can throw:

| Thrown | Becomes |
|---|---|
| `ZodError` | `ValidationError` with per-field details |
| `MulterError` `LIMIT_FILE_SIZE` | `PayloadTooLargeError` |
| Other `MulterError` | `ValidationError` |
| Mongo `code: 11000` | `ConflictError` — **this is what closes the duplicate-application race** |
| Body-parser `entity.too.large` / `entity.parse.failed` | `PayloadTooLargeError` / `ValidationError` |
| Anything else | `InternalError`, logged with a stack and the request id |

### 3.2 Interface segregation in the middleware

`createAuthenticateMiddleware` takes an `IAccessTokenVerifier` — a one-method port —
rather than the full `ITokenService`. The middleware only verifies; it has no business
minting or rotating tokens, so it cannot.

```ts
export const createAuthenticateMiddleware = (
  tokenVerifier: IAccessTokenVerifier,
): RequestHandler => (req, _res, next) => { /* … */ };
```

### 3.3 The generic owned-resource stack

Experience, education, certification and project share one implementation:

```
OwnedResourceRepository<TEntity>   findAllByUser · findByIdForUser · create ·
                                   update · delete — every query scoped by userId
        ▲
        │ extends
ExperienceRepository · EducationRepository · CertificationRepository · ProjectRepository
        (each supplies only its Mongoose model and its document → domain mapper)

OwnedResourceService<TEntity, TInput>      list · create · update · remove
OwnedResourceController<TEntity, TInput, TResponse>
createOwnedResourceRouter({ controller, authenticate, bodySchema })
```

Each module contributes only a schema, a mapper and a route table:

```ts
export const createExperienceRouter = (
  controller: OwnedResourceController<Experience, ExperienceInput, ExperienceResponse>,
  authenticate: RequestHandler,
): Router =>
  createOwnedResourceRouter({ controller, authenticate, bodySchema: experienceInputSchema });
```

The ownership check — *is this row yours?* — exists **once**. Four copies would be four
places for it to be subtly wrong, and three places where a fix silently does not land.

---

## 4. Module reference

### 4.1 `auth`

| Class | Depends on | Responsibility |
|---|---|---|
| `AuthController` | `IAuthService`, `IUserService`, cookie config | Cookie handling and status codes |
| `AuthService` | 9 injected collaborators (see below) | Registration, sign-in, rotation, revocation |
| `RefreshTokenRepository` | `RefreshTokenModel` | Token digests and families |

```ts
export interface AuthServiceDependencies {
  readonly userRepository: IUserRepository;
  readonly userService: IUserService;
  readonly refreshTokenRepository: IRefreshTokenRepository;
  readonly candidateProfileService: ICandidateProfileService;
  readonly hrProfileService: IHrProfileService;
  readonly companyService: ICompanyService;
  readonly passwordHasher: IPasswordHasher;
  readonly tokenService: ITokenService;
  readonly transactionManager: ITransactionManager;
  readonly now: () => Date;
}
```

Nine collaborators arrive as one named object rather than nine positional parameters:
call sites stay readable and adding one does not renumber the rest.

**Role-scoped sign-in.** The role comes from the *route table*, never from the request:

```ts
loginAs = (expectedRole: Role): LoginHandler => async (req, res) => {
  const session = await this.authService.login(req.body, this.readMeta(req), expectedRole);
  this.respondWithSession(res, session);
};

// routes
router.post('/candidate/login', authRateLimiter, validateLogin, controller.loginAs(ROLES.CANDIDATE));
router.post('/hr/login',        authRateLimiter, validateLogin, controller.loginAs(ROLES.HR));
```

A client cannot choose which role it authenticates as, because the choice was made when
the route was registered.

**Timing-equalised failure.** An unknown email is compared against a real bcrypt digest
of a value nobody knows:

```ts
const DECOY_PASSWORD_HASH = '$2b$12$BTGIAJPdXwcipXwF5rCrMOYZu5vpIqpO3hl3R07NxfKSzON0OM8Iq';
```

Without it, "no such user" returns in microseconds while "wrong password" takes a bcrypt
verification — a difference large enough to enumerate accounts with a stopwatch. Wrong
role, wrong password and unknown email all produce the same `INVALID_CREDENTIALS`, in
comparable time, with no session, no cookie and no `lastLoginAt` write.

**Refresh rotation with theft detection.**

```
POST /refresh  ─ cookie
  │
  ├─ verify signature ──────────── invalid ──▶ 401
  ├─ look up sha256(token)
  │     ├─ unknown, or already revoked ──▶ revokeFamily(family) ──▶ 401
  │     └─ expired ─────────────────────▶ revokeById ──▶ 401
  ├─ user missing or inactive ──────────▶ revokeFamily ──▶ 401
  ├─ revokeById(current)
  └─ issue new access + refresh in the SAME family ──▶ 200
```

Only `sha256(token)` is persisted. Revoking the whole family on replay means a stolen
token, once used, ends every session descended from that sign-in — including the
attacker's.

**Transactional employer registration.**

```ts
const user = await this.deps.transactionManager.runInTransaction(async (context) => {
  const created = await this.deps.userRepository.create({ …, role: ROLES.HR }, context);
  const company = await this.deps.companyService.createForOwner(created.id, input.company, context);
  await this.deps.hrProfileService.createForUser(created.id, { …, companyId: company.id,
    companyRole: COMPANY_ROLES.OWNER }, context);
  return created;
});
```

`context` is an opaque `TransactionContext`, not a Mongoose `ClientSession` — the service
expresses *atomicity* without knowing what the database is.

### 4.2 `profile` — strategy dispatch

```ts
export class ProfileService implements IProfileService {
  private readonly strategies: ReadonlyMap<Role, IProfileStrategy>;

  constructor(strategies: readonly IProfileStrategy[]) {
    this.strategies = new Map(strategies.map((s) => [s.role, s]));
  }

  async getProfile(userId: string, role: Role): Promise<AnyProfileView> {
    return this.resolve(role).getProfile(userId);
  }
}
```

`IProfileStrategy` exposes `role`, `getProfile`, `updateProfile` and `updateSchema`.
`CandidateProfileStrategy` and `HrProfileStrategy` implement it.

`updateSchema` is what lets **one** validator middleware serve both roles: it asks the
service for the schema belonging to the caller's role, then validates with it. A missing
strategy raises `InternalError`, never a 4xx — it is a wiring bug, not a client mistake.

Completion scoring is a pure function over a frozen weight map:

```ts
export const CANDIDATE_COMPLETION_WEIGHTS = {
  name: 10, profilePic: 5, mobile: 10, gender: 5, dob: 5, currentLocation: 5,
  preferredLocations: 5, skills: 10, jobTypes: 5, expectedCtc: 5, resume: 10,
  experience: 10, education: 10, project: 3, certification: 2,
} as const;   // sums to 100 — asserted by a test
```

### 4.3 `job`

| Class | Responsibility |
|---|---|
| `JobController` | Query/param translation, response shaping |
| `JobService` | Ownership, status transitions, search orchestration |
| `JobRepository` | The only Mongoose consumer for `jobs` |
| `CompanyDirectoryAdapter` | Implements the job module's `ICompanyDirectory` port over the company repository |

**Searching across a module boundary.** Search spans the employer's name, but only the
company module may read companies. Rather than reaching across, the job module *declares
a port* and the company module supplies an adapter:

```ts
// job.interface.ts — the port the job module needs
export interface ICompanyDirectory {
  findIdsByName(term: string): Promise<string[]>;
  findSummaries(ids: readonly string[]): Promise<ReadonlyMap<string, CompanySummary>>;
}

// company-directory.adapter.ts — the company module's implementation of it
export class CompanyDirectoryAdapter implements ICompanyDirectory {
  constructor(private readonly companyRepository: ICompanyRepository) {}
}
```

The dependency now points at an interface the *consumer* owns. The job module has no idea
companies live in MongoDB, and the company module keeps sole ownership of its collection.
`HrCompanyMembershipAdapter` does the same in the other direction.

Search resolution, word by word:

```
"senior react nimbus"
   │
   ├─ toSearchTerms() ── split, trim, drop empties, cap at SEARCH.MAX_TERMS (6)
   │
   ├─ per term: companyDirectory.findIdsByName(term) ──▶ Map<term, companyId[]>
   │
   └─ repository.search(filter) — every term must match at least one of:
        title · description · skills · locations · role · companyId ∈ resolved ids
```

Matching **every word against any field** is what makes "senior react nimbus" find a
senior React role at Nimbus Labs. `MAX_TERMS` bounds the regex work a single query can
provoke.

**Status transitions** read from a frozen map rather than an `if`-chain:

```ts
export const JOB_STATUS_TRANSITIONS = Object.freeze({
  draft:     ['published', 'closed'],
  published: ['closed'],
  closed:    ['published'],   // reopen
});
```

### 4.4 `application`

The densest authorisation in the codebase, because two roles act on one record.

```ts
async changeStatus(id, actorUserId, actorRole, status): Promise<Application> {
  const application = await this.requireApplication(id);

  // Non-null exactly when the actor is the employer — that branch has to resolve the
  // job to authorise at all, so the summary is reused for the notification text.
  const job = await this.requireActorMayTouch(application, actorUserId, actorRole);

  // 1. Actor scope: who may set this state at all?
  if (APPLICATION_STATUS_ACTORS[status] !== actorRole) { throw new ValidationError(…); }

  // 2. Idempotence: same state in, same record out — no spurious notification.
  if (application.status === status) { return application; }

  // 3. Order scope: is this move legal from where it is?
  if (!APPLICATION_STATUS_TRANSITIONS[application.status].includes(status)) { throw …; }

  // 4. Status change + notification commit together.
  return this.deps.transactionManager.runInTransaction(async (context) => { … });
}
```

Two frozen maps carry rules that would otherwise be scattered conditionals:

```ts
APPLICATION_STATUS_TRANSITIONS = { applied: ['shortlisted','rejected','withdrawn'],
                                   shortlisted: ['rejected','withdrawn'],
                                   rejected: ['shortlisted'],
                                   withdrawn: [] }            // terminal

APPLICATION_STATUS_ACTORS      = { applied: 'candidate', shortlisted: 'hr',
                                   rejected: 'hr', withdrawn: 'candidate' }
```

Together they say: a candidate cannot shortlist themselves, and an employer cannot
withdraw on a candidate's behalf.

**The notification shares the transaction.** A candidate is never left with a changed
status and no word of it, nor with a notification for a change that was rolled back.

**Applying** relies on the database for correctness:

```
POST /jobs/:id/apply
  ├─ job exists and is published?          no ──▶ 404 / JOB_NOT_ACCEPTING_APPLICATIONS
  ├─ snapshot the candidate's resumeFileId
  └─ insert ── unique (jobId, candidateUserId) violated ──▶ 11000 ──▶ 409 ALREADY_APPLIED
```

No read-then-write check, so two concurrent requests cannot both pass.

### 4.5 `file`

```
FileController ──▶ FileService ──┬──▶ IFileRepository
                                 ├──▶ IFileStorage          (LocalDiskFileStorage)
                                 └──▶ IFileAccessPolicy[]   (composite)
```

`IFileStorage` — `save`, `createReadStream`, `remove` — keeps the disk swappable for
object storage without touching a service.

Download permission is a **list of policies**, allowed if any allows:

```ts
export interface IFileAccessPolicy {
  allows(request: FileAccessRequest): boolean;
}

class OwnerFileAccessPolicy            { /* the uploader, always */ }
class EmployerCandidateFileAccessPolicy { /* an employer, for a résumé or photo */ }
```

A new audience is a new class registered in the container — never another `if` inside the
service. The employer policy checks *kind*, not ownership, which is a deliberate boundary
matching the talent pool: it already shows every candidate to every employer, and the card
renders the photo, so withholding the bytes would only ever show initials. A company logo
is not in the visible set.

Upload is validated twice over: Multer enforces the byte ceiling, and the declared `kind`
determines the accepted MIME types.

### 4.6 `outreach`

The most moving parts, because delivery is asynchronous.

```
OutreachController ──▶ OutreachService ──┬──▶ IOutreachRepository
                                         ├──▶ IJobService          (own listing?)
                                         ├──▶ ICandidateDirectory  (audience)
                                         └──▶ ceilings from env

OutreachDispatcher ──┬──▶ IOutreachRepository   claim · take batch · mark
                     ├──▶ IUserEmailDirectory   user id → address
                     ├──▶ IEmailSender          LogEmailSender | ResendEmailSender
                     └──▶ renderCampaignEmail   subject/body + signed unsubscribe link

startOutreachWorker(dispatcher, logger, intervalMs) ──▶ { stop() }
```

**Create** resolves the audience, writes recipient rows as `queued`, and returns. **The
worker** drains them:

```ts
async runOnce(): Promise<number> {
  const campaign = await this.repository.claimNextQueuedCampaign();   // atomic claim
  if (campaign === null) { return 0; }

  try {
    return await this.sendBatch(campaign);
  } catch (error: unknown) {
    // The campaign stays claimed; totals still settle from the recipient rows.
    await this.repository.refreshCampaignTotals(campaign.id, this.now());
    return 0;
  }
}
```

The loop guards itself:

```ts
const tick = (): void => {
  if (isRunning) { return; }        // never overlap a slow pass
  isRunning = true;
  void dispatcher.runOnce().catch(…).finally(() => { isRunning = false; });
};
const timer = setInterval(tick, intervalMs);
timer.unref();                      // never hold the process open during shutdown
```

Each recipient row is marked as it is attempted, so a crash mid-campaign resumes exactly
where it stopped and never sends twice. `claimNextQueuedCampaign` is what keeps two
instances from sending the same campaign — the honest limit of an in-process worker,
recorded as a known limitation.

**Unsubscribe tokens** are HMAC-signed with `UNSUBSCRIBE_SECRET`, so a link cannot be
forged for another address. The route is public because it is reached from an email by
someone with no session. Production refuses to boot while the secret is still the
development default.

### 4.7 `notification`

Deliberately small. Rows are written by the application service inside its transaction and
read when the client shell mounts. `PATCH /notifications/read` marks one or all. Both
routes are scoped to the signed-in user in the service, so neither needs a role guard —
everyone has notifications, and can only ever see their own.

### 4.8 `docs`

Serves the API contract, generated rather than maintained.

```
openapi.builder.ts      pure: Zod → JSON Schema, envelopes, parameters
openapi.components.ts   the named schema registry
openapi.paths.*.ts      paths, grouped by domain
openapi.document.ts     assembly: info · servers · tags · security
docs.routes.ts          GET /openapi.json · GET /docs (Swagger UI)
```

```ts
export const jsonSchemaOf = (schema: z.ZodType, io: SchemaIo = 'input'): JsonSchema => {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema, { io, unrepresentable: 'any' });
  return rest;
};
```

`io` matters: a Zod schema can transform, so a request body and a response body are
different shapes of the same object. `'input'` describes what a client sends (before
defaults and coercion); `'output'` describes what it gets back.

Query parameters are derived from the schema the route already validates with, so a new
filter is documented by the act of supporting it:

```ts
export const queryParameters = (schema: z.ZodType): readonly ParameterObject[] => { … };
```

Swagger UI needs an inline bootstrap script, which the application-wide `default-src
'self'` policy blocks. Rather than weaken it everywhere, a relaxed policy is scoped to the
docs subtree alone — inline script and style from our own origin, and nothing else.

---

## 5. Frontend detail

### 5.1 Feature anatomy

```
features/jobs/
├── api/         job.api.ts        typed calls; responses parsed with Zod
├── hooks/       useJobs.ts        TanStack Query wrappers, cache keys, invalidation
├── components/  JobCard, JobFilterFields, SimilarJobs, SkillFilter …
├── schemas/     job.schema.ts     Zod + inferred types
└── __tests__/
```

Rules that hold everywhere: a component never calls the transport directly; a hook owns
the query key and what invalidates it; the API layer parses at the boundary and returns
inferred types.

### 5.2 Guards

```tsx
<Route element={<PublicOnlyRoute />}>          {/* signed in → bounced to your landing */}
<Route element={<ProtectedRoute />}>           {/* signed out → /login                 */}
  <Route element={<RoleRoute allow={ROLES.HR} />}>   {/* wrong role → your landing     */}
```

`landingPathFor(role)` decides where each role belongs **once**, and drives sign-in,
sign-up, the root redirect and the wrong-role bounce. Candidates land on jobs; employers
land on the talent pool.

### 5.3 Single-flight refresh

```ts
let refreshInFlight: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  refreshInFlight ??= (async (): Promise<string> => {
    try {
      const response = await axios.post(`${baseURL}/refresh`, undefined, { withCredentials: true });
      options.onAccessTokenRefreshed(response.data.data.accessToken);
      return response.data.data.accessToken;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};
```

Ten components rendering together produce **one** refresh call, not ten. Retry happens at
most once, so a genuinely dead session cannot loop.

### 5.4 One config object per profile section

The four sections share one implementation on the frontend too. Each supplies a config —
its schema, its field list, its labels, its mapping — and the list, the modal, the cache
handling and the API client are written once.

---

## 6. Testing approach

| Layer | How it is tested |
|---|---|
| Controllers | Fake service injected; request/response asserted, including status codes |
| Services | Fake repositories and adapters injected; business rules and every unhappy path |
| Repositories | Real `mongodb-memory-server`, replica-set mode — indexes and transactions exercised for real |
| Routes | Supertest through the whole middleware chain: guards, validators, error shape |
| Utilities | Pure functions, tested directly |
| Contract | Every documented OpenAPI path fired at the running app; `ROUTE_NOT_FOUND` fails the build |
| Frontend | React Testing Library; transport stubbed at the axios layer; behaviour a user can observe |

**No monkey-patching, anywhere.** Because everything arrives through a constructor, a unit
test builds the real class with fakes. A test that *needed* module mocking would be
evidence of a design defect, and would be fixed in the design rather than in the test.

Determinism is enforced by injection: the clock is `now: () => Date`, so a test that cares
about time supplies its own.

---

## 7. Adding to the codebase

**A new module** — create `src/modules/<name>/` with the seven standard files, declare
`I<Name>Service` / `I<Name>Repository` and their tokens in `<name>.interface.ts`, register
concretes in `src/container/index.ts`, mount the router in `app.ts`, add paths to
`src/modules/docs/openapi.paths.*.ts`, and write the tests in the same change.

**A new role** — add it to `ROLE_VALUES`, implement `IProfileStrategy`, register the
strategy. No existing service changes.

**A new file audience** — implement `IFileAccessPolicy`, register it. No existing service
changes.

**A new storage or email provider** — implement `IFileStorage` or `IEmailSender`, bind it
in the container behind a config value. No existing service changes.

**A new status** — add it to the value list, the transition map and, for applications, the
actor map. The services read those maps; none of them branch on the status.
