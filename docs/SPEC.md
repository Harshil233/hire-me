# Hire Me — Product Specification

> **Status:** implemented unless a requirement is explicitly marked *Out of scope*.
> **Audience:** anyone deciding what the product should do, or checking whether it does it.
> **Companion documents:** [DESIGN.md](DESIGN.md) (how it is built), [SCHEMA.md](SCHEMA.md)
> (what is stored), [LLD.md](LLD.md) (class-level detail).

---

## 1. Purpose

A two-sided hiring platform connecting people looking for work with the companies hiring
them.

The product exists to make three things cheap: for a candidate, **finding a role that
actually matches** and knowing where their application stands; for an employer,
**reaching the right people** and moving them through a review; and for both, **not
having to trust the other side's word about what happened** — every state change is
recorded, attributed and visible to whoever it concerns.

### 1.1 Success criteria

| # | The product succeeds if… |
|---|---|
| S-1 | A candidate can go from signed out to submitted application in one session, without help |
| S-2 | An employer can go from signed out to a published listing with applicants in one session |
| S-3 | Neither role can see, or infer the existence of, data belonging to someone else |
| S-4 | A status change is visible to the person it affects without them asking |
| S-5 | The whole stack starts with one command on a machine that has only Docker |

---

## 2. Scope

### 2.1 In scope

Accounts and authentication for two roles · candidate profiles with experience,
education, certifications and projects · file upload (photo, résumé, company logo) ·
company profiles · job listings with a lifecycle · search and filtering · applications
with a status workflow · employer-side applicant review · a candidate talent pool ·
employer-to-candidate email outreach with opt-out · in-app notifications · light and dark
theming.

### 2.2 Out of scope

| Not built | Reasoning |
|---|---|
| Email verification, forgot/reset password | Needs the same delivery path outreach has; adds nothing to what is being assessed |
| An employer joining an existing company | Data model supports it (`companyRole: owner \| member`); no invitation flow |
| Curated skill taxonomy | Free text, with the filter fed by skills actually in use |
| Admin/moderator role | Two roles were the requirement; a third is more of the same |
| Messaging between the parties | Outreach is one-directional by design |
| Interview scheduling, offers, onboarding | A different product |
| Payments, subscriptions, job-slot billing | — |
| Real-time push | Notifications are durable rows read on page load |

---

## 3. Roles and permissions

Two roles. A user has exactly one, fixed at registration; there is no elevation path.

| Capability | Candidate | Employer (HR) | Anonymous |
|---|:--:|:--:|:--:|
| Register, sign in | ✅ | ✅ | ✅ |
| Own profile and profile sections | ✅ | ✅ (no sections) | ❌ |
| Upload photo / résumé | ✅ | ✅ (photo, logo) | ❌ |
| Browse **published** listings | ✅ | ✅ | ❌ |
| Post, edit, publish, close a listing | ❌ | ✅ own company | ❌ |
| See a **draft** listing | ❌ | ✅ own company | ❌ |
| Apply to a listing | ✅ | ❌ | ❌ |
| Withdraw an application | ✅ own | ❌ | ❌ |
| Shortlist / reject an applicant | ❌ | ✅ own listing | ❌ |
| See who applied to a listing | ❌ | ✅ own listing | ❌ |
| Browse the talent pool | ❌ | ✅ | ❌ |
| Read a candidate's résumé | ❌ | ✅ via own application or the pool | ❌ |
| Create an outreach campaign | ❌ | ✅ own company | ❌ |
| Unsubscribe from outreach | ✅ | ✅ | ✅ *(signed link)* |
| Read own notifications | ✅ | ✅ | ❌ |

**Rule R-1 — role scoping of sign-in.** Each role authenticates through its own path.
Presenting a candidate's correct credentials to the employer path fails identically to a
wrong password: same error code, no session, no cookie, no `lastLoginAt` write.

**Rule R-2 — invisibility over refusal.** A resource owned by another user answers
**404**, never 403. `403` is reserved for the wrong *account type* (a candidate calling
an employer-only endpoint), where no ownership question arises.

---

## 4. User stories and acceptance criteria

### 4.1 Accounts

**US-1 — As a candidate, I register so I can apply for jobs.**
- Given a unique email and a password of 8+ characters containing upper, lower, digit and
  symbol, an account is created and I am signed in immediately.
- A duplicate email is refused with `EMAIL_ALREADY_EXISTS` (409).
- A weak password is refused with 422 and per-field detail naming what is missing.

**US-2 — As an employer, I register and my company is created with me.**
- The user, the company and the HR profile are written in **one transaction**. If any part
  fails, none of it persists — no orphaned account, no half-registered company.
- I become the company's `owner`.
- A duplicate company domain is refused.

**US-3 — As either role, my session survives a reload.**
- The refresh token is an `httpOnly` cookie; the access token is held in memory only.
- On load, the client silently refreshes and restores the session.
- Signing out revokes the session server-side, not just client-side.

**US-4 — As a user, a stolen refresh token cannot outlive my next request.**
- Every refresh rotates the token and revokes its predecessor.
- Replaying an already-rotated token revokes the **entire family**, ending every session
  descended from that sign-in.

