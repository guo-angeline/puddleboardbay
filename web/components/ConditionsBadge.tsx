import type { SavedConditionState } from "@/lib/savedConditions";

// Colors mirror PADDLE_COPY in ConditionsPanel.tsx so the two reads agree.
const STYLE: Record<SavedConditionState, { label: string; bg: string; text: string }> = {
  calm:    { label: "Calm",    bg: "#DBF3F0", text: "#0E7F78" },
  breezy:  { label: "Breezy",  bg: "#FEF3E8", text: "#B4671F" },
  windy:   { label: "Windy",   bg: "#FEE9E0", text: "#CC5528" },
  unknown: { label: "No data", bg: "#EEF3F9", text: "#8AA0B4" },
  loading: { label: "…",       bg: "#EEF3F9", text: "#8AA0B4" },
};

export default function ConditionsBadge({ state }: { state: SavedConditionState }) {
  const s = STYLE[state];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.text }}
      aria-label={state === "loading" ? "Loading conditions" : `Conditions: ${s.label}`}
    >
      {s.label}
    </span>
  );
}
