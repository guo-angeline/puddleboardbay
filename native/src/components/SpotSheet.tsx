import { Image } from "expo-image";
import { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getSpotPhoto } from "@/lib/spotPhotos";
import { DIFFICULTY_LABEL, type Spot } from "@/lib/types";
import { API_BASE } from "../api/base";
import { trackIntent } from "../lib/analytics";
import { useGenuineDwell } from "../lib/useGenuineDwell";
import { colors, fonts, radius } from "../theme/tokens";
import ConditionsPanel from "./ConditionsPanel";

interface Props {
  spot: Spot;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
}

// Same values as web SpotDrawer's DIFF_STYLES.
const DIFF_STYLES: Record<string, { bg: string; text: string }> = {
  flatwater: { bg: colors.flatwaterFill, text: colors.flatwaterInk },
  bay: { bg: colors.oceanFill, text: colors.oceanInk },
  river: { bg: colors.riverFill, text: colors.riverInk },
  unknown: { bg: colors.fillAlt, text: colors.inkMuted },
};

// Mirrors the web's mobile truncation length.
const NOTES_TRUNCATE = 220;

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

/**
 * Full-screen spot detail, the native twin of the web's full-screen mobile
 * sheet (item 57/63/64): app bar with back arrow + wordmark, then title,
 * badges, tags, photo, notes, conditions, and the CTA stack.
 */
