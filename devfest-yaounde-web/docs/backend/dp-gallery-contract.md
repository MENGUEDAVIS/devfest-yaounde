# The community wall — backend contract

**Status: specified, not built.** Nothing in this document exists yet. The
frontend is written against it and is switched off until it does
(`NEXT_PUBLIC_DP_GALLERY`). See ADR 0021 for why the wall reverses ADR 0015's
no-upload rule, and what that costs.

This is the whole surface. Build these three endpoints and set one environment
variable, and the button appears with no frontend change.

## Where the bytes should live

**Supabase Storage, not S3** — a recommendation, not a requirement. The
project already runs Supabase with RLS, Auth and a working rate limiter
(`bump_rate_limit`), and the only AWS dependency in the app is
`@aws-sdk/client-ssm` for a single parameter. Adding an S3 client, a second
credential path and a second access-control model buys nothing here. If S3 is
preferred anyway, everything below holds — only the storage calls change.

Suggested bucket: `dp-cards`, **private**. Public reads should go through a
signed URL or a proxy route, so a rejected or withdrawn card stops being
reachable the moment its row changes.

## The table

```sql
create table dp_cards (
  id            uuid primary key default gen_random_uuid(),
  storage_path  text not null,                    -- e.g. dp-cards/2026/<id>.jpg
  nickname      text not null check (length(nickname) <= 28),
  locale        text not null check (locale in ('fr','en')),

  -- The consent record. Not a boolean on its own: WHEN, and against WHICH
  -- wording, is what makes it evidence rather than a claim.
  consent       boolean not null default false check (consent),
  consent_at    timestamptz not null,
  consent_text  text not null,                    -- the exact string shown

  -- Nothing is public until a human says so.
  status        text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  reviewed_by   uuid references auth.users(id),
  reviewed_at   timestamptz,

  -- Takedown without an account: this hash is the only proof of authorship.
  deletion_hash text not null,
  created_at    timestamptz not null default now(),
  -- Coarse, for rate limiting and abuse only. Not an identifier to keep.
  submitter_ip  inet
);

alter table dp_cards enable row level security;
-- Anonymous clients may INSERT (through the endpoint's service role) and may
-- SELECT nothing. The wall reads through a view limited to status='approved'.
```

`deletion_hash` stores a **hash** of the token, never the token itself — the
same reasoning as a password. The token is returned once, to the browser.

## `POST /api/dp/gallery`

`multipart/form-data`, no authentication.

| Field       | Type         | Notes                                     |
| ----------- | ------------ | ----------------------------------------- |
| `image`     | file         | JPEG, ≤ 400 KB, ≤ 800px on the long edge  |
| `nickname`  | string       | ≤ 28 characters                           |
| `locale`    | `fr` \| `en` |                                           |
| `consent`   | `"true"`     | Reject the request if it is anything else |
| `consentAt` | ISO 8601     |                                           |

**Must do, in this order:**

1. **Rate limit** on IP via `bump_rate_limit('dp_gallery', ip, 3600)`. Suggest
   5 per hour. Return **429** over the limit — the client shows a "give it a
   minute" message for exactly this status.
2. **Validate the bytes, not the headers.** Sniff the magic number; confirm it
   decodes as an image; confirm the dimensions. A `Content-Type` from a
   browser is a claim, not a fact. Return **422** for anything that fails.
3. **Re-encode server-side.** Even though the client's canvas output carries
   no EXIF, do not serve bytes a stranger supplied. This is also where a
   dimension cap is genuinely enforced.
4. **Store** under a generated id. Never use the nickname in the path.
5. **Insert** the row with `status='pending'` and `consent_text` set to the
   exact wording that was on screen (`pages.dpGenerator.wall.consent`, in the
   submitted locale) — the record has to say what the person agreed to.
6. **Return `201`** with `{ "deletionToken": "<opaque>" }`, storing only its
   hash.

Responses the client already understands: `201`, `429`, `422`, anything else
is a generic failure. It never shows a raw server message.

## `DELETE /api/dp/gallery/:id`

Header `X-Deletion-Token`. Hash it, compare, and on a match delete the object
and the row (or set `status='rejected'` and delete the object — either is
fine, but the image must actually go).

**Honour a plain request too.** Someone who cleared their site data has no
token and is still entitled to a takedown; that path is a human one, and the
team needs to be able to do it from the review queue.

## `GET /api/dp/gallery` — for the wall page

Returns approved cards only, newest first, paginated. No IP, no consent
timestamps, no tokens. A card that is `pending` or `rejected` must be
invisible and its URL unguessable.

## Moderation

There is no queue UI, and it is required before the flag goes on. It is the
same shape as the organiser tools in G5: list `pending`, show the image and
the nickname, approve or reject. Two considerations that are not obvious:

- **Reject should delete the image**, not just hide it. A rejected face
  sitting in a bucket is the harm the review was meant to prevent.
- **Do not publish cards of children.** The generator asks nobody's age and
  should not start, so this is an instruction to whoever reviews.

## Retention

Nothing here decides how long a wall from 2026 stays up. Pick a rule before
launch and write it next to the policy that already covers refunds and
exchanges — "until the next edition" is a reasonable default and is a
decision, not an oversight.

## The one environment variable

```
NEXT_PUBLIC_DP_GALLERY=1
```

Set it only once the endpoint, the moderation queue and the retention rule
all exist. Until then the frontend renders no wall control at all, which is
the correct behaviour and not a bug.
