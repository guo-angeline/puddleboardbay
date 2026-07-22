import type { DisplayRating } from "@/lib/rating";

/**
 * The star + number, wherever it appears. One component so the list and the
 * sheet can never drift into describing the same number two different ways.
 *
 * Three different things can produce a number here, and they are not
 * interchangeable:
 *
 *  - BLENDED (owner rating + user reviews): labelled "our take". Item 84
 *    (owner-directed) removed the previous "Paddle score" wording, and the
 *    re-gate that followed made clear the WORDING was the owner's to choose
 *    but the attribution itself is a floor, for two reasons. First, a bare
 *    star and number beside a "Paddler reviews" heading, above the reviews
 *    themselves, reads as the verdict of those reviews when at one review it
 *    is 5/6 our own opinion.
 *    Second, and the one with teeth: an attributed rating is OPINION, which
 *    is the strongest defence if a named private business objects, while an
 *    unattributed aggregate reads as a factual report of what paddlers think.
 *    The label is that defence, not decoration. It must stay VISIBLE (never
 *    sr-only, never a tooltip) and must sit before the " · " separator so the
 *    city truncates before the attribution does. A blended value must also
 *    never carry a bare "(N)" or the visible words "paddler reviews", which
 *    would credit contributors with a number they did not produce.
 *  - PADDLERS ONLY (spots with no owner rating, past D24's threshold): a plain
 *    arithmetic average, so it keeps D24's count-always-shown display.
 *  - OWNER ONLY (no reviews yet): unchanged from item 39 / D21.
 */
export default function SpotRating({ rating }: { rating: DisplayRating }) {
  const reviewWord = rating.count === 1 ? "review" : "reviews";
  return (
    <>
      <span aria-hidden className="text-(--accent)">
        &#9733;
      </span>{" "}
      {rating.value.toFixed(1)}
      {rating.blended ? (
        <>
          {/* Adequate for assistive tech, and deliberately NOT the fix for
              sighted users: a disclosure only cures an impression for the
              audience that receives it. */}
          <span className="sr-only">
            {` out of 5, combining our own rating with ${rating.count} paddler ${reviewWord}`}
          </span>
          <span aria-hidden className="font-normal text-(--muted)">
            {" "}
            our take
          </span>
        </>
      ) : rating.count > 0 ? (
        <>
          <span className="sr-only">{` out of 5 from ${rating.count} paddler ${reviewWord}`}</span>
          <span aria-hidden className="font-normal text-(--muted)">
            {" "}
            ({rating.count})
          </span>
        </>
      ) : (
        <span className="sr-only"> out of 5</span>
      )}
    </>
  );
}
