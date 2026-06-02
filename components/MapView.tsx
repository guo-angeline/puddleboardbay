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

function FitBounds({ spots }: { spots: Spot[] }) {
  const map = useMap();
  useEffect(() => {
    if (spots.length === 0) return;
    if (spots.length === 1) {
      map.flyTo([spots[0].lat, spots[0].lng], 13, { duration: 0.4 });
      return;
    }
    const bounds = spots.map((s) => [s.lat, s.lng] as [number, number]);
    map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 13, duration: 0.5 });
  }, [spots, map]);
  return null;
}

interface Props {
  spots: Spot[];
  selected: Spot | null;
  onSelect: (spot: Spot) => void;
}

export default function MapView({ spots, selected, onSelect }: Props) {
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
      <FitBounds spots={spots} />

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
