import { getLocale } from "next-intl/server";
import { Reveal } from "@/components/ui/Reveal";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { StatCounter } from "@/components/ui/StatCounter";
import stats from "@/data/stats.json";
import type { Stat } from "@/data/types";

const statList = stats as Stat[];

export async function StatsInterstitial() {
  const locale = (await getLocale()) as "fr" | "en";

  return (
    <SectionContainer background="yellow" maxWidth="6xl">
      <div className="grid grid-cols-1 gap-14 sm:grid-cols-3 sm:gap-10">
        {statList.map((stat, i) => (
          <Reveal key={stat.id} index={i}>
            <StatCounter
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label[locale]}
            />
          </Reveal>
        ))}
      </div>
    </SectionContainer>
  );
}
