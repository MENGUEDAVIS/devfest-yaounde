---
name: devfest-security
description: Use when writing or editing any code that touches authentication, payment/checkout, forms or user-submitted input, file uploads, API routes, environment variables/secrets, or third-party integrations on the DevFest Yaoundé site. OWASP Top 10 (2021) applied specifically to this project's surfaces — ticket checkout, shop checkout, the shared account system, DP generator uploads, discount codes.
---

# DevFest Yaoundé Security Rules

No auth, payment, or form-handling code ships without checking this skill first. This is not generic security advice — it's OWASP Top 10 (2021) mapped onto this project's actual surfaces.

| OWASP Category                           | Applied here                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A01 Broken Access Control**            | Ticket/order ownership checks on `/account` — a logged-in user can only ever see their own tickets/orders. Never trust a client-supplied user/order ID without a server-side ownership check.                                                                                                                         |
| **A02 Cryptographic Failures**           | No secrets in the repo, ever — `.env.example` committed, real `.env*` gitignored (already covered by the scaffold's `.gitignore`). HTTPS-only in production. Hashed/salted credentials if auth isn't fully delegated to a vetted provider (see `docs/decisions/0003-payments-and-auth.md` — provider not yet chosen). |
| **A03 Injection**                        | Validate and sanitize every form input server-side (attendee details, discount codes, DP generator nickname) — never trust client-side validation alone, even though client-side validation is still good UX.                                                                                                         |
| **A04 Insecure Design**                  | Threat-model the checkout and auth flows on paper before writing them, not after. If a flow feels like it's being figured out as the code is written, stop and sketch the failure modes first.                                                                                                                        |
| **A05 Security Misconfiguration**        | Secure headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) once real routes exist. No verbose stack traces in production error pages.                                                                                                                                                                        |
| **A06 Vulnerable/Outdated Components**   | `npm audit` (or equivalent) as part of CI once CI exists. Keep dependencies current, especially anything touching payments.                                                                                                                                                                                           |
| **A07 Identification & Auth Failures**   | Rate-limit login attempts, secure session cookies (`httpOnly`, `secure`, `sameSite`). Don't reinvent auth logic if a vetted provider covers it — see the open decision in `0003-payments-and-auth.md`.                                                                                                                |
| **A08 Software/Data Integrity Failures** | Verify payment-gateway webhook signatures before trusting a payment confirmation. Commit and respect the lockfile (`package-lock.json`) — don't hand-edit it.                                                                                                                                                         |
| **A09 Logging & Monitoring Failures**    | Log auth/payment events for debugging and fraud review — but never log full card numbers, passwords, or other PII in plaintext.                                                                                                                                                                                       |
| **A10 SSRF**                             | Any server-side fetch triggered by user input (unlikely on this site, but flag it if it comes up) must validate the target before fetching.                                                                                                                                                                           |

## Project-specific measures beyond the OWASP mapping

- **Rate-limiting** on public unauthenticated forms — DP generator uploads, discount code entry — to prevent abuse.
- **DP generator uploads**: validate file type and size server-side, strip EXIF data before storing/serving (EXIF can leak location/device data from a user's photo).
- **Shop image protection is a soft deterrent only.** `PAGES.md` §8 already documents this explicitly — `user-select: none` and a `contextmenu` handler stop casual copying, not screenshots. Don't re-litigate this as if it were a real technical barrier; a watermark is the documented stronger option if that's ever needed.
- **Attendee PII** (names, emails collected for ticket check-in) should be handled with basic awareness of Cameroon/regional data protection expectations — minimal retention, no unnecessary third-party sharing, no plaintext logging (ties back to A09 above).

## When this skill doesn't have the answer

If a specific auth/payment implementation question comes up that depends on which provider gets chosen, don't guess — that decision is still open in `docs/decisions/0003-payments-and-auth.md`. Flag it there rather than picking a default.

See also `docs/setup/security-checklist.md` — the same table, written for a human to skim before a release rather than for Claude Code to apply while writing code.
