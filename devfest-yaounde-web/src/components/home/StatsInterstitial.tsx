import { getLocale } from "next-intl/server";
import { SectionContainer } from "@/components/ui/SectionContainer";
import { StatCounter } from "@/components/ui/StatCounter";
import stats from "@/data/stats.json";
import type { Stat } from "@/data/types";

const statList = stats as Stat[];

export async function StatsInterstitial() {
  const locale = (await getLocale()) as "fr" | "en";

  return (
    <SectionContainer background="offwhite" maxWidth="5xl">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {statList.map((stat) => (
          <StatCounter
            key={stat.id}
            value={stat.value}
            suffix={stat.suffix}
            label={stat.label[locale]}
          />
        ))}
      </div>
    </SectionContainer>
  );
}
