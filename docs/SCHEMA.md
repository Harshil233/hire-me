# Hire Me — Database Schema

MongoDB 7, accessed through Mongoose 8. Every collection is reached only through its
module's repository; no service or controller touches the driver.

> **Companion documents:** [SPEC.md](SPEC.md) · [DESIGN.md](DESIGN.md) · [LLD.md](LLD.md)

---

## 1. Entity relationships

```
                                  ┌───────────────┐
                                  │     users     │
                                  │  email, role  │
                                  └───────┬───────┘
             ┌────────────────────────────┼────────────────────────────┐
             │ role = candidate           │                role = hr   │
             ▼                            │                            ▼
  ┌──────────────────────┐                │                  ┌──────────────────┐
  │ candidate_profiles   │                │                  │   hr_profiles    │
  │ 1:1 with user        │                │                  │  1:1 with user   │
  └──────────┬───────────┘                │                  └────────┬─────────┘
             │                            │                           │ companyId
             │ userId                     │                           ▼
   ┌─────────┼─────────┬─────────┐        │                  ┌──────────────────┐
   ▼         ▼         ▼         ▼        │                  │    companies     │
┌──────┐ ┌────────┐ ┌───────┐ ┌────────┐  │                  │  name, slug,     │
│ expe │ │ educa  │ │ certi │ │ proje  │  │                  │  domain (unique) │
│rience│ │ tions  │ │ficat. │ │ cts    │  │                  └────────┬─────────┘
└──────┘ └────────┘ └───────┘ └────────┘  │                           │ companyId
                                          │                           ▼
                                          │                  ┌──────────────────┐
                                          │                  │      jobs        │
                                          │                  │ draft/published/ │
                                          │                  │ closed           │
                                          │                  └────────┬─────────┘
                                          │                           │ jobId
                                          │        ┌──────────────────┴────────┐
                                          │        ▼                           ▼
                                          │  ┌──────────────┐        ┌────────────────────┐
                                          └─▶│ applications │        │ outreach_campaigns │
                                 candidateUserId  UNIQUE           │  companyId, jobId  │
                                          │  │ (jobId,      │        └─────────┬──────────┘
                                          │  │  candidate)  │                  │ campaignId
                                          │  └──────┬───────┘                  ▼
                                          │         │ resumeFileId   ┌────────────────────┐
                                          │         ▼                │ outreach_recipients│
                                          │  ┌──────────────┐        │ UNIQUE (campaign,  │
                                          ├─▶│    files     │        │         candidate) │
                                          │  └──────────────┘        └────────────────────┘
                                          │
                                          ├─▶ notifications      (userId, resourceKind/Id)
                                          └─▶ refresh_tokens     (userId, family, TTL)
```

### 1.1 Cardinality

| From | To | Cardinality | Via |
|---|---|---|---|
| `users` | `candidate_profiles` | 1 : 0..1 | `userId` |
| `users` | `hr_profiles` | 1 : 0..1 | `userId` |
| `hr_profiles` | `companies` | N : 1 | `companyId` |
| `companies` | `jobs` | 1 : N | `companyId` |
| `jobs` | `applications` | 1 : N | `jobId` |
| `users` (candidate) | `applications` | 1 : N | `candidateUserId` |
| `users` | `files` | 1 : N | `ownerUserId` |
| `users` (candidate) | `experiences` / `educations` / `certifications` / `projects` | 1 : N | `userId` |
| `users` | `notifications` | 1 : N | `userId` |
| `users` | `refresh_tokens` | 1 : N | `userId` |
| `companies` | `outreach_campaigns` | 1 : N | `companyId` |
| `outreach_campaigns` | `outreach_recipients` | 1 : N | `campaignId` |

**Why profiles are separate collections.** A candidate and an employer share almost no
fields. One `users` collection carrying both would be half-null on every document, and
every query would need a discriminator. Splitting them keeps each document dense and each
schema honest about what is required.

Every document carries Mongoose `timestamps`, so `createdAt` and `updatedAt` are present
throughout and are omitted from the tables below.

---

## 2. Collections

### 2.1 `users`

Identity and credentials only. Everything else about a person lives in their profile.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | ✅ | |
| `email` | string | ✅ | Unique, lowercased, trimmed |
| `passwordHash` | string | ✅ | bcrypt, cost 12. Never leaves the repository layer |
| `role` | enum | ✅ | `candidate` \| `hr`. Fixed at registration |
| `isActive` | boolean | ✅ | Default `true`. A disabled account fails sign-in |
| `lastLoginAt` | Date | — | Written only on a *successful*, role-correct sign-in |

| Index | Purpose |
|---|---|
| `{ email: 1 }` unique | One account per address; enforces BR-1 and backs every sign-in |

> `lastLoginAt` is deliberately **not** written when the right password is presented to
> the wrong role's login path — a timing- or state-observable difference would leak which
> role an email belongs to.

