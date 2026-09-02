# 0021 — The community wall, and the narrow hole it puts in ADR 0015

Date: 2026-09-02
Status: Accepted — **frontend only; the backend is specified, not built**

## Context

ADR 0015 decided that the DP generator's photo never leaves the device, and
was explicit about what would change that:

> **No public gallery of generated DPs is possible** without reversing this
> decision. That would reintroduce uploads and every requirement above — it
> should be a new decision record, not a quiet feature addition.

A community wall has now been asked for: people save their creations, and the
chapter shows what the community made. This is that decision record.

## Decision

**One card may leave the device, when the person asks for it, per card.**

Everything else in ADR 0015 stands. The generator still works with no
account, no network and no server; the download is still composed locally at
full size and never uploaded. What is added is a single, explicit,
per-card action that sends **a separate, smaller copy** to the chapter.

Concretely:

- **Opt-in, never remembered.** The consent box is unticked for every card. Consent
  to publish one picture of your face is not consent to publish the next one.
- **A different, lighter image.** 640px on the long edge, JPEG — not the file
  the person downloads. Roughly thirty times smaller to store, serve and
  review.
- **Reviewed before it is public.** Submissions land as `pending`. Nothing
  appears on the wall until a human has approved it.
- **Removable without an account.** The API returns a deletion token, kept in
  `localStorage`, that authorises a takedown.
- **Off until the backend exists.** `NEXT_PUBLIC_DP_GALLERY` gates the whole
  feature. Unset, the screen renders no wall control at all — not a disabled
  one, not a "coming soon" one. A button that quietly fails is worse than no
  button; that is the same rule that removed the fake fulfilment picker (G13).

## What this costs, stated plainly

ADR 0015 listed what the no-upload rule bought. The wall gives some of it
back, and each item is now real work someone has to do:

| ADR 0015 said                   | With the wall                                               |
| ------------------------------- | ----------------------------------------------------------- |
| Nothing to validate server-side | The upload endpoint must validate type, size and dimensions |
| No EXIF to strip                | **Still true** — see below                                  |
| No retention policy             | A retention and takedown policy is required                 |
| No upload rate limit            | Required. `bump_rate_limit` already exists                  |
| No storage bill                 | Small, but real, and it grows every year                    |
| No moderation surface           | Required before anything is public                          |

**EXIF genuinely does not come back.** The uploaded image is re-encoded from
the compositor's canvas, so GPS coordinates, camera serial and capture time
were never in those pixels. That is a property of how the card is made, not a
filter someone has to remember to run.

**The security checklist's "Uploads (DP Generator)" section applies again**,
where ADR 0015 had annotated it as not applicable. It should be un-annotated
in the same change that ships the endpoint.

## The part that is not a technical problem

The wall publishes **photographs of people's faces, under names they chose,
on a public page**. The controls above are the minimum, and none of them is
optional:

- Consent must be **informed** — the copy says the photo goes to GDG Yaoundé
  and appears publicly, not "share your creation".
- Review must be **before** publication, not after a complaint.
- Takedown must be honoured on request, from the token or from a person
  simply asking, without proof of identity that nobody can produce.
- Cards of **minors** should not be knowingly published. The generator asks
  nobody's age and should not start, so this is a moderation instruction, not
  a form field.

If the chapter is not prepared to run the review queue, the honest move is to
leave the flag off. The feature degrades to exactly today's behaviour.

## Consequences

- `src/lib/dp/gallery.ts` holds the whole client side, dark behind the flag.
- The backend contract is `docs/backend/dp-gallery-contract.md`. It is
  **specified and not built** — no endpoint, no table, no bucket. GAPS.md G20.
- A `/community` or `/wall` page does not exist and is not part of this
  decision. Reading the wall is a separate piece of work with its own
  pagination, moderation display and abuse-report path.
- Supabase Storage is the recommended home over S3, because the project
  already has Supabase with RLS and a rate limiter, and the only AWS
  dependency in the app is SSM for one parameter. That is a recommendation,
  not a requirement — the contract is storage-agnostic.
