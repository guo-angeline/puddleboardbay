"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import type { Spot } from "@/lib/types";
import { DIFFICULTY_COLOR } from "@/lib/types";
import "leaflet/dist/leaflet.css";

const BAY_CENTER: [number, number] = [37.8, -122.15];

function FlyTo({ spot }: { spot: Spot | null }) {
  const map = useMap();
  useEffect(() => {
    if (spot) map.flyTo([spot.lat, spot.lng], 13, { duration: 0.8 });
  }, [spot, map]);
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

      {spots.map((spot) => {
        const isSelected = selected?.id === spot.id;
        const color = DIFFICULTY_COLOR[spot.difficulty] ?? "#6B7280";
        return (
          <CircleMarker
            key={spot.id}
            center={[spot.lat, spot.lng]}
            radius={isSelected ? 10 : 7}
            pathOptions={{
              color: isSelected ? "#1B2A16" : color,
              fillColor: color,
              fillOpacity: isSelected ? 1 : 0.75,
              weight: isSelected ? 2.5 : 1.5,
            }}
            eventHandlers={{ click: () => onSelect(spot) }}
          >
            <Popup>
              <strong>{spot.water}</strong>
              <br />
              <span style={{ color: "#6B7280", fontSize: 12 }}>{spot.city}</span>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
