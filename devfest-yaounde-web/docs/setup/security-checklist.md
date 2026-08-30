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

## Uploads (DP Generator)

- [ ] Are uploaded photos validated for file type and size on the server?
- [ ] Is EXIF metadata stripped from uploaded photos before storing/serving them?

## Data handling

- [ ] Is attendee PII (names, emails) retained only as long as needed for check-in, not shared with third parties unnecessarily?

## Known non-protections (don't treat these as security controls)

- Shop product image right-click/selection blocking is a casual-copying deterrent only — it does not stop screenshots and is not a real access control. See `PAGES.md` §8.