---

### 2.2 `candidate_profiles`

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | ObjectId → `users` | ✅ | 1:1 |
| `firstName` · `lastName` | string | ✅ | |
| `middleName` | string | — | |
| `profilePicFileId` | ObjectId → `files` | — | |
| `mobile` | `{ countryCode, number }` | — | Subdocument |
| `gender` | enum | — | `male` \| `female` \| `other` \| `prefer_not_to_say` |
| `dob` | Date | — | Age bounds 16–100 enforced in the schema |
| `currentLocation` | string | — | |
| `preferredLocations` | string[] | ✅ | Defaults to `[]` |
| `skills` | string[] | ✅ | Free text — see SPEC known limitations |
| `jobTypes` | enum[] | ✅ | Preferred employment types |
| `currentCtc` · `expectedCtc` | number | — | INR |
| `resumeFileId` | ObjectId → `files` | — | The *current* résumé; applications snapshot it |
| `isOpenToOutreach` | boolean | — | Absent on profiles written before the preference existed; those may be contacted |

**On the tri-state `isOpenToOutreach`.** `undefined` is not the same as `false`: it means
"never asked", which the code treats as contactable, while an explicit `false` is an opt-
out. Defaulting the field on read would erase that distinction and silently opt users back
in.

---

### 2.3 `hr_profiles`

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | ObjectId → `users` | ✅ | 1:1 |
| `companyId` | ObjectId → `companies` | — | Absent only for an account whose company link is not yet established |
| `companyRole` | enum | ✅ | `owner` \| `member`. Registration creates an `owner` |
| `firstName` · `lastName` | string | ✅ | |
| `middleName` · `designation` | string | — | |
| `profilePicFileId` | ObjectId → `files` | — | |
| `mobile` | `{ countryCode, number }` | — | |
| `gender` · `dob` | enum · Date | — | |

`companyRole` already models multi-member companies; the invitation flow that would
create a `member` is out of scope.

---

### 2.4 `companies`

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | ✅ | |
| `slug` | string | ✅ | Derived from the name |
| `description` | string | — | |
| `locations` | string[] | ✅ | Defaults to `[]` |
| `headquarters` · `address` | string | — | |
| `domain` | string | — | Unique **when present** |
| `logoFileId` | ObjectId → `files` | — | |
| `websiteUrl` · `linkedinUrl` · `facebookUrl` · `instagramUrl` · `googleMapsLink` | string | — | Validated as URLs |
| `createdByUserId` | ObjectId → `users` | ✅ | Audit trail |

| Index | Purpose |
|---|---|
| `{ domain: 1 }` unique **sparse** | One company per domain, while allowing many companies with no domain at all. A non-sparse unique index would let exactly one company omit it |

---

### 2.5 `jobs`

| Field | Type | Required | Notes |
|---|---|---|---|
| `companyId` | ObjectId → `companies` | ✅ | **Owns the listing** |
| `postedByUserId` | ObjectId → `users` | ✅ | Audit metadata only |
| `title` · `description` | string | ✅ | |
| `highlights` · `responsibilities` · `qualifications` | string[] | — | Absent on listings written before these existed |
| `role` | enum | ✅ | Filterable category, distinct from the free-text `title` |
| `jobType` | enum | ✅ | `full_time` \| `part_time` \| `contract` \| `internship` \| `freelance` |
| `workMode` | enum | ✅ | `onsite` \| `hybrid` \| `remote` |
| `skills` · `locations` | string[] | ✅ | Default `[]` |
| `ctcMin` · `ctcMax` | number | — | INR band |
| `experienceMinYears` · `experienceMaxYears` | number | — | |
| `status` | enum | ✅ | `draft` \| `published` \| `closed`. Default `draft` |
| `publishedAt` · `closedAt` | Date | — | Stamped on transition |

**Ownership is the company, not the poster.** `postedByUserId` is audit metadata; every
authorisation check reads `companyId`. A listing survives the person who created it
leaving, and the value is taken from the poster's own membership so a `companyId` in a
request body is ignored.

| Index | Purpose |
|---|---|
| `{ status: 1, publishedAt: -1 }` | The default candidate browse: published, newest first |
| `{ status: 1, role: 1, jobType: 1, workMode: 1 }` | The facet combination the filter sidebar offers |
| `{ companyId: 1, status: 1, createdAt: -1 }` | An employer listing their own postings, drafts included |
| `{ skills: 1 }` | Multikey index backing the skills filter |

> **No text index, deliberately.** Search spans the employer's *name* as well as the
> listing, which requires an `$or` — and MongoDB forbids `$text` inside one. The search is
> a case-insensitive regex instead: correct, and fast enough at this size. The scaling
> answer is Atlas Search or an external index, recorded as a known limitation.

