"use client";

import { useMemo } from "react";
import { trackIntent } from "@/lib/analytics";
import { useGenuineView } from "@/lib/useGenuineView";
import { deriveLog, MARKS, type MarkReview } from "@/lib/marks";
import { LOG_EMPTY, LOG_LABELS, LOG_TITLE } from "@/lib/markCopy";
import { exploredRegions } from "@/lib/exploredSpots";

/**
 * Item 83: the personal collection, in the account sheet.
 *
 * THREE RULES, each enforced by a test in marks.test.ts and
 * reviews-guards.test.ts, because each is one careless edit away from being a
 * different product:
 *
 * 1. NO DENOMINATOR. "23 spots known", never "23 of 139" and never a
 *    percentage or a progress bar. A completion meter over launch sites is an
 *    invitation to complete the list, and the list is places to get in the
 *    water.
 * 2. UNEARNED MARKS SHOW THEIR CRITERION, NEVER THE DISTANCE TO IT. "Three
 *    reports live", not "2 more to go". Threshold proximity is the documented
 *    Stack Overflow steering effect, and steering is the thing to avoid here.
 * 3. NOTHING IS COMPARED TO ANYONE. No averages, no percentiles, no ranks.
 *    With ~3 contributors that would be status in a room of three, and it is
 *    also what keeps site-granted standing off public UGC (D30 Q1).
 *
 * The log never animates and never celebrates. Retroactive marks (owner
 * decision, 2026-07-21) simply appear here, already earned, which is the whole
 * point of deriving them: there is no award event to replay. The one moment
 * that does celebrate is the post-submit one, and it compares the log before
 * the submission against the log after it.
 */
export default function YourLog({
  reviews,
  savedCount,
}: {
  reviews: MarkReview[];
  savedCount: number;
}) {
  const log = useMemo(
    () => deriveLog(reviews, exploredRegions(), [], savedCount),
    [reviews, savedCount]
  );

  const viewRef = useGenuineView({
    key: "your-log",
    onView: () => {
      trackIntent("log_viewed", {
        reports: log.reportsLive,
        spots_known: log.spotsKnown,
        marks: log.earned.length,
      });
    },
  });

  const earned = new Set(log.earned);

  return (
    <div ref={viewRef} className="mt-6 border-t border-(--border) pt-4">
      <h3 className="text-sm font-semibold text-(--dark)">{LOG_TITLE}</h3>

      <p className="mt-1 text-sm text-(--muted)">
        {LOG_LABELS.reportsLive(log.reportsLive)}
        {log.reportsPending > 0 && ` · ${LOG_LABELS.reportsPending(log.reportsPending)}`}
        {" · "}
        {LOG_LABELS.spotsKnown(log.spotsKnown)}
        {" · "}
        {LOG_LABELS.spotsWatched(log.spotsWatched)}
      </p>

      {log.earned.length === 0 && <p className="mt-2 text-sm text-(--muted)">{LOG_EMPTY}</p>}

      <ul className="mt-3 flex flex-wrap gap-2">
        {MARKS.map((m) => {
          const has = earned.has(m.id);
          return (
            <li
              key={m.id}
              className={`rounded-lg border px-2.5 py-1.5 text-xs ${
                has ? "border-(--accent) text-(--accent)" : "border-(--border) text-(--muted)"
              }`}
              // The criterion is the accessible description either way, so a
              // screen reader hears what a mark is for, not just its name.
              title={m.criterion}
            >
              <span className={has ? "font-semibold" : undefined}>{m.name}</span>
              {!has && <span className="ml-1.5 opacity-80">{m.criterion}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
