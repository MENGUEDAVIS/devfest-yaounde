/**
 * `mailto:` links that arrive with a subject and a friendly opening already
 * written (PHASE23 feedback).
 *
 * A bare `mailto:` opens an empty message, and an empty box is the moment most
 * people give up: what do I say, what do they need to know? A subject that
 * names the situation and a body that says hello and leaves a couple of blanks
 * to fill in makes reaching us a matter of typing one sentence.
 *
 * The COPY lives in `messages/*.json` (`mail.*`) so both languages are edited
 * in one place; this file only builds the URL. Plain module — no `server-only`,
 * no React — so server components, client components and the transactional
 * email templates all share it, and it has one test.
 *
 * Encoding is RFC 6068: subject and body are percent-encoded (spaces as %20,
 * never `+`, which many mail clients would show literally), and line breaks
 * are CRLF (%0D%0A) — a bare LF becomes a space in several clients.
 */

export interface MailDraft {
  subject?: string;
  body?: string;
}

const encode = (value: string) =>
  encodeURIComponent(value.replace(/\r?\n/g, "\r\n"));

/** `mailto:to?subject=…&body=…`, omitting whatever is not given. */
export function mailtoHref(to: string, draft: MailDraft = {}): string {
  const query: string[] = [];
  if (draft.subject) query.push(`subject=${encode(draft.subject)}`);
  if (draft.body) query.push(`body=${encode(draft.body)}`);
  return query.length ? `mailto:${to}?${query.join("&")}` : `mailto:${to}`;
}

/** Is this href a `mailto:` link at all? */
export function isMailtoHref(href: string): boolean {
  return /^mailto:/i.test(href.trim());
}

/**
 * Adds a draft to a `mailto:` link somebody authored WITHOUT one — the FAQ
 * answers' "Email us" buttons live in editable content.
 *
 * A link that already has its own query (`?subject=…`) is left exactly as it
 * is: whoever wrote that chose those words. So is anything that is not a
 * plain `mailto:` with a sensible address, which is never rewritten.
 */
export function withMailDraft(href: string, draft: MailDraft): string {
  const match = /^mailto:([^\s?<>"]+)$/i.exec(href.trim());
  return match ? mailtoHref(match[1], draft) : href;
}