---

### 2.6 `applications`

| Field | Type | Required | Notes |
|---|---|---|---|
| `jobId` | ObjectId → `jobs` | ✅ | |
| `candidateUserId` | ObjectId → `users` | ✅ | |
| `status` | enum | ✅ | `applied` \| `shortlisted` \| `rejected` \| `withdrawn`. Default `applied` |
| `resumeFileId` | ObjectId → `files` | — | **Snapshot** taken at submission |
| `coverNote` | string | — | Max 2000 characters |
| `statusUpdatedAt` | Date | ✅ | |
| `statusUpdatedByUserId` | ObjectId → `users` | — | Who moved it — the basis for notifying the other party |

| Index | Purpose |
|---|---|
| `{ jobId: 1, candidateUserId: 1 }` **unique** | One application per candidate per job |
| `{ candidateUserId: 1, createdAt: -1 }` | "My applications", newest first |
| `{ jobId: 1, status: 1, createdAt: -1 }` | The employer's applicant list, optionally narrowed by status |

> **The unique index is the concurrency control.** A read-then-write check would let two
> simultaneous requests both find nothing and both insert. The duplicate-key failure is
> translated to a 409 by the error middleware, so the race is closed by the database
> rather than by hopeful sequencing.

> **Why the résumé is snapshotted.** `resumeFileId` is copied from the profile at
> submission rather than followed by reference. An employer reading an application a week
> later sees what was actually sent, not whatever the candidate has uploaded since.

---

### 2.7 `files`

| Field | Type | Required | Notes |
|---|---|---|---|
| `ownerUserId` | ObjectId → `users` | ✅ | |
| `kind` | enum | ✅ | `profile_pic` \| `resume` \| `company_logo` |
| `storageKey` | string | ✅ | Opaque key resolved by the active storage adapter |
| `originalName` · `mimeType` | string | ✅ | MIME checked against `kind` on upload |
| `sizeBytes` | number | ✅ | Ceiling enforced by `MAX_UPLOAD_BYTES` |

`storageKey` is opaque on purpose: it is meaningful to the local-disk adapter today and
would be an S3 object key tomorrow, with no schema change.

---

### 2.8 `refresh_tokens`

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | ObjectId → `users` | ✅ | |
| `tokenHash` | string | ✅ | **SHA-256 of the token.** The raw value is never stored |
| `jti` | string | ✅ | Token id |
| `family` | string | ✅ | Rotation family — all tokens descended from one sign-in |
| `expiresAt` | Date | ✅ | |
| `revokedAt` | Date | — | Set on rotation, logout, or family revocation |
| `userAgent` | string | — | Audit aid |

| Index | Purpose |
|---|---|
| `{ expiresAt: 1 }` TTL, `expireAfterSeconds: 0` | MongoDB removes expired rows automatically — no cleanup job |

**How theft detection uses `family`.** Each refresh mints a new token in the same family
and revokes its predecessor. Presenting a token that is unknown *or already revoked* means
either a race or a stolen token; both are answered by revoking the entire family, so an
attacker's use of a stolen token immediately ends every session descended from that
sign-in — including their own.

---

### 2.9 `notifications`

| Field | Type | Required | Notes |
|---|---|---|---|
| `userId` | ObjectId → `users` | ✅ | Recipient |
| `type` | enum | ✅ | `application_status_changed` |
| `title` · `body` | string | ✅ | Rendered at write time |
| `resourceKind` | enum | ✅ | `application` \| `job` |
| `resourceId` | ObjectId | ✅ | So the UI can link straight to it |
| `isRead` | boolean | ✅ | Default `false` |
| `readAt` | Date | — | |

| Index | Purpose |
|---|---|
| `{ userId: 1, createdAt: -1 }` | The inbox, newest first |
| `{ userId: 1, isRead: 1 }` | The unread count, without scanning the inbox |

Notifications are **durable rows**, not a transient feed: they are written when the event
happens and read when the client shell mounts, so they survive a reload and need no socket.

---

### 2.10 `outreach_campaigns`

| Field | Type | Required | Notes |
|---|---|---|---|
| `companyId` | ObjectId → `companies` | ✅ | |
| `createdByUserId` | ObjectId → `users` | ✅ | |
| `jobId` | ObjectId → `jobs` | ✅ | Every campaign invites to one of the company's own listings |
| `subject` · `body` | string | ✅ | |
| `status` | enum | ✅ | `queued` \| `sending` \| `sent` \| `failed` |
| `recipientCount` · `sentCount` · `failedCount` · `skippedCount` | number | ✅ | Rolled up from the recipient rows |
| `completedAt` | Date | — | |

| Index | Purpose |
|---|---|
| `{ companyId: 1, createdAt: -1 }` | An employer's campaign list |
| `{ status: 1, createdAt: 1 }` | The worker claiming the oldest queued campaign |

