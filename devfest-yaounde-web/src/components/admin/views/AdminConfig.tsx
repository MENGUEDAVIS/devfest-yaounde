"use client";

import {
  BEVY_URL,
  CODE_OF_CONDUCT_URL,
  PRIVACY_POLICY_URL,
  SITE_URL,
} from "@/lib/site-config";
import { DataTable, Panel, ReadOnlyNotice } from "./shared";

export function AdminConfig() {
  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Links and configuration"
        subtitle="What the public site currently points at."
      >
        <ReadOnlyNotice>
          Read-only for the same reason as the content: these live in{" "}
          <code>src/lib/site-config.ts</code> and{" "}
          <code>messages/&#123;fr,en&#125;.json</code>, and a running site
          cannot write to its own source. A small `settings` table would be
          enough for just these — see{" "}
          <strong>docs/decisions/0029-editorial-content-store.md</strong>.
        </ReadOnlyNotice>
        <DataTable
          headers={["Setting", "Value", "Where it lives"]}
          empty=""
          rows={[
            ["Site URL", SITE_URL, "src/lib/site-config.ts"],
            ["Bevy event", BEVY_URL, "src/lib/site-config.ts"],
            [
              "Privacy policy",
              PRIVACY_POLICY_URL === "#" ? "not set" : PRIVACY_POLICY_URL,
              "src/lib/site-config.ts",
            ],
            [
              "Code of conduct",
              CODE_OF_CONDUCT_URL === "#" ? "not set" : CODE_OF_CONDUCT_URL,
              "src/lib/site-config.ts",
            ],
            [
              "Announcement message",
              "messages/{fr,en}.json → announcement.message",
              "messages/*.json",
            ],
          ].map(([k, v, where]) => [
            <span key="k" className="font-bold">
              {k}
            </span>,
            <span key="v" className="break-all font-mono text-caption">
              {v}
            </span>,
            <code key="w" className="font-mono text-caption">
              {where}
            </code>,
          ])}
        />
      </Panel>

      <Panel
        title="The announcement message"
        subtitle="Editing it is a repo change today."
      >
        <p className="text-body-m text-black02/80">
          It appears in the bar at the top of every page (and at the bottom of
          the community wall), in both languages. The bar marquees only when the
          text does not fit, so a message under roughly 90 characters sits still
          — which reads calmer. Both languages must be edited together: a
          missing key fails the locale-parity check.
        </p>
      </Panel>
    </div>
  );
}
