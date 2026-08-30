import {
  GlobeSimple,
  LinkedinLogo,
  XLogo,
} from "@phosphor-icons/react/dist/ssr";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import type { TeamMember } from "@/data/types";

function socialsOf(m: TeamMember) {
  const out: {
    key: string;
    href: string;
    Icon: typeof XLogo;
    label: string;
  }[] = [];
  if (m.social?.x)
    out.push({ key: "x", href: m.social.x, Icon: XLogo, label: "X" });
  if (m.social?.linkedin)
    out.push({
      key: "in",
      href: m.social.linkedin,
      Icon: LinkedinLogo,
      label: "LinkedIn",
    });
  if (m.social?.website)
    out.push({
      key: "web",
      href: m.social.website,
      Icon: GlobeSimple,
      label: "Website",
    });
  return out;
}

/**
 * Alumni card — a plain, static, server-rendered variant.
 *
 * Past organisers are a "this community has history" moment, not something
 * you filter or drill into, so they deliberately skip the interactive
 * swipe-up card: no client JS, no expand affordance to mislead. Their
 * icebreaker answer is shown inline instead, since there's no panel to hide
 * it behind.
 */
export function TeamCardStatic({
  member,
  locale,
}: {
  member: TeamMember;
  locale: "fr" | "en";
}) {
  const socials = socialsOf(member);

  return (
    <div>
      <MorphedImageFrame
        src={member.photoUrl}
        alt={member.name}
        aspectRatio="1/1"
        className="border-2 border-black02 shadow-[0_5px_0_0_var(--color-black02)]"
      />
      <p className="mt-5 font-sans text-heading-m font-bold leading-tight text-black02">
        {member.name}
      </p>
      <p className="mt-1 font-mono text-caption text-black02/70">
        {member.contribution[locale]}
        {member.years ? ` · ${member.years}` : ""}
      </p>
      <p className="mt-3 text-body-m text-black02/80">
        {member.oneLiner[locale]}
      </p>
      <p className="mt-3 border-l-4 border-primary pl-3 text-body-m italic text-black02/75">
        {member.icebreakerAnswer[locale]}
      </p>
      {socials.length > 0 && (
        <div className="mt-4 flex gap-2">
          {socials.map(({ key, href, Icon, label }) => (
            <a
              key={key}
              href={href}
              aria-label={`${member.name} — ${label}`}
              className="flex h-10 w-10 items-center justify-center rounded-pill border-2 border-black02 text-black02 transition-[background-color,transform] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-primary motion-reduce:transform-none"
            >
              <Icon size={20} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