The counters are a **denormalised roll-up** of the recipient rows, recomputed after each
batch. The rows remain the source of truth, so a counter can never drift into being the
only record of what happened.

---

### 2.11 `outreach_recipients`

| Field | Type | Required | Notes |
|---|---|---|---|
| `campaignId` | ObjectId → `outreach_campaigns` | ✅ | |
| `candidateUserId` | ObjectId → `users` | ✅ | **The user, not their address** |
| `status` | enum | ✅ | `queued` \| `sent` \| `failed` \| `skipped` |
| `error` | string | — | Provider failure reason |
| `sentAt` | Date | — | |

| Index | Purpose |
|---|---|
| `{ campaignId: 1, candidateUserId: 1 }` **unique** | Nobody is emailed twice by one campaign, even under a retry |
| `{ status: 1, campaignId: 1 }` | The worker taking the next queued batch |
| `{ candidateUserId: 1, createdAt: -1 }` | What a given candidate has been sent |

**Why a user id rather than an email address.** One source of truth for an address, and an
audit trail that never becomes a stale copy of personal data. `skipped` exists for someone
who unsubscribed between audience resolution and send — genuinely different from a failure,
and worth distinguishing when reading the outcome.

---

### 2.12 Profile sections

Four collections with the same shape: candidate-owned, always scoped by `userId`, all
served by one generic repository, service and controller.

**`experiences`**

| Field | Type | Required |
|---|---|---|
| `userId` | ObjectId → `users` | ✅ |
| `title` · `companyName` | string | ✅ |
| `description` | string | — |
| `startDate` | Date | ✅ |
| `endDate` | Date | — |
| `isCurrent` | boolean | ✅ |
| `skills` | string[] | ✅ |

Index: `{ userId: 1, startDate: -1 }`

**`educations`**

| Field | Type | Required |
|---|---|---|
| `userId` | ObjectId → `users` | ✅ |
| `college` · `course` · `degree` | string | ✅ |
| `description` | string | — |
| `startDate` | Date | ✅ |
| `endDate` | Date | — |
| `isCurrent` | boolean | ✅ |

Index: `{ userId: 1, startDate: -1 }`

**`certifications`**

| Field | Type | Required |
|---|---|---|
| `userId` | ObjectId → `users` | ✅ |
| `title` · `issuedBy` | string | ✅ |
| `issuedOn` | Date | ✅ |
| `expiresOn` | Date | — |
| `credentialUrl` · `description` | string | — |

Index: `{ userId: 1, issuedOn: -1 }`

**`projects`**

| Field | Type | Required |
|---|---|---|
| `userId` | ObjectId → `users` | ✅ |
| `title` | string | ✅ |
| `description` · `domain` · `link` | string | — |
| `skills` | string[] | ✅ |
| `startDate` | Date | ✅ |
| `endDate` | Date | — |
| `isCurrent` | boolean | ✅ |

Index: `{ userId: 1, startDate: -1 }`

Each index is `(userId, date desc)` because every query is the same: *this user's entries,
most recent first*. The compound form serves both the filter and the sort from one index.

---

## 3. Constraints, at a glance

| Constraint | Mechanism | Rule |
|---|---|---|
| One account per email | Unique index `users.email` | BR-1 |
| One application per candidate per job | Unique index `(jobId, candidateUserId)` | BR-2 |
| One company per domain | Unique **sparse** index `companies.domain` | BR-3 |
| One outreach row per candidate per campaign | Unique index `(campaignId, candidateUserId)` | BR-4 |
| Expired refresh tokens disappear | TTL index on `expiresAt` | — |
| Enumerations | Mongoose `enum`, sourced from frozen constants | — |
| Field lengths, ranges, formats | Zod at the API boundary, plus Mongoose `maxlength` where it protects the store | — |

Referential integrity is the **application's** job: MongoDB has no foreign keys, so every
cross-collection read goes through a repository method that scopes by owner. This is the
acknowledged cost of the document model, and it is why "does this belong to you" is a
service-layer rule tested explicitly rather than a database guarantee.

---

## 4. Lifecycle notes

- **Transactional writes.** Employer registration writes `users`, `companies` and
  `hr_profiles` in one transaction — the reason MongoDB runs as a replica set.
- **Nothing is hard-deleted** except profile-section entries, which the owner explicitly
  removes. Applications are withdrawn, not deleted; listings are closed, not deleted.
- **Automatic cleanup** applies only to refresh tokens, via the TTL index.
- **Seeding is additive and idempotent.** The seeder drives the real services rather than
  writing to collections directly, so passwords are hashed, slugs are derived, transitions
  are validated and notifications fire exactly as they do in the running app. An account
  that already exists is reused; nothing is ever deleted. It refuses to run when
  `NODE_ENV` is `production`.
