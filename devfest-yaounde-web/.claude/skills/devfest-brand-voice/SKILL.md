---
name: devfest-brand-voice
description: Use when writing microcopy for the DevFest Yaoundé site — button labels, empty states, error messages, confirmation screens, or emails. Covers the "friends who build things" tone with concrete before/after examples.
---

# DevFest Yaoundé Brand Voice

Source: `DESIGN.md` §0 and `PAGES.md` §10.3. The vibe in one sentence: *a developer meetup thrown by friends who happen to be really, really good at building things — bold like Google, warm like home.* Every piece of copy should feel like a community member talking to a friend, not a press release or a sterile SaaS product.

## The tone

- Warm, playful, credible — never sterile, never corporate, never over-the-top gimmicky.
- Active, direct phrasing over generic form-speak.
- Celebratory where it's earned (a purchase, a confirmation) — matches the bouncy animation energy from the design system, so the copy and the motion should feel like the same personality.
- Still genuinely useful and clear — playful is not an excuse to be vague, especially in transactional flows (checkout, forms, errors).

## Before → After examples

| Context | Sterile (don't) | DevFest voice (do) |
|---|---|---|
| Ticket purchase button | "Submit" | "Grab your ticket" |
| Add to cart | "Add to cart" | "Add to bag" |
| Empty schedule | "No data available" | "Schedule's still cooking — check back soon 👀" |
| Empty search results | "No results found" | "Nothing here yet — try a different search" |
| Ticket confirmation | "Your order has been processed." | "You're in! 🎉 Ticket's on its way to your inbox." |
| Order placed (shop) | "Order confirmed." | "Order locked in — we'll let you know the moment it's ready." |
| Generic error | "An error occurred." | "Something glitched on our end — give it another shot?" |
| Form validation | "Field required." | "Don't forget this one — we need it to save your ticket." |
| Newsletter/community CTA | "Subscribe" | "Join the community" |

## Rules

- Never write copy so playful it obscures what's actually happening — checkout, payment, and account flows must stay clear even while warm (a confused user during checkout is a worse outcome than a slightly less fun sentence).
- Celebratory moments (ticket bought, order placed, easter egg found) deserve real personality — this is where the voice can be loudest.
- Everyday transactional UI (form labels, nav, settings) can be simpler and more neutral — save the loudest voice for moments that deserve it, per the design system's "one bold move per screen" principle.
- All copy must exist in both French and English before a feature ships — see the `devfest-i18n` skill. Tone should carry across both; a literal translation that loses the warmth isn't done, it needs a native-feeling rewrite in each language.