### 4.2 Profiles

**US-5 — As a candidate, I build a profile that employers can find.**
- Personal details, current location, preferred locations, skills, job types, current and
  expected CTC, résumé and photo.
- Experience, education, certifications and projects, each full CRUD, each belonging to
  me alone.
- A **completion score** (0–100) with a per-item breakdown naming what is still missing.
  The weights total exactly 100.

**US-6 — As an employer, I maintain my company's public face.**
- Description, logo, website, LinkedIn/Facebook/Instagram, headquarters, address, map
  link — shown to candidates on every listing.
- My own completion score covers both my details and the company's.

**US-7 — As either role, my uploads are readable only by those who should see them.**
- I may always read my own files.
- An employer may additionally read any candidate's **résumé or profile photo**. This is a
  deliberate boundary, not an oversight: the talent pool already shows every candidate to
  every employer, and the card renders the photo, so withholding the bytes would only ever
  show initials. A **company logo** is not covered — that belongs to whoever uploaded it.
- Each reason a download may be permitted is its own policy; access is granted when any
  policy allows it, so a new audience is a new class rather than another branch.
- Type and size are enforced: images for a photo or logo, PDF/DOC/DOCX for a résumé, 5 MB
  ceiling.

### 4.3 Listings

**US-8 — As an employer, I post a role.**
- Title, description, highlights, responsibilities, qualifications, role category, job
  type, work mode, skills, locations, CTC band, experience band.
- Created as a **draft**, invisible outside my company until published.
- The owning company comes from **my membership**; a `companyId` in the request body is
  ignored.

**US-9 — As an employer, I move a listing through its lifecycle.**

```
draft ──▶ published ──▶ closed
  │                        │
  └────────▶ closed        └──▶ published   (reopen)
```

- Any other move is refused with `INVALID_STATUS_TRANSITION` (409).
- Publishing stamps `publishedAt`; closing stamps `closedAt`.
- Only listings owned by my company can be moved; another company's answers 404.

**US-10 — As a candidate, I find roles that match.**
- Only `published` listings are ever visible to me.
- One search box spans title, description, skills, locations, role category **and the
  employer's name**, matched word by word rather than as one string.
- Filters: role, job type, work mode, location, skills, CTC range, experience range.
- Filters live in the URL, so a search is shareable and survives a reload.
- Results are paginated with a hard page-size ceiling.

### 4.4 Applications

**US-11 — As a candidate, I apply once.**
- Optional cover note.
- My current résumé is **snapshotted** at submission; later profile edits never alter an
  application already submitted.
- A second application to the same listing is refused with `ALREADY_APPLIED` (409),
  enforced by a unique index so two concurrent requests cannot both pass.
- A listing that is not `published` refuses applications.

**US-12 — As an employer, I review applicants.**
- Everyone who applied to my listing, filterable by status, paginated.
- Each card carries name, location, skills, photo and the snapshotted résumé — and
  **nothing else**. Never a date of birth, mobile number or salary expectation.

**US-13 — As either role, status changes follow the rules.**

```
applied ──▶ shortlisted ──▶ rejected ──▶ shortlisted   (reconsider)
   │              │
   └──────────────┴──▶ withdrawn                       (terminal)
```

- Transitions are **actor-scoped as well as order-scoped**: only the employer may
  shortlist or reject; only the candidate may withdraw.
- `withdrawn` is terminal.
- Any other move is refused with 409.

**US-14 — As a candidate, I am told when my application moves.**
- A status change made by someone else raises a durable notification for me.
- It carries what changed and links straight to the application.
- It is waiting on my next page load — no polling loop, no socket.
- My own withdrawal does not notify me of my own action.

### 4.5 Talent pool and outreach

**US-15 — As an employer, I browse candidates.**
- Every candidate open to work, filterable by skill, location and job type.
- Opening one shows their full profile: experience, education, projects, certifications
  and their résumé.

**US-16 — As an employer, I invite candidates to a listing by email.**
- I pick one of **my own** listings and describe the audience with the talent-pool filters.
- I can **preview the reach** — how many candidates match — before committing.
- The campaign is **queued**, not sent inline: a background worker delivers in batches, so
  a slow provider never blocks the request.
- Anyone who has opted out is skipped and counted as skipped, not failed.
- Per-campaign and daily ceilings apply.
- Delivery outcome per recipient is recorded: queued, sent, failed or skipped.

**US-17 — As a candidate, one click stops the email.**
- Every outreach email carries an unsubscribe link.
- The link works **without signing in** — it is reached by someone who may never sign in
  again.
- The token is signed, so a link cannot be forged for another address.

---

## 5. Business rules

