"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap } from "react-leaflet";
import type { Spot } from "@/lib/types";
import { DIFFICULTY_COLOR } from "@/lib/types";
import "leaflet/dist/leaflet.css";

const BAY_CENTER: [number, number] = [37.55, -122.25];

function FlyTo({ spot }: { spot: Spot | null }) {
  const map = useMap();
  useEffect(() => {
    if (spot) map.flyTo([spot.lat, spot.lng], 13, { duration: 0.4 });
  }, [spot, map]);
  return null;
}

function FitBounds({ spots, hasSelection }: { spots: Spot[]; hasSelection: boolean }) {
  const map = useMap();
  useEffect(() => {
    // Don't fight FlyTo when a spot is selected (e.g. landing on a /spot URL).
    if (hasSelection) return;
    if (spots.length === 0) return;
    if (spots.length === 1) {
      map.flyTo([spots[0].lat, spots[0].lng], 13, { duration: 0.4 });
      return;
    }
    const bounds = spots.map((s) => [s.lat, s.lng] as [number, number]);
    map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 13, duration: 0.5 });
  }, [spots, map, hasSelection]);
  return null;
}

type UserLocation = { lat: number; lng: number };

function FlyToUser({ location }: { location: UserLocation | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.flyTo([location.lat, location.lng], 11, { duration: 0.6 });
  }, [location, map]);
  return null;
}

interface Props {
  spots: Spot[];
  selected: Spot | null;
  onSelect: (spot: Spot) => void;
  userLocation?: UserLocation | null;
}

export default function MapView({ spots, selected, onSelect, userLocation }: Props) {
  return (
    <MapContainer
      center={BAY_CENTER}
      zoom={9}
      className="h-full w-full"
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />

      <FlyTo spot={selected} />
      <FitBounds spots={spots} hasSelection={!!selected} />
      <FlyToUser location={userLocation ?? null} />

      {/* User location — halo + dot */}
      {userLocation && (
        <>
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={18}
            pathOptions={{ color: "transparent", fillColor: "#1A73E8", fillOpacity: 0.18, weight: 0 }}
          />
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={7}
            pathOptions={{ color: "#fff", fillColor: "#1A73E8", fillOpacity: 1, weight: 3 }}
          />
        </>
      )}

      {spots.map((spot) => {
        const isSelected = selected?.id === spot.id;
        const color = DIFFICULTY_COLOR[spot.difficulty] ?? "#6B7280";
        return (
          <CircleMarker
            key={spot.id}
            center={[spot.lat, spot.lng]}
            radius={isSelected ? 13 : 10}
            pathOptions={{
              color: isSelected ? "#1B2A16" : color,
              fillColor: color,
              fillOpacity: isSelected ? 1 : 0.75,
              weight: isSelected ? 3 : 2,
            }}
            eventHandlers={{ click: () => onSelect(spot) }}
          />
        );
      })}
    </MapContainer>
  );
}
