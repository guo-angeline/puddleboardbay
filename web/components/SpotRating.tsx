import type { DisplayRating } from "@/lib/rating";

/**
 * The star + number, wherever it appears. One component so the list and the
 * sheet can never drift into describing the same number two different ways.
 *
 * The label is the honest part and is not decoration. Three different things
 * can produce a number here, and they get three different labels:
 *
 *  - BLENDED (owner rating + user reviews): labelled "Paddle score", because it
 *    is computed by us and is mostly our own rating until reviews accumulate.
 *    It must never carry a bare "(N)" or the words "paddler reviews", which
 *    would credit the number to contributors who did not produce it. The legal
 *    gate returned needs-changes on exactly that (2026-07-21).
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
          <span className="sr-only">
            {` out of 5, Paddle score combining our own rating with ${rating.count} paddler ${reviewWord}`}
          </span>
          <span aria-hidden className="font-normal text-(--muted)">
            {" "}
            Paddle score
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
