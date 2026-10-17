# Architecture Research

**Domain:** Adult venue site, public marketing area plus paid members-only area (profiles, media, messages), staff CMS, WordPress migration
**Researched:** 2026-10-17
**Confidence:** MEDIUM (patterns are well established and come from experience; no web or Context7 verification was done. The WordPress hash details and the specific library choices need a check in the phase that implements them.)

## Standard Architecture

Recommendation: a single deployable monolith (a TypeScript full-stack framework such as Next.js App Router, with Postgres and S3-compatible object storage). It is not a set of microservices and not a headless CMS plus separate API. The traffic is small, the team is small, and the staff must be able to run it. The stack choice itself belongs in STACK.md. This document only assumes "SSR/ISR web app + relational DB + private object storage".

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│ Edge / CDN (Cloudflare or similar): cache, WAF, redirects, rate  │
│ limit.  Public HTML cached; /membros/* and /api/* never cached  │
├──────────────────────────────────────────────────────────────────┤
│                     Web app (one deployable)                     │
│ ┌────────────┐ ┌─────────────┐ ┌──────────────┐ ┌─────────────┐  │
│ │ Public     │ │ Members     │ │ Staff admin  │ │ Route       │  │
│ │ site (SSG/ │ │ area (SSR,  │ │ /admin (own  │ │ handlers /  │  │
│ │ ISR, SEO)  │ │ no-store)   │ │ auth, roles) │ │ server acts │  │
│ └─────┬──────┘ └──────┬──────┘ └──────┬───────┘ └──────┬──────┘  │
│       │   Age gate    │  Access guard │  Role guard    │         │
│       │   (cookie)    │  (session +   │  (staff role)  │         │
│       │               │  entitlement) │                │         │
├───────┴───────────────┴───────────────┴────────────────┴─────────┤
│                 Domain / service layer (no UI code)              │
│  content · profiles · subscriptions · messaging · media · auth   │
│  audit-log · migration                                           │
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌───────────────────┐  ┌────────────────────┐  │
│ │ Postgres     │  │ Object storage    │  │ Email (transac.)   │  │
│ │ (all data)   │  │ public bucket +   │  │ reset, notices     │  │
│ │              │  │ PRIVATE bucket    │  │                    │  │
│ └──────────────┘  └───────────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Public site | Home, festas (flyer, detail page), espaço, modelos (SFW), contos teasers, Quem Somos (Normas/Regras/Dicas), endereço/mapa, teasers of restricted content | Statically generated or ISR pages, revalidated on staff publish; no user data in the HTML |
| Age gate | 18+ confirmation without signup | Cookie set client side after confirmation, with a lightweight overlay. Never `noindex` the content because of it, and let crawlers through (see Pitfall 3) |
| Auth | Subscriber and staff login, reset, session | Server-side sessions in the DB (revocable) with an httpOnly cookie. Argon2id hashing. Staff and subscribers are separate principal types, staff with 2FA if affordable |
| Entitlement (subscription) | The question "may this user see members content right now?" | `subscriptions` table with `status`, `starts_at`, `expires_at`. Computed at request time (`now() < expires_at`), so no cron is required for access to lapse |
| Members area | ClassiSex listing and profile, full contos, recados/mensagens | SSR, `Cache-Control: private, no-store`, guard in middleware plus re-check in the data layer |
| Media service | Upload, derivatives, public vs private delivery | Direct upload via presigned PUT, image resizing (AVIF/WebP), private bucket served only by short-lived signed URLs or an authenticated proxy |
| Messaging (recados) | Posts and direct messages between subscribers with contact info | Plain relational tables, no realtime in v1 (page load or light polling) |
| Staff admin / CMS | CRUD for festas, flyers, fotos, vídeos, contos, pages; subscriber management; moderation | Either a CMS embedded in the app (e.g. Payload) or custom `/admin` CRUD. Decide in STACK.md. The subscriber management screen is custom either way |
| Audit log | Who activated, renewed, expired or removed what, and when | Append-only table written by the service layer (LGPD accountability) |
| Migration tooling | One-off import of WP users, profiles, media, contos, URL map | Idempotent scripts run from the CLI, not part of the runtime app |
| Redirects / SEO | Preserve old URLs, sitemap, OG, structured data | Redirect table generated from the migration URL map, applied at the edge or in config |

## Recommended Project Structure

```
src/
├── app/
│   ├── (public)/            # festas, espaço, modelos, contos teaser, quem-somos
│   ├── (members)/membros/   # classisex, recados, contos completos, conta
│   ├── (auth)/              # login, reset, idade
│   ├── admin/               # staff panel (separate layout, auth, role guard)
│   └── api/                 # upload-url, media proxy, webhooks (future gateway)
├── server/
│   ├── db/                  # schema, migrations, queries
│   ├── auth/                # sessions, password verify (+legacy WP hashes)
│   ├── access/              # requireMember(), requireStaff(), entitlement
│   ├── media/               # presign, derivatives, visibility rules
│   ├── content/ profiles/ messaging/ subscriptions/ audit/
│   └── email/
├── components/              # UI only; takes DTOs, never touches db
scripts/migration/           # extract-wp.ts, transform.ts, load.ts, verify.ts
```

### Structure Rationale

- **Route groups by trust level.** Public, members and admin each get their own layout and guard, so the cache policy and auth rule are set once per group and not per page.
- **`server/` owns every data access.** Components receive already-filtered DTOs. This is what stops contact data from leaking to the public area (see Pattern 2).
- **`scripts/migration/` is outside the runtime.** Migration is a one-time, re-runnable pipeline with its own verification, and it must not be shipped in the app bundle.

## Architectural Patterns

### Pattern 1: Public teaser and private detail as separate data shapes

**What:** Each restricted entity has two projections. A `PublicTeaser` has only blurred or SFW thumbnail, first name or apelido, age range, a short excerpt. A `MemberProfile` has everything including contact. The public pages call only the teaser query.
**When to use:** Always. The requirement is "prévias sem contato".
**Trade-offs:** Slight duplication. In exchange, a bug in a template cannot leak contact, because the query never returns it.

```typescript
// server/profiles/queries.ts
export const getPublicTeasers = () =>
  db.select({ id, apelido, cidade, thumbPublicKey }).from(profiles).where(eq(profiles.teaserApproved, true));
export async function getMemberProfile(ctx: MemberCtx, id: string) {
  assertEntitled(ctx);               // throws if no active subscription
  return db.query.profiles.findFirst({ where: eq(profiles.id, id) });
}
```

### Pattern 2: Defense in depth for gated content

**What:** Three layers: (1) middleware redirects unauthenticated requests on `/membros/*`; (2) every members page and data function calls `requireMember()` itself; (3) media is unreachable without a signed URL. Do not rely on middleware alone.
**When to use:** Always. Middleware-only authorization has had real bypass bugs in the Next.js ecosystem (MEDIUM confidence; verify the current advisories when implementing).
**Trade-offs:** More code, but it is cheap and it is the main protection of the product's value.

### Pattern 3: Two buckets, signed delivery for private media

**What:** The public bucket holds only approved SFW images (flyers, espaço, modelos, teaser thumbnails) behind the CDN. The private bucket holds profile photos and videos, with no public ACL. The app issues signed GET URLs with a short TTL (e.g. 5-15 min) after an entitlement check. Videos use Range requests and either signed URLs or a signed-cookie scheme. Derivatives (thumb, blur placeholder) are generated at upload, and a public teaser derivative is a separate object, never the original.
**When to use:** Always for member media.
**Trade-offs:** A signed URL can be shared while it is valid. Accept that and keep the TTL short. Do not promise DRM. Strip EXIF/GPS on upload.

### Pattern 4: Entitlement as computed state plus an audit trail

**What:** Staff actions "liberar / renovar / expirar" write a `subscriptions` row (period start, end, who, note) and an `audit_log` entry. Access is `exists active period covering now()`. Renewal adds a new period (history is preserved). A daily job is optional and only sends "vence em 7 dias" emails.
**When to use:** Manual payment v1. It also makes a future gateway an additional writer of the same table (a webhook handler), not a redesign.
**Trade-offs:** Slightly more than a single `expires_at` column, but it gives the history staff will ask about ("when did she pay?").

### Pattern 5: Legacy password hash verify-and-upgrade

**What:** Import WP hashes as-is into `password_hash` plus `hash_scheme` (`wp_phpass`, `wp_bcrypt`, `argon2id`). On a successful login with a legacy scheme, rehash with Argon2id and update the row. Users who never log in keep legacy hashes and can be forced through "reset password" after a cut-off date.
**Details to verify (MEDIUM):** classic WP uses phpass (`$P$` / `$H$`, MD5-iterated). WordPress 6.8+ switched new hashes to bcrypt with a `$wp$2y$` prefix, where the password is first pre-hashed (HMAC-SHA384, base64) before bcrypt. A site can contain a mix of all of them. Use a tested phpass library and replicate the pre-hash exactly, with test vectors from the real export.
**Trade-offs:** Legacy hashes sit in the DB temporarily. That is much better than mass-emailing resets that many members will ignore, but have the forced-reset fallback ready.

### Pattern 6: Publish triggers revalidation

**What:** Staff publishing a festa calls tag-based revalidation for the affected public pages, so the public site is served as cached static HTML and updates within seconds. Past festas move to an archive state automatically (derived from the date, not a manual flag).
**Trade-offs:** Needs the cache tags to be named consistently (`festa:{id}`, `festas-list`).

## Data Flow

### Request Flow

```
Visitor → CDN (hit) → static HTML (public)         [age cookie checked client side]
Visitor → /membros/x → middleware (session?) → page → requireMember()
        → entitlement query → DTO → HTML (no-store)
        → <img> src = signed URL (private bucket, TTL minutes)
Staff   → /admin → staff session+role → CRUD → service → DB
        → presigned PUT → bucket → derivative job → revalidate tags
```

### Key Data Flows

1. **Subscription activation:** subscriber pays outside the site (Pix, WhatsApp) → staff finds the user in /admin → "liberar/renovar" with period and note → `subscriptions` + `audit_log` → the next request is entitled. Offer a "new member" invite flow that creates the account and sends a set-password email.
2. **Media upload:** the client asks `/api/upload-url` (checks role and mime and size) → direct PUT to the bucket (private by default) → a processing step creates the derivatives and strips metadata → the row is marked `ready`. Staff must explicitly mark an item as "public" (separate public derivative). A consent record (`image_rights`: who, document or note, date) is required before an item can be made public. This addresses the direito de imagem constraint.
3. **WordPress migration (one-off, repeatable):** extract (WP DB dump, or REST/WXR export if no DB access) → transform (users, profile fields, media references, contos, URL map) → load into a staging DB → verify (counts, sample logins, media 200 OK) → rehearse on staging → cut over. Media files are copied to the private bucket, with original filenames normalised and the old-to-new key mapping stored.
4. **Messaging:** a subscriber posts a recado or sends a message → the service checks entitlement of the sender and the recipient → row → shown in the members area. Add a report button and a staff moderation queue from the start.
5. **Cutover / SEO:** the `redirects` map is built from the old WP URLs (the sitemap of the current site is the source) → 301 at the edge → the sitemap is submitted → monitor 404 logs for two to four weeks.

### State Management

Server-first. Server components fetch the data; the client holds only small interactive islands (age gate, upload widget, message composer). No global client store is needed.

## Suggested Build Order (dependency driven)

1. **Foundation:** repo, DB schema/migrations, deploy pipeline, environments, buckets, email, CDN rules, base layouts per route group. (Everything depends on it.)
2. **Auth, roles, and staff shell:** staff login and roles, subscriber login and reset, session handling, the `requireMember/requireStaff` guards, the audit log. (Gating must exist before any restricted content is built.)
3. **Content model + staff CMS + public site:** festas, flyers, espaço, modelos, Quem Somos, contos (with teaser/full split), age gate, SEO/OG/sitemap. This delivers the Core Value and can go live on a staging domain early.
4. **Media pipeline:** presigned upload, derivatives, public vs private buckets, signed delivery, consent records. (A prerequisite for profiles, and it can be developed in parallel with 3 if split by person.)
5. **Subscriptions + ClassiSex + teasers:** subscriptions admin (liberar/renovar/expirar, audit), profile CRUD, members listing/detail, public teasers, expiry behaviour.
6. **Messaging (recados/mensagens):** after the entitlement and profile identities exist. Includes the moderation and report features.
7. **Migration:** the schema is only stable after 2, 3 and 5, but start the data investigation early (step 0) because access to the WP DB is unknown. Run rehearsals on staging, then do the real import shortly before launch to minimise delta.
8. **Cutover and hardening:** redirects, performance budget (mobile), security review, LGPD pages (privacy policy, a data removal flow), backups and restore test, monitoring, DNS switch.

Parallel note: the migration investigation (what plugin holds the subscribers, which tables, which hash types, what profile fields exist) is a risk-reduction task and should begin in phase 1, even though the load happens late.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Hundreds to a few thousand members (expected) | The monolith plus one small Postgres instance is more than enough. Put the CDN in front of the public pages and the media. |
| ~10k+ | Add DB indexes on the listing filters, a connection pooler, and a queue for the media processing. |
| 100k+ | Not a realistic target for a local venue. Do not design for it. |

First bottleneck: media bandwidth and video (use object storage + CDN, never serve through the app server). Second: image processing at upload time (move to a background worker).

## Anti-Patterns

### Anti-Pattern 1: Hiding restricted content with CSS or client-side checks
**What people do:** Render the full profile (or contact) and blur or hide it in the browser.
**Why it's wrong:** The contact data and the photo URLs are in the HTML or network responses, and are indexable and scrapable.
**Do this instead:** Never send it. Separate teaser and member queries (Pattern 1).

### Anti-Pattern 2: Public URLs for private media (obscure filenames, "unlisted")
**What people do:** Upload to a public bucket or WP-style `/uploads/` directory and rely on the unguessable name.
**Why it's wrong:** The URLs leak (referrers, shares, search engines) and cannot be revoked. This is also how the current WP site probably works.
**Do this instead:** Private bucket and signed URLs (Pattern 3). The migration must move files out of the public uploads path, and the old URLs must 404 (or redirect to a teaser).

### Anti-Pattern 3: Expiring access with a cron that flips a flag
**What people do:** A nightly job sets `active=false`.
**Why it's wrong:** If the job fails, expired members keep access, and the flag drifts from the data.
**Do this instead:** Compute from the date at request time (Pattern 4).

### Anti-Pattern 4: Building a page-builder or heavy WYSIWYG for staff
**What people do:** Give staff free-form layout, recreating the Elementor problem.
**Why it's wrong:** Slow pages, inconsistent design, repeated markup.
**Do this instead:** Structured content types (festa has flyer + title + date + text + gallery) with a constrained rich-text field.

### Anti-Pattern 5: Cutting over without a redirect map and a reset plan
**What people do:** Switch DNS and discover the old URLs and the old passwords no longer work.
**Do this instead:** Build the redirect table from the real sitemap, and test legacy logins with real exported hashes before launch.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Object storage (S3-compatible, e.g. Cloudflare R2 or S3) | Presigned PUT/GET from the server | Private bucket must have no public listing. Verify that adult content is permitted under the provider's acceptable-use policy before choosing (a real risk, LOW confidence on any specific provider) |
| Hosting/CDN | Edge cache for the public pages, bypass for /membros, /admin, /api | Same caveat on the acceptable-use policy. Check before committing |
| Transactional email | API/SMTP, SPF/DKIM set up | Used for reset, invite and expiry notices. Adult-themed sender reputation: keep the content neutral |
| Maps | Static embed or link to a map | Avoid heavy JS on the first load. The address is not on the current site, so it is a content input from the client |
| Future payment gateway | Webhook writes to `subscriptions` | Out of scope for v1; keep the `subscriptions` shape compatible (source: `manual` / `gateway`) |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| UI ↔ server layer | Direct function calls (server components/actions) with DTOs | UI never imports the db module |
| Public ↔ members data | Separate query functions | Enforced by code review and a test that asserts the teaser DTO has no contact fields |
| Media ↔ content/profiles | Reference by `media_id`, visibility on the media row | The visibility change is audited |
| Admin ↔ public site | Cache revalidation by tag on publish | |
| Migration ↔ runtime | Shares only the DB schema | Scripts are run by hand, outside the app |

## Open Questions for the Roadmap

- WordPress access (DB dump vs only wp-admin vs nothing) decides how the migration is done. If there is no DB access, the hashes cannot be moved, and the fallback is invite-based re-registration (all members get a set-password email).
- Which plugin holds the subscriber data and the profile fields (determines the transform step).
- Staff CMS: embedded CMS vs custom admin (a STACK.md decision that changes the size of phase 3).
- Does a profile belong to the subscriber (self-managed) or is it staff-managed? This changes whether members need an upload UI and a moderation queue (assumed here: members edit their own profile, with staff approval before the teaser becomes public).
- Hosting provider policies for adult content.

## Sources

- Experience-based patterns (signed URLs, entitlement-by-date, two-tier DTOs). No Context7 or web verification was performed in this run.
- WordPress password hashing details (phpass and the 6.8 bcrypt change): from training knowledge, MEDIUM confidence. Verify against WordPress core release notes (6.8) before implementing the verify path.
- `/mnt/project-files/paraiso-site/.planning/PROJECT.md` (requirements and constraints).

---
*Architecture research for: adult venue site with a paid members area*
*Researched: 2026-10-17*