| # | Rule | Enforced by |
|---|---|---|
| BR-1 | One account per email address | Unique index on `users.email` |
| BR-2 | One application per candidate per listing | Unique index on `(jobId, candidateUserId)` |
| BR-3 | One company per domain | Unique sparse index on `companies.domain` |
| BR-4 | One outreach recipient row per candidate per campaign | Unique index on `(campaignId, candidateUserId)` |
| BR-5 | Job status moves only along the legal graph | Frozen transition map, checked in the service |
| BR-6 | Application status moves only along the legal graph, **and** only by the permitted actor | Frozen transition + actor maps |
| BR-7 | A listing belongs to a company, never to an email | `companyId` from membership; body value ignored |
| BR-8 | A draft is visible only inside its owning company | Repository-level scoping; 404 otherwise |
| BR-9 | Only `published` listings accept applications | Checked in the application service |
| BR-10 | A résumé attached to an application is immutable | File id copied at submission |
| BR-11 | Completion weights total exactly 100 per role | Frozen weight maps |
| BR-12 | A candidate who opted out is never emailed | Filtered at recipient resolution *and* at send |
| BR-13 | Demo seed data never reaches production | Seeder aborts when `NODE_ENV=production` |

---

## 6. Non-functional requirements

### 6.1 Security

| # | Requirement |
|---|---|
| NFR-S1 | Passwords bcrypt-hashed at cost ≥ 12; never returned by any endpoint |
| NFR-S2 | Access tokens short-lived (15 min default) and never written to browser storage |
| NFR-S3 | Refresh tokens `httpOnly`, path-scoped, rotated on use, stored only as a SHA-256 digest |
| NFR-S4 | Refresh-token replay revokes the whole family |
| NFR-S5 | Every request body, query and path parameter validated server-side before reaching a service |
| NFR-S6 | Another user's resource is indistinguishable from a non-existent one |
| NFR-S7 | Rate limiting globally, and tighter on credential and bulk-email endpoints |
| NFR-S8 | Security headers via helmet; CORS restricted to an explicit origin allowlist |
| NFR-S9 | No stack trace, driver message or query text ever reaches a client |
| NFR-S10 | Configuration by environment only; the process refuses to boot on an invalid one |
| NFR-S11 | Containers run as a non-root user with no dev dependencies present |

### 6.2 Reliability and correctness

| # | Requirement |
|---|---|
| NFR-R1 | Multi-document writes are transactional (employer registration) |
| NFR-R2 | Uniqueness enforced by database constraint, not read-then-write |
| NFR-R3 | An invalid state transition fails loudly rather than silently no-ops |
| NFR-R4 | The seeder is idempotent — re-running never duplicates or deletes |
| NFR-R5 | Startup order enforced by healthchecks, not sleeps |
| NFR-R6 | Database and uploads survive container replacement (named volumes) |

### 6.3 Quality

| # | Requirement |
|---|---|
| NFR-Q1 | > 90% coverage on statements, branches, functions and lines, both applications, enforced so the suite fails below it |
| NFR-Q2 | Lint and typecheck pass with zero errors; `strict` TypeScript, no `any` |
| NFR-Q3 | Unhappy paths covered explicitly, not only happy ones |
| NFR-Q4 | Unit tests use no real network and no real database |
| NFR-Q5 | The published API contract is generated from the validators, and every documented path is proven to exist by a test |

### 6.4 Operability

| # | Requirement |
|---|---|
| NFR-O1 | Whole stack starts with `docker compose up --build` and no other configuration |
| NFR-O2 | A populated demo dataset exists on first boot |
| NFR-O3 | Liveness endpoint reporting database reachability, used by the container healthcheck |
| NFR-O4 | Structured JSON logs carrying a request id |
| NFR-O5 | Interactive API documentation served by the API itself |

### 6.5 Usability

| # | Requirement |
|---|---|
| NFR-U1 | Each role lands on the screen it came for — candidates on jobs, employers on the talent pool |
| NFR-U2 | Validation errors appear per field, in the form, before submission |
| NFR-U3 | Search and filter state lives in the URL |
| NFR-U4 | Light and dark themes, following the OS until the user chooses |
| NFR-U5 | An empty or narrow result is visibly the consequence of active filters, not a fault |

---

## 7. Domain vocabulary

| Term | Meaning here |
|---|---|
| **Candidate** | A person seeking work. Owns one profile plus experience, education, certification and project entries |
| **Employer / HR** | A person hiring on behalf of a company |
| **Company** | The organisation that owns listings. Employers are members with `owner` or `member` |
| **Listing / Job** | A role a company is hiring for. Has a status lifecycle |
| **Application** | A candidate's submission against one listing. Has its own status lifecycle |
| **Talent pool** | The set of candidates open to work, browsable by employers |
| **Campaign** | One outreach send: a listing, a message, and a resolved recipient set |
| **Completion** | A 0–100 score over weighted profile fields, with the missing ones named |
| **Family** | All refresh tokens descended from one sign-in; revoked together on replay |

---

## 8. Assumptions

1. One person, one role. Someone who is both a candidate and a recruiter keeps two accounts.
2. Currency is INR throughout; there is no multi-currency handling.
3. Email addresses are unique across both roles — one address cannot be both.
4. A candidate's résumé is a document, not structured data; nothing parses it.
5. Employers are trusted with the talent pool. There is no per-employer quota beyond the
   outreach ceilings.
6. English only; no internationalisation layer.
