import type { SavedConditionState } from "@/lib/savedConditions";

// Colors mirror PADDLE_COPY in ConditionsPanel.tsx so the two reads agree.
const STYLE: Record<SavedConditionState, { label: string; bg: string; text: string }> = {
  calm:    { label: "Calm",    bg: "#ECFDF5", text: "#065F46" },
  breezy:  { label: "Breezy",  bg: "#FEFCE8", text: "#854D0E" },
  windy:   { label: "Windy",   bg: "#FEF2F2", text: "#991B1B" },
  unknown: { label: "No data", bg: "#F5F5F4", text: "#78716C" },
  loading: { label: "…",       bg: "#F5F5F4", text: "#78716C" },
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
