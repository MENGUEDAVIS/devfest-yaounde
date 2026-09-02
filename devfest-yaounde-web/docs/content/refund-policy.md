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

**The acknowledgment is a client-side gate only**, for tickets and shop
alike. There is no field for it in either checkout schema, so a request posted
directly to the API succeeds without it. Recorded as **G9** (tickets) and
**G14** (shop) in `docs/backend/GAPS.md`.

This matters if the acknowledgment is ever needed as evidence of consent. As a
UI affordance it does its job; as a legal record it does not exist. Deciding
whether that is enough is a question for whoever owns the policy, not a bug to
be quietly patched in the frontend.

## Goods are not tickets — this is worth a second look

The same policy currently covers **shop orders**, and that is a copy decision
rather than a settled one. A non-refundable rule is ordinary for an event
ticket, whose value is the seat on the day. It is unusual for a physical
product, where the normal expectation is a return window, and where "the wrong
size arrived" is a different situation from "I changed my mind about coming".

The FAQ (`faq-shop-returns`) currently says damaged or incorrect items are
sorted out directly, which covers the worst case — but there is no stated
exchange window for a size that does not fit, and apparel is most of the
catalog.

**This is flagged, not decided.** Recorded as gap **G14**.

## If this changes

Refunds would need real backend work — money movement is manual in the PawaPay
dashboard today (`docs/backend/GAPS.md` G2). Changing the policy is therefore
not a copy edit; it is a feature.
