import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker, UrlTile, type Camera } from "react-native-maps";

import type { Spot } from "@/lib/types";
import { DIFFICULTY_COLOR } from "@/lib/types";
import { colors, fonts } from "../theme/tokens";

const BAY_CENTER = { latitude: 37.55, longitude: -122.25 };
// Frames the Bay similar to the web map's zoom 9.
const BAY_DELTA = { latitudeDelta: 1.45, longitudeDelta: 1.1 };
// Apple Maps cameras use altitude, not zoom. ~40km reads like web zoom ~11:
// close enough to see context around a spot without losing the shoreline.
const SPOT_ALTITUDE = 40000;

type UserLocation = { lat: number; lng: number };

interface Props {
  spots: Spot[];
  selected: Spot | null;
  onSelect: (spot: Spot, source?: string) => void;
  userLocation?: UserLocation | null;
  fitToSpots?: boolean;
}

export default function MapPane({ spots, selected, onSelect, userLocation, fitToSpots = false }: Props) {
  const mapRef = useRef<MapView>(null);

  // FlyTo equivalent: pan to the selected spot but never zoom OUT a user who is
  // already closer (mirror of the web's "floor of zoom 11, keep their zoom").
  // With Apple Maps that means: keep the current altitude if it's already lower.
  useEffect(() => {
    if (!selected || !mapRef.current) return;
    const map = mapRef.current;
    let cancelled = false;
    map
      .getCamera()
      .then((cam: Camera) => {
        if (cancelled) return;
        const altitude = Math.min(cam.altitude ?? SPOT_ALTITUDE, SPOT_ALTITUDE);
        map.animateCamera(
          { center: { latitude: selected.lat, longitude: selected.lng }, altitude },
          { duration: 400 }
        );
      })
      .catch(() => {
        map.animateCamera(
          { center: { latitude: selected.lat, longitude: selected.lng }, altitude: SPOT_ALTITUDE },
          { duration: 400 }
        );
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  // FitBounds equivalent: only when the user narrowed the set (filters/search)
  // and nothing is selected; on the full set the default Bay view stays (fitting
  // all spots spans Tahoe to the Central Coast).
  const spotsKey = spots.map((s) => s.id).join(",");
  useEffect(() => {
    if (!fitToSpots || selected || !mapRef.current || spots.length === 0) return;
    if (spots.length === 1) {
      mapRef.current.animateCamera(
        { center: { latitude: spots[0].lat, longitude: spots[0].lng }, altitude: 12000 },
        { duration: 400 }
      );
      return;
    }
    mapRef.current.fitToCoordinates(
      spots.map((s) => ({ latitude: s.lat, longitude: s.lng })),
      { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotsKey, fitToSpots, selected]);

  // FlyToUser: Near me centers on the user at roughly the same framing.
  useEffect(() => {
    if (!userLocation || !mapRef.current) return;
    mapRef.current.animateCamera(
      { center: { latitude: userLocation.lat, longitude: userLocation.lng }, altitude: 80000 },
      { duration: 600 }
    );
  }, [userLocation]);

  const markers = useMemo(
    () =>
      spots.map((spot) => {
        const isSelected = selected?.id === spot.id;
        const color = DIFFICULTY_COLOR[spot.difficulty] ?? colors.inkMuted;
        return (
          // Key includes selection so the marker remounts on select/deselect:
          // tracksViewChanges={false} snapshots the view once, so a style-only
          // change would never repaint without the remount.
          <Marker
            key={`${spot.id}-${isSelected ? "sel" : "idle"}`}
            coordinate={{ latitude: spot.lat, longitude: spot.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            onPress={() => onSelect(spot, "map")}
          >
            <View
              style={[
                styles.pin,
                isSelected ? styles.pinSelected : null,
                {
                  backgroundColor: isSelected ? color : `${color}C0`,
                  borderColor: isSelected ? colors.dark : color,
                },
              ]}
            />
          </Marker>
        );
      }),
    [spots, selected, onSelect]
  );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...BAY_CENTER, ...BAY_DELTA }}
        showsPointsOfInterests={false}
        showsCompass={false}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {/* The exact CARTO light tiles the web map uses; shouldReplaceMapContent
            suppresses the Apple base map so this IS the map's whole look. */}
        <UrlTile
          urlTemplate="https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"
          maximumZ={19}
          shouldReplaceMapContent
          zIndex={-1}
        />
        {userLocation && (
          <>
            <Marker
              coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={styles.userHalo} />
            </Marker>
            <Marker
              coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View style={styles.userDot} />
            </Marker>
          </>
        )}
        {markers}
      </MapView>

      {/* CARTO's free tier and the OSM license both require visible attribution;
          Leaflet rendered this for the web map, here we own it. */}
      <View style={styles.attribution} pointerEvents="none">
        <Text style={styles.attributionText}>© OpenStreetMap contributors © CARTO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  pinSelected: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
  },
  userHalo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(14, 111, 209, 0.18)",
  },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.white,
  },
  attribution: {
    position: "absolute",
    bottom: 4,
    right: 6,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  attributionText: {
    fontFamily: fonts.body,
    fontSize: 9,
    color: colors.ink2,
  },
});
