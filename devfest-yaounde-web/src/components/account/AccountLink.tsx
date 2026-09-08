import { UserCircle } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";

/**
 * The way back to what you already bought.
 *
 * `/account` existed but nothing pointed at it except the payment
 * confirmation — a screen you see once and navigate away from. So the only
 * route back to your own ticket was to start buying another one. This sits on
 * the tickets and shop pages, and the same destination is now in the footer
 * of every page.
 *
 * Deliberately a quiet link rather than a button: someone arriving to buy
 * should not be offered an exit with the same weight as the thing they came
 * for.
 */
export function AccountLink({ label }: { label: string }) {
  return (
    <Link
      href="/account"
      className="mt-5 inline-flex items-center gap-2 font-mono text-mono-tag font-bold uppercase tracking-wide text-black02 underline decoration-2 underline-offset-4 transition-colors hover:text-black02/60"
    >
      <UserCircle size={16} weight="bold" aria-hidden />
      {label}
    </Link>
  );
}
