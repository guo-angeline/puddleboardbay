"use client";

import type { Spot } from "@/lib/types";
import { DIFFICULTY_LABEL } from "@/lib/types";

interface Props {
  spot: Spot | null;
  onClose: () => void;
}

const DIFF_STYLES: Record<string, { bg: string; text: string }> = {
  flatwater: { bg: "#ECFDF5", text: "#065F46" },
  bay:       { bg: "#F0F9FF", text: "#0369A1" },
  river:     { bg: "#FFF7ED", text: "#9A3412" },
  unknown:   { bg: "#F5F5F4", text: "#78716C" },
};

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-xs text-gray-600 font-medium">
      {label}
    </span>
  );
}

export default function SpotDrawer({ spot, onClose }: Props) {
  if (!spot) return null;

  const diff = DIFF_STYLES[spot.difficulty] ?? DIFF_STYLES.unknown;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;

  const tags: string[] = [];
  if (spot.dog_friendly)        tags.push("Dog friendly");
  if (spot.tide_sensitive)      tags.push("Tide sensitive");
  if (spot.rentals_available)   tags.push("Rentals available");
  if (spot.inspection_required) tags.push("Inspection required");
  if (spot.power_boats === true)  tags.push("Power boats OK");
  if (spot.power_boats === false) tags.push("No power boats");

  return (
    <>
      {/* Backdrop (mobile) — must be above Leaflet's z-index 1000 */}
      <div
        className="fixed inset-0 bg-black/20 md:hidden"
        style={{ zIndex: 1100 }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className="fixed bottom-0 left-0 right-0 md:static md:border-l md:border-gray-200 md:z-auto bg-white md:w-80 md:shrink-0 rounded-t-2xl md:rounded-none overflow-y-auto max-h-[70vh] md:max-h-none md:h-full shadow-2xl md:shadow-none"
        style={{ zIndex: 1200 }}
      >
        {/* Handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-['Libre_Baskerville'] text-xl font-bold text-[--dark] leading-tight">
                {spot.water}
              </h2>
              <p className="text-sm text-[--muted] mt-1">{spot.city} &middot; {spot.region}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5 text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ background: diff.bg, color: diff.text }}
            >
              {DIFFICULTY_LABEL[spot.difficulty]}
            </span>

            {spot.has_fee === true && spot.fee_amount && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700">
                ${spot.fee_amount} launch fee
              </span>
            )}
            {spot.has_fee === false && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                Free
              </span>
            )}
            {spot.has_fee === null && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                Fee unknown
              </span>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {tags.map((t) => <Tag key={t} label={t} />)}
            </div>
          )}

          {/* Notes */}
          {spot.notes && (
            <div className="text-sm text-gray-700 leading-relaxed mb-5 bg-[--bg] rounded-xl p-3.5">
              {spot.notes}
            </div>
          )}

          {/* Actions */}
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[--accent] text-white text-sm font-semibold hover:bg-[--dark] transition-colors"
          >
            Get Directions
          </a>
        </div>
      </div>
    </>
  );
}
