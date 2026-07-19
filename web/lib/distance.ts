import type { Spot } from "@/lib/types";

const R = 3958.8; // Earth radius in miles

export function distanceMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function nearbySpots(
  current: Spot,
  allSpots: Spot[],
  count = 3
): Array<{ spot: Spot; miles: number }> {
  return allSpots
    .filter((s) => s.id !== current.id)
    .map((s) => ({ spot: s, miles: distanceMiles(current, s) }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, count);
}
