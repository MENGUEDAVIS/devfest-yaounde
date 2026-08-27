# Modal

`src/components/ui/Modal.tsx`

Generic modal shell — the open/close mechanics only. `PAGES.md` §4.2's Speaker Modal (Phase 4) fills this with speaker-specific content.

## Props

| Prop         | Type         | Default                                                                            |
| ------------ | ------------ | ---------------------------------------------------------------------------------- |
| `open`       | `boolean`    | required                                                                           |
| `onClose`    | `() => void` | required                                                                           |
| `children`   | `ReactNode`  | required                                                                           |
| `labelledBy` | `string`     | auto-generated `useId()` — pass the id of your own heading element if you have one |
| `closeLabel` | `string`     | `"Close"` — **localize this**, the shell has no translation context of its own     |
| `className`  | `string`     | — applied to the panel                                                             |

## What it handles

- Renders via `createPortal` into `document.body` (escapes any stacking-context issues from the fixed navbar/banner).
- Focus trap: focuses the first focusable element on open, cycles `Tab`/`Shift+Tab` within the panel, restores focus to whatever triggered the modal on close.
- `Escape` closes. Clicking the backdrop closes.
- Locks body scroll while open.
- Entrance: backdrop fade + panel scale-in (`modalBackdropIn` + `modalPopIn` from `devfest-animation`) — `DESIGN.md` §6.1 maps "modal open" to ease-out, meso tier.

## What it deliberately does _not_ do yet

`PAGES.md` §4.2 asks for the modal to feel like it "grows from the clicked card" — a shared-element/FLIP transition. This generic shell has no knowledge of any specific trigger card's position, so it uses a centered scale+fade instead, which is still spec-correct per `DESIGN.md` §6.1's ease-out/meso mapping for modal-open. A true shared-element transition would need either an origin rect wired in by the caller (doable without a new dependency, just more code) or an animation library (flagged, not installed — see `docs/decisions/0002-tech-stack.md`). Worth revisiting once the Speaker Modal (Phase 4) has a real card to originate from, rather than building that fidelity speculatively now.

## Usage

```tsx
import { Modal } from "@/components/ui/Modal";
import { useTranslations } from "next-intl";

const t = useTranslations("common");
const [open, setOpen] = useState(false);

<Modal open={open} onClose={() => setOpen(false)} closeLabel={t("close")}>
  <h2 id="my-heading">...</h2>
  ...
</Modal>;
```

## Built on

`react-dom`'s `createPortal`, native focus/keyboard APIs — no dialog/modal library.