export default function SpotSheet({ spot, onClose, isFavorite, onToggleFavorite }: Props) {
  const insets = useSafeAreaInsets();
  const [notesExpanded, setNotesExpanded] = useState(false);

  const showOwnerRating = typeof spot.owner_rating === "number";
  const diff = DIFF_STYLES[spot.difficulty] ?? DIFF_STYLES.unknown;
  const photo = getSpotPhoto(spot.id);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`;
  const photosUrl = `https://www.google.com/maps/search/${encodeURIComponent(
    `${spot.water} ${spot.city ?? ""} California`
  )}/`;

  useGenuineDwell({
    key: spot.id,
    enabled: !!photo,
    onView: () => {
      if (photo) {
        trackIntent("spot_photo_viewed", {
          spot_id: spot.id,
          region: spot.region,
          license: photo.license ?? "owner",
        });
      }
    },
  });

  const tags: string[] = [];
  if (spot.dog_friendly) tags.push("Dog friendly");
  if (spot.tide_sensitive) tags.push("Tide sensitive");
  if (spot.rentals_available) tags.push("Rentals available");
  if (spot.inspection_required) tags.push("Inspection required");
  if (spot.power_boats === true) tags.push("Power boats OK");
  if (spot.power_boats === false) tags.push("No power boats");

  const spotEventProps = {
    spot_id: spot.id,
    spot_name: spot.water,
    region: spot.region,
    has_fee: spot.has_fee,
    owner_rating: spot.owner_rating ?? null,
    owner_rating_shown: showOwnerRating,
  };

  function dismiss(method: "close" | "back") {
    trackIntent("spot_sheet_dismissed", {
      spot_id: spot.id,
      spot_name: spot.water,
      region: spot.region,
      method,
    });
    onClose();
  }

  async function handleShare() {
    trackIntent("spot_action", { ...spotEventProps, action: "share" });
    try {
      await Share.share({ url: `${API_BASE}/spot/${spot.id}?from=share`, title: spot.water });
    } catch {
      /* user cancelled */
    }
  }

  const notes = spot.notes ?? "";
  const notesTruncated = notes.length > NOTES_TRUNCATE;

  return (
    <View style={[styles.overlay, { paddingTop: insets.top }]}>
      {/* App bar: back arrow + wordmark (the spot name is the h1 below) */}
      <View style={styles.appBar}>
        <Pressable
          onPress={() => dismiss("back")}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to the map"
        >
          <Text style={styles.backArrow}>←</Text>
        </Pressable>
        <Text style={styles.appBarWordmark}>Paddle to Water</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 20, paddingBottom: Math.max(20, insets.bottom + 12) }}
      >
        {/* Header */}
        <Text style={styles.title}>{spot.water}</Text>
        <Text style={styles.subtitle}>
          {showOwnerRating && (
            <Text style={styles.rating}>
              <Text style={{ color: colors.accent }}>★</Text>
              {` ${spot.owner_rating!.toFixed(1)} · `}
            </Text>
          )}
          {spot.city} · {spot.region}
        </Text>

        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: diff.bg }]}>
            <Text style={[styles.badgeText, { color: diff.text }]}>
              {DIFFICULTY_LABEL[spot.difficulty]}
            </Text>
          </View>
          {spot.has_fee === true && !!spot.fee_amount && (
            <View style={[styles.badge, { backgroundColor: "#FFF7ED" }]}>
              <Text style={[styles.badgeText, { color: "#C2410C" }]}>
                ${spot.fee_amount} launch fee
              </Text>
            </View>
          )}
          {spot.has_fee === false && (
            <View style={[styles.badge, { backgroundColor: "#F0FDF4" }]}>
              <Text style={[styles.badgeText, { color: "#15803D" }]}>Free</Text>
            </View>
          )}
          {spot.has_fee === null && (
            <View style={[styles.badge, { backgroundColor: "#F3F4F6" }]}>
              <Text style={[styles.badgeText, { color: "#6B7280" }]}>Fee unknown</Text>
            </View>
          )}
        </View>

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagRow}>
            {tags.map((t) => (
              <Tag key={t} label={t} />
            ))}
          </View>
        )}

        {/* Photo, remote from the production site, disk-cached. Attribution is
            legally required for CC photos (author present); owner photos render
            no credit. */}
        {photo && (
          <View style={styles.photoWrap}>
            <Image
              source={{ uri: `${API_BASE}${photo.file}` }}
              style={styles.photo}
              contentFit="cover"
              cachePolicy="disk"
              transition={150}
              accessibilityLabel={`${spot.water}, ${spot.city ?? spot.region}`}
            />
            {photo.author && (
              <Pressable
                style={styles.photoCredit}
                onPress={() => photo.source_page && Linking.openURL(photo.source_page)}
              >
                <Text style={styles.photoCreditText} numberOfLines={1}>
                  {photo.author} / {photo.license}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Notes */}
        {!!notes && (
          <View style={styles.notesBlock}>
            <Text style={styles.notesText}>
              {notesExpanded || !notesTruncated
                ? notes
                : `${notes.slice(0, NOTES_TRUNCATE).trimEnd()}…`}
            </Text>
            {notesTruncated && (
              <Pressable onPress={() => setNotesExpanded((v) => !v)} hitSlop={6}>
                <Text style={styles.readMore}>{notesExpanded ? "Read less" : "Read more"}</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Live conditions */}
        <ConditionsPanel spot={spot} />

        {/* CTA stack: Watch (retention) first, Share second, neutral row last. */}
        <View style={{ gap: 8 }}>
          <Pressable
            onPress={() => onToggleFavorite(spot.id)}
            style={[styles.watchButton, isFavorite ? styles.watchButtonActive : null]}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? "Stop watching this spot" : "Watch this spot"}
          >
            <Text style={[styles.watchButtonText, isFavorite && { color: colors.saved }]}>
              {isFavorite ? "♥ Watching" : "♡ Watch this spot"}
            </Text>
          </Pressable>
          <Pressable onPress={handleShare} style={styles.shareButton} accessibilityRole="button">
            <Text style={styles.shareButtonText}>Share</Text>
          </Pressable>
          <View style={styles.neutralRow}>
            <Pressable
              onPress={() => {
                trackIntent("spot_action", { ...spotEventProps, action: "directions" });
                void Linking.openURL(mapsUrl);
              }}
              style={styles.neutralButton}
              accessibilityRole="button"
            >
              <Text style={styles.neutralButtonText}>Get directions</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                trackIntent("spot_action", { ...spotEventProps, action: "photos" });
                void Linking.openURL(photosUrl);
              }}
              style={styles.neutralButton}
              accessibilityRole="button"
            >
              <Text style={styles.neutralButtonText}>Photos</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: colors.white,
    zIndex: 10,
  },
  appBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 8,
    paddingRight: 16,
    paddingBottom: 10,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fill,
  },
  backArrow: {
    fontSize: 20,
    color: colors.dark,
  },
  appBarWordmark: {
    fontFamily: fonts.displaySemibold,
    fontSize: 16,
    color: colors.dark,
  },
  scroll: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.displaySemibold,
    fontSize: 22,
    lineHeight: 27,
    color: colors.dark,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 12,
  },
  rating: {
    fontFamily: fonts.bodySemibold,
    color: colors.dark,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: "#F3F4F6",
  },
  tagText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: "#4B5563",
  },
  photoWrap: {
    marginBottom: 12,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  photo: {
    width: "100%",
    height: 160,
  },
  photoCredit: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  photoCreditText: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.9)",
  },
  notesBlock: {
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#E5E7EB",
  },
  notesText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: "#4B5563",
  },
  readMore: {
    marginTop: 4,
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.accent,
  },
  watchButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: radius.xl,
    alignItems: "center",
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: "transparent",
  },
  watchButtonActive: {
    backgroundColor: "#FDECEF",
    borderColor: "#F5C6CE",
  },
  watchButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.white,
  },
  shareButton: {
    width: "100%",
    paddingVertical: 10,
    borderRadius: radius.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.white,
  },
  shareButtonText: {
    fontFamily: fonts.bodySemibold,
    fontSize: 14,
    color: colors.accent,
  },
  neutralRow: {
    flexDirection: "row",
    gap: 8,
  },
  neutralButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  neutralButtonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.dark,
  },
});
