import {
  GlobeSimple,
  LinkedinLogo,
  XLogo,
} from "@phosphor-icons/react/dist/ssr";
import { MorphedImageFrame } from "@/components/ui/MorphedImageFrame";
import { realSocials } from "@/lib/people-socials";
import type { TeamMember } from "@/data/types";

/*
 * The card's profile links come from the shared rule in
 * `@/lib/people-socials`, with the SERVER icon set attached here — this file
 * renders on the server, so it imports Phosphor from `/dist/ssr` while the
 * client components import from the package root. That difference is why the
 * list used to be written twice.
 */
const SOCIAL_ICONS = { x: XLogo, linkedin: LinkedinLogo, website: GlobeSimple };

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
  const socials = realSocials(member).map((social) => ({
    ...social,
    Icon: SOCIAL_ICONS[social.key],
  }));

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
      {member.oneLiner && (
        <p className="mt-3 text-body-m text-black02/80">
          {member.oneLiner[locale]}
        </p>
      )}
      {member.icebreakerAnswer && (
        <p className="mt-3 border-l-4 border-primary pl-3 text-body-m italic text-black02/75">
          {member.icebreakerAnswer[locale]}
        </p>
      )}
      {socials.length > 0 && (
        <div className="mt-4 flex gap-2">
          {socials.map(({ key, href, Icon, label }) => (
            <a
              key={key}
              href={href}
              aria-label={`${member.name} — ${label}`}
              className="flex h-11 w-11 items-center justify-center rounded-pill border-2 border-black02 text-black02 transition-[background-color,transform] duration-200 ease-bouncy hover:-translate-y-0.5 hover:bg-primary motion-reduce:transform-none"
            >
              <Icon size={20} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
