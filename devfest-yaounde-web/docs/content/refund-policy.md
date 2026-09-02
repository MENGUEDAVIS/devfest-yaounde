# Refund and exchange policy

**Two policies, because a seat on a day and a hoodie are not the same thing.**

## Tickets — non-refundable

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
directly to the API succeeds without it. Recorded as **G9** in
`docs/backend/GAPS.md`, and flagged there as a backend-phase priority.

The _policies_ are settled; what is not recorded is the **consent**.

This matters if the acknowledgment is ever needed as evidence of consent. As a
UI affordance it does its job; as a legal record it does not exist. Deciding
whether that is enough is a question for whoever owns the policy, not a bug to
be quietly patched in the frontend.

## Shop — non-refundable, but exchangeable

**Settled 2026-09-02.** Goods get their own terms:

| Situation                 | What happens                      |
| ------------------------- | --------------------------------- |
| Changed your mind         | **No refund.** Same as tickets.   |
| Arrived damaged or faulty | **Replaced.**                     |
| Wrong item sent           | **Replaced.**                     |
| Apparel, wrong size       | **Exchanged**, while stock lasts. |

The reasoning: a non-refundable rule is ordinary for an event ticket, whose
value is the seat on the day. It is unusual for a physical product, where "the
wrong size arrived" is nothing like "I changed my mind about coming" — and
apparel is most of the catalog.

**Exchanges are handled manually, off-platform**: by getting in touch, or in
person at the next event. Nothing in the product supports an exchange flow, and
none was invented for one — this is a policy someone honours, not a feature.

The shop's acknowledgment copy says exactly this rather than the flat
"non-refundable" tickets use.

## If this changes

Refunds would need real backend work — money movement is manual in the PawaPay
dashboard today (`docs/backend/GAPS.md` G2). Changing the policy is therefore
not a copy edit; it is a feature.
