"use client";

import type { AdminData } from "@/lib/admin/shape";
import { Panel, ReadOnlyNotice } from "./shared";

export function AdminWall({ data }: { data: AdminData }) {
  if (!data.wallEnabled) {
    return (
      <Panel title="Community wall" subtitle="Currently switched off.">
        <ReadOnlyNotice>
          `NEXT_PUBLIC_DP_GALLERY` is not set, so no card can be submitted and
          the endpoints answer 404. The public wall shows labelled placeholders
          until it is on. See ADR 0021, 0026 and 0030.
        </ReadOnlyNotice>
        <p className="text-body-m text-black02/80">
          Before switching it on: someone has to watch the wall (cards publish
          without review by default, ADR 0027), a takedown has to be honourable
          for someone who lost their token, and there is still no way for a
          visitor to report a card — GAPS.md G21.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Community wall"
      subtitle={`${data.counts.wallApproved} live, ${data.counts.wallPending} waiting.`}
    >
      <ReadOnlyNotice>
        The review queue is an API, not a screen:{" "}
        <code>GET /api/dp/gallery/pending</code> lists what is waiting, and{" "}
        <code>PATCH /api/dp/gallery/:id</code> approves or rejects. Rejecting
        deletes the image rather than hiding it.
      </ReadOnlyNotice>
      <p className="text-body-m text-black02/80">
        Cards are published on arrival unless <code>DP_GALLERY_REVIEW=1</code>{" "}
        is set (ADR 0027), so this queue is usually empty by design — it is a
        remedy, not a gate. Building a moderation screen before anyone has
        submitted a card would be guessing at what the reviewer needs.
      </p>
    </Panel>
  );
}
