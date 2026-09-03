# Security Checklist

A plain-language checklist to skim before every release — not exhaustive, but covers the risks specific to this site. See `.claude/skills/devfest-security/SKILL.md` for the same rules aimed at Claude Code while it writes code.

## Access control

- [ ] Can a logged-in user only see their own tickets and orders on `/account`? (Not someone else's, even by guessing/changing an ID in the URL or request.)

## Secrets

- [ ] Are all API keys, webhook secrets, and credentials kept out of the repo? (`.env.example` committed with placeholder values, real `.env*` files gitignored.)
- [ ] Is the site served over HTTPS in production?

## Forms & input

- [ ] Is every form (attendee details, discount codes, DP generator nickname) validated and sanitized on the server, not just in the browser?

## Design & process

- [ ] Was the checkout/auth flow sketched out and its failure modes considered before it was built?
- [ ] Are security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) set in production?
- [ ] Do production error pages avoid showing stack traces or internal details?

## Dependencies

- [ ] Has `npm audit` (or equivalent) been run recently, especially after adding anything touching payments?

## Auth & sessions

- [ ] Are login attempts rate-limited?
- [ ] Are session cookies set with `httpOnly`, `secure`, and `sameSite`?

## Payments

- [ ] Are payment-gateway webhook signatures verified before a payment is trusted as confirmed?
- [ ] Is `package-lock.json` committed and unedited by hand?

## Logging

- [ ] Do auth/payment logs avoid recording full card numbers, passwords, or other PII in plaintext?

## Uploads (DP Generator) — APPLIES AGAIN IF THE COMMUNITY WALL IS SWITCHED ON

The generator still composites entirely in the browser and, **as shipped,
uploads nothing** (`docs/decisions/0015-dp-generator-client-side.md`). With
`NEXT_PUBLIC_DP_GALLERY` unset there is no upload endpoint and no stored copy,
so this section is dormant.

**The community wall (ADR 0021) reverses that, narrowly**, and the boxes below
come back the moment the flag is set. The contract in
`docs/backend/dp-gallery-contract.md` covers each one; this checklist is where
they are signed off.

- [ ] Are uploaded images validated by **sniffing the bytes**, not trusting
      `Content-Type` — type, size and dimensions?
- [ ] Are they **re-encoded server-side** before being stored or served?
      (The client's canvas output carries no EXIF, but bytes a stranger
      supplied should not be served back untouched.)
- [ ] Is the upload **rate limited**? (`bump_rate_limit`, bucket
      `dp_gallery`.)
- [ ] Is the bucket **private**, with reads through a signed URL or a proxy,
      so a rejected or withdrawn card stops being reachable?
- [ ] Does every row carry a **consent record** — the flag, the timestamp and
      the exact wording shown?
- [ ] Is nothing public before a **human review**, and does rejection actually
      **delete the image**?
- [ ] Is there a **takedown path** that works both from the deletion token and
      from a person simply asking?
- [ ] Is a **retention rule** written down?

If any box is unticked, the flag should stay off — the feature degrades to
today's behaviour, which is safe.

## Data handling

- [ ] Is attendee PII (names, emails) retained only as long as needed for check-in, not shared with third parties unnecessarily?

## Known non-protections (don't treat these as security controls)

- Shop product image right-click/selection blocking is a casual-copying deterrent only — it does not stop screenshots and is not a real access control. See `PAGES.md` §8.
