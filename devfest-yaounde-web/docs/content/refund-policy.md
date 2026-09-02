# Refund policy

**Tickets are non-refundable and non-cancellable once paid.** Not for a change
of plans, and not after the event.

A paid ticket **can be transferred**: the buyer tells us the new attendee's
name before the day and we reissue it in that name. That is the release valve,
and it is the reason a flat no-refunds rule is defensible rather than harsh.

The free tier is not affected — it is an RSVP on the community platform, not a
purchase, and nobody has paid anything to release.

## Where this is stated

Deliberately in several places, none of them small print:

| Where                      | Form                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `/tickets`, payment step   | Body-sized text plus a **required** acknowledgment checkbox that gates the pay button |
| `/faqs`, Tickets & Pricing | `faq-refunds` in `src/data/faqs.json`                                                 |
| This file                  | The policy itself                                                                     |

The checkbox is unticked by default and payment cannot proceed without it. It
is not pre-checked, not hidden behind a link, and not written smaller than the
text around it — someone is about to part with money, and a policy they have
to hunt for is a dark pattern.

## What is NOT enforced server-side

**The acknowledgment is a client-side gate only.** There is no field for it in
`ticketCheckoutSchema`, so a request posted directly to `/api/checkout/tickets`
succeeds without it. That is recorded as gap **G9** in
`docs/backend/GAPS.md`.

This matters if the acknowledgment is ever needed as evidence of consent. As a
UI affordance it does its job; as a legal record it does not exist. Deciding
whether that is enough is a question for whoever owns the policy, not a bug to
be quietly patched in the frontend.

## If this changes

Refunds would need real backend work — money movement is manual in the PawaPay
dashboard today (`docs/backend/GAPS.md` G2). Changing the policy is therefore
not a copy edit; it is a feature.
