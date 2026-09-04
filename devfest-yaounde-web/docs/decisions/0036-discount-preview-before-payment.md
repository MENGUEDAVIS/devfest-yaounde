# 0036 — Show the discount before the payment page

Date: 2026-09-04
Status: Accepted — reverses the conclusion of `GAPS.md` G4, keeps its reasoning

## Context

The discount field submitted with the order and nothing else. "Apply" set a
boolean; the copy said the code would be applied at payment time. So the
sequence for a buyer holding a code was:

1. type the code, see "we'll apply it when you order";
2. press pay;
3. leave the site for PawaPay;
4. read the real total there, for the first time.

`GAPS.md` G4 chose this deliberately, and gave a real reason: an endpoint that
answers "is this code valid" is a free oracle for guessing codes.

Reported on 2026-09-04: _"I shouldn't reach there and discover things."_ Also
asked for: the ability to remove a code and try another one, on both the
tickets and the shop checkout.

## The problem with the old conclusion

The reasoning was sound. The conclusion was too strong, for two reasons.

**The oracle already existed.** Anyone could POST a real checkout with a
guessed code and read `discount_invalid` off the response. Refusing to build
a preview endpoint did not close that; it only made each guess cost the
creation of a payment intent. The fence was never "there is no endpoint" —
it was always the rate limit, which was already there.

**The cost fell on the wrong person.** An attacker guessing codes was mildly
inconvenienced. A buyer holding a real code was told the amount they owed
only after committing to pay it. Finding out what you owe at the till is not
a checkout, it is an ambush.

## Decision

`POST /api/checkout/quote` prices a basket without committing to it, and the
order summary shows subtotal, the deduction with its code, and what is left
to pay. The code can be removed and another tried, right up until payment.

**The fence is what carries the security, and it got sharper.**

- Sign-in required. A guess is attributable to a Google identity rather than
  to a stranger with an address.
- Every call is metered by a new `quote` bucket, generous on purpose: a buyer
  changing their mind about quantities re-prices on every click, and that is
  the feature working.
- **Only a REJECTED code charges the `discountCode` fence.** This is the part
  worth stating plainly, because it looks like a weakening and is not.
  Counting every submission fenced the wrong thing: every guess an attacker
  makes is wrong, so guessing still costs exactly what it did before, while a
  buyer holding a real code was spending the budget just by re-pricing their
  own basket — and could be locked out of the checkout they were in the
  middle of. The old behaviour throttled legitimate use and guessing equally;
  the new one throttles only guessing.
- Nothing is created, reserved or incremented by a quote. The redemption is
  still claimed inside `create_payment_intent`, at payment time, once.

**A quote is not a promise.** The server re-prices from the catalog at
checkout and that later number is what is charged. The screen says as much.

**The preview and the real checkout share one pricing function.**
`quoteTierCounts` was split out of `quoteTickets` so both run the same
arithmetic. Two functions that each work out a ticket total eventually
disagree, and the one shown disagreeing with the one charged is the worst
possible pairing. A test asserts they agree.

**The basket is re-priced whenever it changes under an applied code.** A
discount is a function of the basket: 10% off 30 000 is not 10% off 45 000.
Applying a code and then adding a ticket would otherwise leave a stale number
on screen — stale in the direction that flatters us and disappoints the
buyer. If the code stopped working in between, the discount is dropped and
the reason surfaces rather than the saving lingering.

## Consequences

- G4 in `GAPS.md` is closed rather than deleted. Its reasoning is why the
  fence exists; only its conclusion changed.
- The quote endpoint is new reachable surface for the pricing rules, so the
  off-site RSVP refusal (ADR 0008) is enforced there too, with a test that
  says so. A check that only guards the old path is not a check.
- The client mirrors the list of discount-failure codes rather than importing
  the server module. A test keeps the two in step.
- One code per order, still. Stacking was never supported and this does not
  add it.
- A code accepted for a quote can still be refused at payment: a single-use
  code can be spent by someone else in the seconds between. The screen keeps
  the basket, clears the code, and says why.

## What this does not do

It does not hold a price. Nothing is reserved by looking, and a code that
runs out between the quote and the payment is gone — which is the correct
behaviour for a limited code, and the reason the payment-time check stays
authoritative.
